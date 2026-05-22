import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Assuming you have standard core dependencies
from core.database import get_db
from core.auth import get_current_user_id

from modules.settings import service
from modules.settings.schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=dict)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    settings = await service.get_user_settings(db, user_id)
    # Wrap in consistent envelope: { "data": ... }
    return {"data": SettingsResponse.model_validate(settings).model_dump()}

@router.put("", response_model=dict)
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    settings = await service.update_user_settings(db, user_id, payload)
    return {"data": SettingsResponse.model_validate(settings).model_dump()}