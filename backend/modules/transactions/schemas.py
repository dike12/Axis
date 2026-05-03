from pydantic import BaseModel, ConfigDict
from datetime import date as dt_date, datetime as dt_datetime
from decimal import Decimal
import uuid

class TransactionCreate(BaseModel):
    date: dt_date
    amount: Decimal
    category: str
    description: str
    type: str
    shift_override: bool = False

class TransactionResponse(TransactionCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    effective_date: dt_date
    is_shifted: bool
    created_at: dt_datetime
    updated_at: dt_datetime

    # This tells Pydantic: "It's okay to read data directly from a SQLAlchemy model"
    model_config = ConfigDict(from_attributes=True)


class TransactionUpdate(BaseModel):
    amount: Decimal | None = None
    category: str | None = None
    description: str | None = None
    type: str | None = None
    shift_override: bool | None = None
    date: dt_date | None = None