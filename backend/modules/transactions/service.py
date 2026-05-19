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

async def get_transaction_summary(db: AsyncSession, user_id: uuid.UUID):
    # FRS requires total income, total expenses, and net flow[cite: 4]
    query = select(
        Transaction.type,
        func.sum(Transaction.amount).label("total")
    ).where(
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None)
    ).group_by(Transaction.type)
    
    result = await db.execute(query)
    totals = {row.type: float(row.total) for row in result.all()}
    
    income = totals.get("credit", 0.0)
    expenses = abs(totals.get("debit", 0.0))
    
    return {
        "total_income": income,
        "total_expenses": expenses,
        "net_flow": income - expenses
    }


async def create_transaction(db: AsyncSession, tx_data: TransactionCreate, user_id: uuid.UUID):
    # 1. Start with the default assumption (No shift)
    is_shifted = False
    effective_date = tx_data.date

    # 2. THE AXIS FINANCE ROLLOVER RULE
    # If it's income, and it's on or after the 20th, and the user didn't override it:
    if tx_data.type == "credit" and tx_data.date.day >= 20 and not tx_data.shift_override:
        is_shifted = True
        
        # Calculate the 1st of the next month safely
        if tx_data.date.month == 12:
            next_month = 1
            next_year = tx_data.date.year + 1
        else:
            next_month = tx_data.date.month + 1
            next_year = tx_data.date.year
            
        effective_date = dt_date(next_year, next_month, 1)

    # 3. Translate Pydantic (tx_data) into SQLAlchemy (new_tx)
    new_tx = Transaction(
        user_id=user_id,
        date=tx_data.date,
        effective_date=effective_date,
        amount=tx_data.amount,
        category=tx_data.category,
        description=tx_data.description,
        type=tx_data.type,
        is_shifted=is_shifted,
        shift_override=tx_data.shift_override
    )

    # 4. Save to the Database
    db.add(new_tx)        # "Hey DB, queue this up"
    await db.commit()     # "Actually save it now"
    await db.refresh(new_tx)  # "Give me the fresh data back (like the auto-generated ID)"

    return new_tx


async def update_transaction(db: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID, update_data: TransactionUpdate):
    # 1. Find the transaction
    query = select(Transaction).where(
        Transaction.id == tx_id, 
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None)
    )
    result = await db.execute(query)
    tx = result.scalar_one_or_none()
    
    if not tx:
        return None # Not found
        
    # 2. Apply only the fields the user actually sent
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(tx, key, value)
        
    # --- 3. THE ROLLOVER RECALCULATION ---
    # If the user updated the date, we must recalculate the Axis Finance Rollover logic!
    if "date" in update_dict or "type" in update_dict or "shift_override" in update_dict:
        if tx.type == "credit" and tx.date.day >= 20 and not tx.shift_override:
            tx.is_shifted = True
            if tx.date.month == 12:
                tx.effective_date = dt_date(tx.date.year + 1, 1, 1)
            else:
                tx.effective_date = dt_date(tx.date.year, tx.date.month + 1, 1)
        else:
            tx.is_shifted = False
            tx.effective_date = tx.date
            
    # 4. Save and return
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