import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as dt_date

# Import our database connection dependency
from core.database import get_db

# Import our Schema (Bouncer) and Service (Bartender)
from modules.transactions.schemas import TransactionCreate, TransactionUpdate, TransactionResponse
from modules.transactions.service import (
    create_transaction, 
    get_user_transactions, 
    update_transaction, 
    delete_transaction,
    get_transaction,
    get_transaction_summary
)

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
async def list_transactions(
    page: int = Query(0, ge=0),
    page_size: int = Query(15, gt=0, le=100),
    category: str | None = Query("all"),
    type: str | None = Query("all"),
    search: str | None = Query(None),
    date_from: dt_date | None = Query(None),  
    date_to: dt_date | None = Query(None),    
    db: AsyncSession = Depends(get_db)
):
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    db_txs, total_count = await get_user_transactions(
        db, fake_user_id, page, page_size, category, type, search, date_from, date_to
    )
    
    validated_data = [TransactionResponse.model_validate(tx) for tx in db_txs]
    
    return {
        "data": validated_data,
        "error": None,
        "meta": {
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    }

@router.get("/summary")
async def transaction_summary(db: AsyncSession = Depends(get_db)):
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    summary_data = await get_transaction_summary(db, fake_user_id)
    return {"data": summary_data, "error": None}

@router.get("/{tx_id}")
async def fetch_transaction(tx_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    tx = await get_transaction(db, tx_id, fake_user_id)
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {"data": TransactionResponse.model_validate(tx), "error": None}

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