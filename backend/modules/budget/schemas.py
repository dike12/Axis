from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from uuid import UUID

# ─── CATEGORY SCHEMAS ───

class BudgetCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(..., pattern="^(income|expense|savings)$")
    icon: Optional[str] = Field(None, max_length=10)
    is_fixed: bool = False
    sort_order: int = 0

class BudgetCategoryCreate(BudgetCategoryBase):
    pass

class BudgetCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    icon: Optional[str] = Field(None, max_length=10)
    is_fixed: Optional[bool] = None
    sort_order: Optional[int] = None

class BudgetCategoryResponse(BudgetCategoryBase):
    id: UUID
    user_id: UUID

    # Required for Pydantic v2 to read from SQLAlchemy model attributes
    model_config = ConfigDict(from_attributes=True)


# ─── VALUE UPSERT SCHEMAS ───

class BudgetValueUpsert(BaseModel):
    category_id: UUID
    year: int
    month: int = Field(..., ge=1, le=12)
    planned_amount: float = Field(..., ge=0)

class BudgetBulkUpsert(BaseModel):
    values: List[BudgetValueUpsert]


# ─── FRONTEND GRID RESPONSE SCHEMAS ───

class CategoryGridRow(BaseModel):
    """
    Translates normalized DB rows into the 12-month array format 
    required by the React BudgetPlanner component.
    """
    id: UUID
    name: str
    type: str
    icon: Optional[str]
    is_fixed: bool
    planned_values: List[float] = Field(..., min_length=12, max_length=12)
    actual_values: List[float] = Field(..., min_length=12, max_length=12)

class BudgetGridResponse(BaseModel):
    year: int
    income: List[CategoryGridRow]
    expenses: List[CategoryGridRow]
    savings: List[CategoryGridRow]

# ─── PERFORMANCE SUMMARY SCHEMAS ───

class PerformanceMetrics(BaseModel):
    planned: float = 0.0
    actual: float = 0.0

class BudgetPerformanceResponse(BaseModel):
    year: int
    income: PerformanceMetrics
    expenses: PerformanceMetrics
    savings: PerformanceMetrics