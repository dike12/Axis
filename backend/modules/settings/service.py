import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from modules.settings.models import UserSettings
from modules.settings.schemas import SettingsUpdate

# Notice: We import the transaction SERVICE, not the models!
from modules.transactions import service as tx_service

async def get_user_settings(db: AsyncSession, user_id: uuid.UUID) -> UserSettings:
    query = select(UserSettings).where(UserSettings.user_id == user_id)
    result = await db.execute(query)
    settings = result.scalar_one_or_none()
    
    # Fallback: Create default settings if they somehow don't exist
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        
    return settings

async def update_user_settings(db: AsyncSession, user_id: uuid.UUID, update_data: SettingsUpdate) -> UserSettings:
    settings = await get_user_settings(db, user_id)
    
    # Capture the old state before applying changes
    old_shift_enabled = settings.shift_late_income
    old_cutoff_day = settings.income_cutoff_day
    
    # Apply the new fields from the Pydantic schema
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(settings, key, value)
        
    # --- CROSS-MODULE TRIGGER ---
    # If the user touched the income rollover logic, we must recalculate transactions
    shift_changed = old_shift_enabled != settings.shift_late_income
    cutoff_changed = old_cutoff_day != settings.income_cutoff_day
    
    if shift_changed or cutoff_changed:
        # Pass the execution over to the transactions module where it belongs
        await tx_service.apply_mass_rollover_recalculation(
            db=db, 
            user_id=user_id, 
            shift_enabled=settings.shift_late_income, 
            cutoff_day=settings.income_cutoff_day
        )
        
    # Save the settings
    await db.commit()
    await db.refresh(settings)
    return settings