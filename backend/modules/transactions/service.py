import uuid
from datetime import date as dt_date, datetime as dt_datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, select

# Import our DB Model and our Pydantic Schema
from modules.transactions.models import Transaction
from modules.transactions.schemas import TransactionCreate, TransactionResponse, TransactionUpdate


async def get_user_transactions(
    db: AsyncSession, 
    user_id: uuid.UUID,
    page: int = 0,
    page_size: int = 15,
    category: str | None = None,
    tx_type: str | None = None,
    search: str | None = None,
    date_from: dt_date | None = None, 
    date_to: dt_date | None = None
):
    # 1. Base query (only active rows)
    query = select(Transaction).where(
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None)
    )
    
    # Apply Date Range Filters
    if date_from:
        query = query.where(Transaction.date >= date_from)
    if date_to:
        query = query.where(Transaction.date <= date_to)

    # 2. Apply Filters dynamically
    if category and category.lower() != "all":
        query = query.where(func.lower(Transaction.category) == category.lower())
    
    if tx_type and tx_type.lower() != "all":
        query = query.where(Transaction.type == tx_type.lower())
        
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Transaction.description.ilike(search_term),
                Transaction.category.ilike(search_term)
            )
        )
        
    # 3. Get total count for frontend pagination math
    count_query = select(func.count()).select_from(query.subquery())
    total_count = await db.scalar(count_query) or 0
    
    # 4. Apply pagination and ordering
    query = query.order_by(Transaction.date.desc()).offset(page * page_size).limit(page_size)
    result = await db.execute(query)
    
    return result.scalars().all(), total_count

async def get_transaction(db: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID):
    query = select(Transaction).where(
        Transaction.id == tx_id,
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def get_transaction_summary(db: AsyncSession, user_id: uuid.UUID, year: int, month: int):
    from sqlalchemy import extract, and_
    # Filter by effective_date so the rollover rule actually changes your dashboard math!
    query = select(Transaction.type, func.sum(Transaction.amount).label("total")).where(
        and_(
            Transaction.user_id == user_id,
            Transaction.deleted_at.is_(None),
            extract('year', Transaction.effective_date) == year,
            extract('month', Transaction.effective_date) == month
        )
    ).group_by(Transaction.type)
    
    result = await db.execute(query)
    totals = {row.type: float(row.total) for row in result.all()}
    income = totals.get("credit", 0.0)
    expenses = abs(totals.get("debit", 0.0))
    return {"total_income": income, "total_expenses": expenses, "net_flow": income - expenses}


async def create_transaction(db: AsyncSession, tx_data: TransactionCreate, user_id: uuid.UUID):
    # Fetch live settings to override the defaults
    from modules.settings import service as settings_service
    settings = await settings_service.get_user_settings(db, user_id)
    
    is_shifted = False
    effective_date = tx_data.date

    # Use dynamic settings instead of hardcoded 20!
    if settings.shift_late_income and tx_data.type == "credit" and tx_data.date.day >= settings.income_cutoff_day and not tx_data.shift_override:
        is_shifted = True
        if tx_data.date.month == 12:
            effective_date = dt_date(tx_data.date.year + 1, 1, 1)
        else:
            effective_date = dt_date(tx_data.date.year, tx_data.date.month + 1, 1)

    new_tx = Transaction(
        user_id=user_id, date=tx_data.date, effective_date=effective_date,
        amount=tx_data.amount, category=tx_data.category, description=tx_data.description,
        type=tx_data.type, is_shifted=is_shifted, shift_override=tx_data.shift_override
    )
    db.add(new_tx)
    await db.commit()
    await db.refresh(new_tx)
    return new_tx


async def update_transaction(db: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID, update_data: TransactionUpdate):
    from modules.settings import service as settings_service
    settings = await settings_service.get_user_settings(db, user_id)
    
    query = select(Transaction).where(
        Transaction.id == tx_id, Transaction.user_id == user_id, Transaction.deleted_at.is_(None)
    )
    result = await db.execute(query)
    tx = result.scalar_one_or_none()
    if not tx: return None
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(tx, key, value)
        
    # Recalculate with dynamic settings!
    if "date" in update_dict or "type" in update_dict or "shift_override" in update_dict:
        if settings.shift_late_income and tx.type == "credit" and tx.date.day >= settings.income_cutoff_day and not tx.shift_override:
            tx.is_shifted = True
            if tx.date.month == 12:
                tx.effective_date = dt_date(tx.date.year + 1, 1, 1)
            else:
                tx.effective_date = dt_date(tx.date.year, tx.date.month + 1, 1)
        else:
            tx.is_shifted = False
            tx.effective_date = tx.date
            
    await db.commit()
    await db.refresh(tx)
    return tx

async def delete_transaction(db: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID):
    query = select(Transaction).where(
        Transaction.id == tx_id, 
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None)
    )
    result = await db.execute(query)
    tx = result.scalar_one_or_none()
    
    if not tx:
        return False
        
    tx.deleted_at = dt_datetime.now(timezone.utc)
    await db.commit()
    return True


