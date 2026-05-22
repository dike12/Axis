import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class SettingsUpdate(BaseModel):
    currency: str | None = Field(None, max_length=10)
    date_format: str | None = Field(None, max_length=20)
    # Month must be 1-12
    fiscal_year_start: int | None = Field(None, ge=1, le=12) 
    shift_late_income: bool | None = None
    # Cutoff day clamped to valid days of a month
    income_cutoff_day: int | None = Field(None, ge=1, le=28)
    fi_target_override: float | None = Field(None, ge=0)

class SettingsResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    currency: str
    date_format: str
    fiscal_year_start: int
    shift_late_income: bool
    income_cutoff_day: int
    fi_target_override: float | None
    created_at: datetime
    updated_at: datetime

    # Tells Pydantic to read directly from the SQLAlchemy model object
    model_config = ConfigDict(from_attributes=True)