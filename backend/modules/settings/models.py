import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, Integer, Boolean, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

# Assuming Base comes from your core database setup
from core.database import Base

class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    
    # Preferences
    currency: Mapped[str] = mapped_column(String(10), default="CAD", server_default="'CAD'")
    date_format: Mapped[str] = mapped_column(String(20), default="MM/DD/YYYY", server_default="'MM/DD/YYYY'")
    fiscal_year_start: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    
    # Budget Logic
    shift_late_income: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    income_cutoff_day: Mapped[int] = mapped_column(Integer, default=20, server_default="20")
    
    # FI Logic
    fi_target_override: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), server_default=func.now())