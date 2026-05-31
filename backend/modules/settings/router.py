import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.auth import get_current_user_id  # <-- Import the real Auth bouncer!

from modules.settings import service
from modules.settings.schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=dict)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Uses the secure JWT cookie
):
    settings = await service.get_user_settings(db, user_id)
    
    # Return using the strict response envelope
    return {
        "data": SettingsResponse.model_validate(settings).model_dump(),
        "error": None
    }

@router.put("", response_model=dict)
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id) # <-- Uses the secure JWT cookie
):
    settings = await service.update_user_settings(db, user_id, payload)
    
    # Return using the strict response envelope
    return {
        "data": SettingsResponse.model_validate(settings).model_dump(),
        "error": None,
        "meta": {"message": "Settings updated successfully"}
    }