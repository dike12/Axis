import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from core.database import get_db 
from core.auth import get_current_user_id  # <-- The secure Auth bouncer!
from modules.budget import schemas, service

router = APIRouter(prefix="/budget", tags=["Budget"])

# ─── CATEGORY ENDPOINTS ───

@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """List all budget categories (income, expense, savings)."""
    categories = await service.get_categories(db, user_id)
    
    # Validate and serialize into standard dictionaries
    validated_data = [schemas.BudgetCategoryResponse.model_validate(c).model_dump() for c in categories]
    return {"data": validated_data, "error": None, "meta": None}


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: schemas.BudgetCategoryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """Create new budget category."""
    category = await service.create_category(db, user_id, payload)
    
    return {
        "data": schemas.BudgetCategoryResponse.model_validate(category).model_dump(), 
        "error": None, 
        "meta": {"message": "Category created successfully"}
    }


@router.put("/categories/{category_id}")
async def update_category(
    category_id: uuid.UUID,
    payload: schemas.BudgetCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """Update category name, icon, is_fixed, sort_order."""
    category = await service.update_category(db, user_id, category_id, payload)
    
    return {
        "data": schemas.BudgetCategoryResponse.model_validate(category).model_dump(), 
        "error": None, 
        "meta": {"message": "Category updated successfully"}
    }


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """Delete category (only if no associated values)."""
    await service.delete_category(db, user_id, category_id)
    return {"data": {"success": True}, "error": None, "meta": {"message": "Category deleted successfully"}}


# ─── BUDGET VALUES & GRID ENDPOINTS ───

@router.get("/values")
async def get_budget_grid(
    year: int = Query(..., description="The 4-digit year to fetch the budget for"),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """Get full budget grid for a year. Returns planned + actual per category per month."""
    grid_data = await service.get_budget_grid(db, user_id, year)
    return {"data": grid_data.model_dump(), "error": None, "meta": None}


@router.put("/values")
async def bulk_upsert_budget_values(
    payload: schemas.BudgetBulkUpsert,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """Bulk upsert planned amounts."""
    await service.bulk_upsert_values(db, user_id, payload)
    return {"data": {"success": True}, "error": None, "meta": {"message": "Budget updated successfully"}}


# ─── PERFORMANCE ENDPOINT ───

@router.get("/performance")
async def get_performance_summary(
    year: int = Query(..., description="The 4-digit year to fetch performance for"),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
) -> Any:
    """Return Performance Summary: planned vs actual totals for income, expenses, savings for a year."""
    performance_data = await service.get_budget_performance(db, user_id, year)
    return {"data": performance_data.model_dump(), "error": None, "meta": None}