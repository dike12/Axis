from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import date as dt_date, datetime as dt_datetime, timezone
from decimal import Decimal
import uuid

class TransactionCreate(BaseModel):
    date: dt_date
    # Enforce positive amount, max 12 digits total, 2 decimal places
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    # Enforce category length matching the DB schema
    category: str = Field(..., max_length=100, pattern=r'^[a-zA-Z0-9\s]+$')
    description: str
    type: str
    shift_override: bool = False

    @field_validator('date')
    @classmethod
    def date_must_not_be_in_future(cls, v: dt_date) -> dt_date:
        today_utc = dt_datetime.now(timezone.utc).date()  # Always UTC, always consistent
        if v > today_utc:
            raise ValueError("Transaction date cannot be in the future.")
        return v

    @field_validator('type')
    @classmethod
    def type_must_be_valid(cls, v: str) -> str:
        if v not in ('credit', 'debit'):
            raise ValueError("Type must be either 'credit' or 'debit'.")
        return v
class TransactionResponse(TransactionCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    effective_date: dt_date
    is_shifted: bool
    created_at: dt_datetime
    updated_at: dt_datetime
    deleted_at: dt_datetime | None

    # This tells Pydantic: "It's okay to read data directly from a SQLAlchemy model"
    model_config = ConfigDict(from_attributes=True)


class TransactionUpdate(BaseModel):
    # Mirrored validation rules, but allowing None for partial updates
    amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    category: str | None = Field(None, max_length=100, pattern=r'^[a-zA-Z0-9\s]+$')
    description: str | None = None
    type: str | None = None
    shift_override: bool | None = None
    date: dt_date | None = None

    @field_validator('date')
    @classmethod
    def date_must_not_be_in_future(cls, v: dt_date | None) -> dt_date | None:
        if v and v > dt_date.today():
            raise ValueError("Transaction date cannot be in the future.")
        return v

    @field_validator('type')
    @classmethod
    def type_must_be_valid(cls, v: str | None) -> str | None:
        if v and v not in ('credit', 'debit'):
            raise ValueError("Type must be either 'credit' or 'debit'.")
        return v