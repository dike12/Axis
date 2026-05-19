import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from core.database import get_db 
from modules.budget import schemas, service

router = APIRouter(prefix="/budget", tags=["Budget"])

# ─── CATEGORY ENDPOINTS ───

@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)) -> Any:
    """List all budget categories (income, expense, savings)."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    categories = await service.get_categories(db, fake_user_id)
    
    # FIX: Validate the list of raw SQLAlchemy models into JSON-safe Pydantic dictionaries
    validated_data = [schemas.BudgetCategoryResponse.model_validate(c) for c in categories]
    return {"data": validated_data, "error": None, "meta": None}


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: schemas.BudgetCategoryCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Create new budget category."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    category = await service.create_category(db, fake_user_id, payload)
    
    # FIX: Validate the raw SQLAlchemy model into a JSON-safe Pydantic dictionary
    return {
        "data": schemas.BudgetCategoryResponse.model_validate(category), 
        "error": None, 
        "meta": None
    }


@router.put("/categories/{category_id}")
async def update_category(
    category_id: uuid.UUID,
    payload: schemas.BudgetCategoryUpdate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update category name, icon, is_fixed, sort_order."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    category = await service.update_category(db, fake_user_id, category_id, payload)
    
    # FIX: Validate the raw SQLAlchemy model into a JSON-safe Pydantic dictionary
    return {
        "data": schemas.BudgetCategoryResponse.model_validate(category), 
        "error": None, 
        "meta": None
    }


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete category (only if no associated values)."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    await service.delete_category(db, fake_user_id, category_id)
    return {"data": {"success": True}, "error": None, "meta": None}


# ─── BUDGET VALUES & GRID ENDPOINTS ───

@router.get("/values")
async def get_budget_grid(
    year: int = Query(..., description="The 4-digit year to fetch the budget for"),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get full budget grid for a year. Returns planned + actual per category per month."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    grid_data = await service.get_budget_grid(db, fake_user_id, year)
    return {"data": grid_data, "error": None, "meta": None}


@router.put("/values")
async def bulk_upsert_budget_values(
    payload: schemas.BudgetBulkUpsert,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Bulk upsert planned amounts."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    await service.bulk_upsert_values(db, fake_user_id, payload)
    return {"data": {"success": True}, "error": None, "meta": None}


# ─── PERFORMANCE ENDPOINT ───

@router.get("/performance")
async def get_performance_summary(
    year: int = Query(..., description="The 4-digit year to fetch performance for"),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Return Performance Summary: planned vs actual totals for income, expenses, savings for a year."""
    fake_user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    performance_data = await service.get_budget_performance(db, fake_user_id, year)
    return {"data": performance_data, "error": None, "meta": None}