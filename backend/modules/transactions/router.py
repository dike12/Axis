import uuid
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date as dt_date

from core.database import get_db
from core.auth import get_current_user_id  # <-- The new Auth bouncer!

from modules.transactions.schemas import TransactionCreate, TransactionUpdate, TransactionResponse
from modules.transactions.service import (
    create_transaction, get_user_transactions, update_transaction, 
    delete_transaction, get_transaction, get_transaction_summary
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])

def not_found(message: str = "Transaction not found") -> JSONResponse:
    return JSONResponse(status_code=404, content={"data": None, "error": {"code": "NOT_FOUND", "message": message}})

@router.post("/", status_code=201)
async def add_transaction(tx_data: TransactionCreate, db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    new_tx = await create_transaction(db, tx_data, user_id)
    return {"data": TransactionResponse.model_validate(new_tx), "error": None, "meta": {"message": "Transaction created successfully"}}

@router.get("/")
async def list_transactions(
    page: int = Query(0, ge=0), page_size: int = Query(15, gt=0, le=100),
    category: str | None = Query("all"), type: str | None = Query("all"),
    search: str | None = Query(None), date_from: dt_date | None = Query(None),  
    date_to: dt_date | None = Query(None),    
    db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)
):
    db_txs, total_count = await get_user_transactions(db, user_id, page, page_size, category, type, search, date_from, date_to)
    validated_data = [TransactionResponse.model_validate(tx) for tx in db_txs]
    return {
        "data": validated_data, "error": None, 
        "meta": {"total_count": total_count, "page": page, "page_size": page_size, "total_pages": (total_count + page_size - 1) // page_size}
    }

@router.get("/summary")
async def get_summary(year: int, month: int, db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    summary = await get_transaction_summary(db, user_id, year, month)
    return {"data": summary, "error": None}

@router.get("/{tx_id}")
async def fetch_transaction(tx_id: uuid.UUID, db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    tx = await get_transaction(db, tx_id, user_id)
    if not tx: return not_found()
    return {"data": TransactionResponse.model_validate(tx), "error": None}

@router.put("/{tx_id}")
async def edit_transaction(tx_id: uuid.UUID, update_data: TransactionUpdate, db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    updated_tx = await update_transaction(db, tx_id, user_id, update_data)
    if not updated_tx: return not_found()
    return {"data": TransactionResponse.model_validate(updated_tx), "error": None}

@router.delete("/{tx_id}")
async def remove_transaction(tx_id: uuid.UUID, db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    success = await delete_transaction(db, tx_id, user_id)
    if not success: return not_found()
    return {"data": None, "error": None, "meta": {"message": "Deleted successfully"}}