async def get_category_actuals_for_year(
    db: AsyncSession,
    user_id: uuid.UUID,
    year: int
) -> dict:
    """
    Computes per-category monthly actuals from transactions.
    Called by the budget module — exported as the cross-module interface.
    Returns: { "Category Name": { 1: 150.0, 2: 200.0, ... } }
    """
    from sqlalchemy import extract, func, and_

    result = await db.execute(
        select(
            Transaction.category,
            extract('month', Transaction.effective_date).label('month'),
            Transaction.type,
            func.sum(Transaction.amount).label('total_amount')
        )
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None),
                extract('year', Transaction.effective_date) == year
            )
        )
        .group_by(
            Transaction.category,
            extract('month', Transaction.effective_date),
            Transaction.type
        )
    )

    rows = result.all()
    actuals: dict = {}

    for row in rows:
        cat_name = row.category
        month = int(row.month)
        total = float(row.total_amount)

        if cat_name not in actuals:
            actuals[cat_name] = {m: 0.0 for m in range(1, 13)}

        if row.type == 'debit':
            actuals[cat_name][month] += abs(total)
        elif row.type == 'credit':
            actuals[cat_name][month] += total

    return actuals


async def apply_mass_rollover_recalculation(db: AsyncSession, user_id: uuid.UUID, shift_enabled: bool, cutoff_day: int):
    """
    Triggered by the Settings module when budget logic changes.
    Applies the Axis Finance Rollover Rule to historical transactions.
    """
    from sqlalchemy import update
    
    # SCENARIO A: The user turned the feature completely OFF [cite: 66]
    if not shift_enabled:
        await db.execute(
            update(Transaction)
            .where(Transaction.user_id == user_id)
            .values(effective_date=Transaction.date, is_shifted=False)
        )
        return # We are done, no need to do complex date math.

    # SCENARIO B: The feature is ON, and the cutoff day was updated.
    # We must recalculate all credit transactions that haven't been manually overridden.
    query = select(Transaction).where(
        Transaction.user_id == user_id,
        Transaction.type == "credit",
        Transaction.shift_override == False,
        Transaction.deleted_at.is_(None)
    )
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    for tx in transactions:
        if tx.date.day >= cutoff_day:
            tx.is_shifted = True
            # Roll over to the 1st of the next month
            if tx.date.month == 12:
                tx.effective_date = dt_date(tx.date.year + 1, 1, 1)
            else:
                tx.effective_date = dt_date(tx.date.year, tx.date.month + 1, 1)
        else:
            # Revert to normal if it falls before the new cutoff
            tx.is_shifted = False
            tx.effective_date = tx.date
            
    # Note: We do not call db.commit() here! 
    # We let the settings service commit the entire transaction (settings + transactions) together.