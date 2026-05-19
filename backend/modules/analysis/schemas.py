from pydantic import BaseModel
from typing import List, Optional

# --- Sub-models for nested data ---
class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = "💰"

class CategoryMetric(CategoryBase):
    amount: float

class CategoryImprovement(CategoryBase):
    amount_improved: float

# --- 1. Monthly Snapshot ---
class MonthlySnapshotResponse(BaseModel):
    total_spent: float
    mom_change_percentage: float
    biggest_category: CategoryMetric
    most_improved_category: CategoryImprovement

# --- 2. Category Breakdown ---
class CategoryBreakdownItem(CategoryBase):
    actual: float
    budget: float
    percent_used: float
    is_fixed: bool

class CategoryBreakdownResponse(BaseModel):
    categories: List[CategoryBreakdownItem]

# --- 3. Trends ---
class TrendItem(CategoryBase):
    history: List[float] # 6-month array
    trend_tag: str       # "Rising", "Reduced", or "Stable"

class TrendsResponse(BaseModel):
    trends: List[TrendItem]

# --- 4. Spending Insights ---
class InsightChip(BaseModel):
    text: str
    type: str  # e.g., "over_budget", "anomaly", "mom_change"\
    category: str

class SpendingInsightsResponse(BaseModel):
    insights: List[InsightChip]