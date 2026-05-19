import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert

from modules.budget.models import BudgetCategory, BudgetValue
# Assuming Transaction model is in the transactions module per architecture rules
from modules.transactions import service as transactions_service
from modules.budget.schemas import (
    BudgetCategoryCreate, 
    BudgetCategoryUpdate,
    BudgetBulkUpsert,
    BudgetGridResponse,
    CategoryGridRow,
    BudgetPerformanceResponse,
    PerformanceMetrics
)

# Simple in-memory cache for the actuals (TTL 60 seconds)
from cachetools import TTLCache
actuals_cache = TTLCache(maxsize=1000, ttl=5)

# ─── CATEGORY MANAGEMENT ───

async def get_categories(db: AsyncSession, user_id: uuid.UUID) -> List[BudgetCategory]:
    result = await db.execute(
        select(BudgetCategory)
        .where(BudgetCategory.user_id == user_id)
        .order_by(BudgetCategory.sort_order)
    )
    return result.scalars().all()

async def create_category(db: AsyncSession, user_id: uuid.UUID, category_in: BudgetCategoryCreate) -> BudgetCategory:
    new_category = BudgetCategory(**category_in.model_dump(), user_id=user_id)
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category

async def update_category(db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID, category_in: BudgetCategoryUpdate) -> BudgetCategory:
    category = await db.get(BudgetCategory, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
        
    await db.commit()
    await db.refresh(category)
    return category

async def delete_category(db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID):
    category = await db.get(BudgetCategory, category_id)
    if not category or category.user_id != user_id:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await db.execute(delete(BudgetValue).where(BudgetValue.category_id == category_id))
        
    await db.delete(category)
    await db.commit()


# ─── BUDGET VALUES & ACTUALS ───

async def bulk_upsert_values(db: AsyncSession, user_id: uuid.UUID, payload: BudgetBulkUpsert):
    """Upserts planned amounts. Does not touch actual_amount."""
    if not payload.values:
        return
    now = datetime.now(timezone.utc)
    rows = [
        {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "category_id": item.category_id,
            "year": item.year,
            "month": item.month,
            "planned_amount": item.planned_amount,
            "created_at": now,
            "updated_at": now,   
        }
        for item in payload.values
    ]
    stmt = pg_insert(BudgetValue).values(rows)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_budget_value_per_month",
        set_={"planned_amount": stmt.excluded.planned_amount, "updated_at": now}
    )
    await db.execute(stmt)
    await db.commit()

async def get_computed_actuals(db: AsyncSession, user_id: uuid.UUID, year: int) -> Dict[str, Dict[int, float]]:
    cache_key = f"{user_id}_{year}"
    if cache_key in actuals_cache:
        return actuals_cache[cache_key]

    actuals = await transactions_service.get_category_actuals_for_year(db, user_id, year)
    actuals_cache[cache_key] = actuals
    return actuals


# ─── FRONTEND DATA BUILDERS ───

async def get_budget_grid(db: AsyncSession, user_id: uuid.UUID, year: int) -> BudgetGridResponse:
    """Builds the 12-month array structure expected by the React frontend."""
    categories = await get_categories(db, user_id)
    actuals_data = await get_computed_actuals(db, user_id, year)
    
    # Fetch all planned values for the year
    values_result = await db.execute(
        select(BudgetValue).where(
            and_(BudgetValue.user_id == user_id, BudgetValue.year == year)
        )
    )
    planned_values = values_result.scalars().all()
    
    # Map planned values: { category_id: { month: amount } }
    planned_map = {}
    for val in planned_values:
        if val.category_id not in planned_map:
            planned_map[val.category_id] = {m: 0.0 for m in range(1, 13)}
        planned_map[val.category_id][val.month] = float(val.planned_amount)

    grid_data = {"income": [], "expenses": [], "savings": []}

    actuals_lower = {k.lower(): v for k, v in actuals_data.items()}

    for cat in categories:
        planned_vals = []
        actual_vals = []
        cat_actuals = actuals_lower.get(cat.name.lower(), {})  # ← case-insensitive
        for month in range(1, 13):
            planned_vals.append(planned_map.get(cat.id, {}).get(month, 0.0))
            actual_vals.append(cat_actuals.get(month, 0.0))
            
            
        row = CategoryGridRow(
            id=cat.id,
            name=cat.name,
            type=cat.type,
            icon=cat.icon,
            is_fixed=cat.is_fixed,
            planned_values=planned_vals,
            actual_values=actual_vals
        )
        target_key = "expenses" if cat.type == "expense" else cat.type
        grid_data[target_key].append(row)

    return BudgetGridResponse(
        year=year,
        income=grid_data["income"],
        expenses=grid_data["expenses"],
        savings=grid_data["savings"]
    )

async def get_budget_performance(db: AsyncSession, user_id: uuid.UUID, year: int) -> BudgetPerformanceResponse:
    """Generates the high-level summary for the PerformanceBar components."""
    categories = await get_categories(db, user_id)
    actuals_data = await get_computed_actuals(db, user_id, year)
    
    values_result = await db.execute(
        select(BudgetValue.category_id, func.sum(BudgetValue.planned_amount).label("total_planned"))
        .where(and_(BudgetValue.user_id == user_id, BudgetValue.year == year))
        .group_by(BudgetValue.category_id)
    )
    planned_map = {row.category_id: float(row.total_planned) for row in values_result.all()}
    
    metrics = {
        "income": PerformanceMetrics(),
        "expense": PerformanceMetrics(),
        "savings": PerformanceMetrics()
    }

    actuals_lower = {k.lower(): v for k, v in actuals_data.items()}
    
    for cat in categories:
        metrics[cat.type].planned += planned_map.get(cat.id, 0.0)
        # Sum all 12 months of actuals for this category
        cat_actuals = actuals_lower.get(cat.name.lower(), {})
        metrics[cat.type].actual += sum(cat_actuals.values())

    return BudgetPerformanceResponse(
        year=year,
        income=metrics["income"],
        expenses=metrics["expense"],
        savings=metrics["savings"]
    )