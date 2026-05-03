import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Text, DateTime, Date, Numeric, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    # Primary Key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Key linking to the User table
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # Dates (Using Date instead of DateTime because we only care about the day)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # The Math (Numeric 12,2 perfectly handles millions of dollars and cents)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    
    # String Details
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'credit' or 'debit'
    
    # The Shift Logic Flags
    is_shifted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    shift_override: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    
    # Import Tracking (Nullable because manual entries won't have these)
    import_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Standard Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Soft delete tracking
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)