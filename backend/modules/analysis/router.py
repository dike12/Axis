import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict

# Import the database dependency from your core module
from core.database import get_db
from core.auth import get_current_user_id  # <-- The secure Auth bouncer!

# Import our Analysis service (which handles the cross-module logic)
from modules.analysis import service

router = APIRouter(
    prefix="",
    tags=["Analysis"]
)

# --- Helper ---
def success_response(data: Any, meta: dict = None) -> Dict[str, Any]:
    """Wraps responses in the consistent envelope required by the architecture [cite: 200, 308]"""
    return {"data": data, "error": None, "meta": meta}

# --- Endpoints ---
@router.get("/monthly-snapshot")
async def get_monthly_snapshot_endpoint(
    # Default to current year/month if the frontend doesn't provide them
    year: int = Query(default_factory=lambda: datetime.now().year),
    month: int = Query(default_factory=lambda: datetime.now().month, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
):
    """
    Return total spent, biggest category, most improved category for a given month.
    """
    snapshot_data = await service.get_monthly_snapshot(
        db=db, 
        user_id=current_user_id, 
        year=year, 
        month=month
    )
    
    # Use .model_dump() to safely serialize the Pydantic response into the dict
    return success_response(data=snapshot_data.model_dump())


@router.get("/spending-insights")
async def get_spending_insights_endpoint(
    year: int = Query(default_factory=lambda: datetime.now().year),
    month: int = Query(default_factory=lambda: datetime.now().month, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
):
    """
    Return computed insight chips: anomalies, over-budget flags, MoM changes
    """
    insights_data = await service.get_spending_insights(
        db=db, 
        user_id=current_user_id, 
        year=year, 
        month=month
    )
    
    return success_response(data=insights_data.model_dump())


@router.get("/category-breakdown")
async def get_category_breakdown_endpoint(
    year: int = Query(default_factory=lambda: datetime.now().year),
    month: int = Query(default_factory=lambda: datetime.now().month, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
):
    """
    Return per-category actual vs budget with % used for a given month
    """
    breakdown_data = await service.get_category_breakdown(
        db=db, 
        user_id=current_user_id, 
        year=year, 
        month=month
    )
    
    return success_response(data=breakdown_data.model_dump())


@router.get("/trends")
async def get_trends_endpoint(
    year: int = Query(default_factory=lambda: datetime.now().year),
    month: int = Query(default_factory=lambda: datetime.now().month, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id) # <-- Secure session
):
    """
    Return 6-month spend history per category with structural trend tags
    """
    trends_data = await service.get_trends(
        db=db, 
        user_id=current_user_id, 
        year=year, 
        month=month
    )
    
    return success_response(data=trends_data.model_dump())