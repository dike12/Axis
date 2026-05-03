import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Import our DB Model and our Pydantic Schema
from modules.transactions.models import Transaction
from modules.transactions.schemas import TransactionCreate, TransactionResponse, TransactionUpdate

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
            
        effective_date = date(next_year, next_month, 1)

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


async def get_user_transactions(db: AsyncSession, user_id: uuid.UUID):
    # Build the SQL query: SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC
    query = select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.date.desc())
    
    # Execute the query
    result = await db.execute(query)
    
    # Extract the rows and return them as a list
    return result.scalars().all()

async def update_transaction(db: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID, update_data: TransactionUpdate):
    # 1. Find the transaction
    query = select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == user_id)
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
                tx.effective_date = date(tx.date.year + 1, 1, 1)
            else:
                tx.effective_date = date(tx.date.year, tx.date.month + 1, 1)
        else:
            tx.is_shifted = False
            tx.effective_date = tx.date
            
    # 4. Save and return
    await db.commit()
    await db.refresh(tx)
    return tx

async def delete_transaction(db: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID):
    query = select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == user_id)
    result = await db.execute(query)
    tx = result.scalar_one_or_none()
    
    if not tx:
        return False
        
    await db.delete(tx)
    await db.commit()
    return True