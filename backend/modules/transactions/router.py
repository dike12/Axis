import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

# Import our database connection dependency
from core.database import get_db

# Import our Schema (Bouncer) and Service (Bartender)
from modules.transactions.schemas import TransactionCreate, TransactionUpdate, TransactionResponse
from modules.transactions.service import create_transaction, get_user_transactions, update_transaction, delete_transaction

# 1. Initialize the router
router = APIRouter(prefix="/transactions", tags=["Transactions"])

# 2. Create the endpoint
@router.post("/")
async def add_transaction(tx_data: TransactionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new transaction. 
    FastAPI automatically uses Pydantic to validate 'tx_data' before this code even runs.
    """
    
    # HACK: Since we haven't built Google OAuth yet, we will fake a user_id
    # We use a valid UUID string so PostgreSQL doesn't crash
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    # Pass the DB session, the validated data, and the fake user to the Service Layer
    new_tx = await create_transaction(db, tx_data, fake_user_id)
    
    # Your FRS requires a consistent envelope response: { data, error, meta }
    return {
        "data": TransactionResponse.model_validate(new_tx),
        "error": None,
        "meta": {"message": "Transaction created successfully"}
    }


@router.get("/")
async def list_transactions(db: AsyncSession = Depends(get_db)):
    """Fetch all transactions for the current user."""
    
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    # 1. Get raw SQLAlchemy objects from the database
    db_transactions = await get_user_transactions(db, fake_user_id)
    
    # 2. Pass them through the Pydantic Bouncer to serialize Decimals & Dates safely!
    validated_data = [TransactionResponse.model_validate(tx) for tx in db_transactions]
    
    return {
        "data": validated_data,
        "error": None,
        "meta": {"count": len(validated_data)}
    }


@router.put("/{tx_id}")
async def edit_transaction(tx_id: uuid.UUID, update_data: TransactionUpdate, db: AsyncSession = Depends(get_db)):
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    updated_tx = await update_transaction(db, tx_id, fake_user_id, update_data)
    if not updated_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {"data": TransactionResponse.model_validate(updated_tx), "error": None}

@router.delete("/{tx_id}")
async def remove_transaction(tx_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    success = await delete_transaction(db, tx_id, fake_user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {"data": None, "error": None, "meta": {"message": "Deleted successfully"}}