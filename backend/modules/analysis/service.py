import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

# Import services from other modules (NEVER import their models directly)
from modules.budget import service as budget_service
from modules.transactions import service as transactions_service

# Import our exact response contracts
from modules.analysis.schemas import (
    MonthlySnapshotResponse,
    CategoryBreakdownResponse,
    CategoryBreakdownItem,
    TrendsResponse,
    TrendItem,
    SpendingInsightsResponse,
    CategoryMetric,
    CategoryImprovement,
    InsightChip
)

# ---------------------------------------------------------
# 1. Monthly Snapshot
# ---------------------------------------------------------
async def get_monthly_snapshot(
    db: AsyncSession, 
    user_id: uuid.UUID, 
    year: int, 
    month: int
) -> MonthlySnapshotResponse:
    
    # 1. Handle Date Math for "Last Month"
    prev_month = 12 if month == 1 else month - 1
    prev_year = year - 1 if month == 1 else year

    # 2. Cross-Module Data Fetching
    categories = await budget_service.get_categories(db, user_id)
    
    current_year_actuals = await budget_service.get_computed_actuals(db, user_id, year)
    
    # Only fetch previous year actuals if we crossed the January boundary
    if prev_year != year:
        prev_year_actuals = await budget_service.get_computed_actuals(db, user_id, prev_year)
    else:
        prev_year_actuals = current_year_actuals

    # The snapshot primarily cares about 'expenses'
    expense_cats = [c for c in categories if c.type == "expense"]

    # 3. Initialize Calculation State
    total_spent = 0.0
    last_month_spent = 0.0
    
    biggest_cat = {"name": "None", "amount": 0.0, "icon": "💰"}
    most_improved = {"name": "None", "amount_improved": 0.0, "icon": "📈"}

    # Use case-insensitive dict lookups to match the budget service behavior
    curr_actuals_lower = {k.lower(): v for k, v in current_year_actuals.items()}
    prev_actuals_lower = {k.lower(): v for k, v in prev_year_actuals.items()}

    # 4. Process Each Expense Category
    for cat in expense_cats:
        cat_key = cat.name.lower()
        
        # Extract actuals for the specific months
        curr_val = curr_actuals_lower.get(cat_key, {}).get(month, 0.0)
        prev_val = prev_actuals_lower.get(cat_key, {}).get(prev_month, 0.0)

        total_spent += curr_val
        last_month_spent += prev_val

        # Check for biggest category
        if curr_val > biggest_cat["amount"]:
            biggest_cat = {"name": cat.name, "amount": curr_val, "icon": cat.icon}

        # Check for most improved (highest drop in spending vs last month)
        improvement = prev_val - curr_val
        if improvement > most_improved["amount_improved"]:
            most_improved = {"name": cat.name, "amount_improved": improvement, "icon": cat.icon}

    # 5. Month-over-Month Change %
    mom_change = 0.0
    if last_month_spent > 0:
        mom_change = ((total_spent - last_month_spent) / last_month_spent) * 100.0

    # 6. Return the standard schema
    return MonthlySnapshotResponse(
        total_spent=total_spent,
        mom_change_percentage=mom_change,
        biggest_category=CategoryMetric(**biggest_cat),
        most_improved_category=CategoryImprovement(**most_improved)
    )

# ---------------------------------------------------------
# 2. Category Breakdown
# ---------------------------------------------------------
async def get_category_breakdown(
    db: AsyncSession, 
    user_id: uuid.UUID, 
    year: int, 
    month: int
) -> CategoryBreakdownResponse:
    
    # 1. Fetch the full 12-month budget grid matrix
    grid = await budget_service.get_budget_grid(db, user_id, year)
    
    breakdown_items = []
    month_idx = month - 1  # Convert 1-12 month input to 0-11 array index
    
    # 2. Combine expenses and savings since savings act as outbound allocations
    target_rows = grid.expenses + grid.savings
    
    # 3. Process every row for the requested month
    for row in target_rows:
        planned = row.planned_values[month_idx]
        actual = row.actual_values[month_idx]
        
        # Calculate usage percentage, preventing zero division errors
        percent_used = 0.0
        if planned > 0:
            percent_used = (actual / planned) * 100.0
            
        breakdown_items.append(
            CategoryBreakdownItem(
                name=row.name,
                icon=row.icon,
                actual=actual,
                budget=planned,
                percent_used=percent_used,
                is_fixed=row.is_fixed
            )
        )
        
    return CategoryBreakdownResponse(categories=breakdown_items)

# ---------------------------------------------------------
# 3. Trends (6-Month History)
# ---------------------------------------------------------
async def get_trends(
    db: AsyncSession, 
    user_id: uuid.UUID, 
    year: int, 
    month: int
) -> TrendsResponse:
    
    # 1. Map out the exact 6-month window backwards from the target date
    # Example for May 2026: [(2025, 12), (2026, 1), (2026, 2), (2026, 3), (2026, 4), (2026, 5)]
    target_months = []
    curr_m, curr_y = month, year
    for _ in range(6):
        target_months.append((curr_y, curr_m))
        curr_m -= 1
        if curr_m == 0:
            curr_m = 12
            curr_y -= 1
            
    # Reverse the timeline to get a true chronological order (past -> present)
    target_months.reverse()
    
    # 2. Extract the distinct years we need to avoid repetitive cross-module calls
    distinct_years = {y for y, m in target_months}
    
    # Pre-fetch the computed actuals matrix for each required year
    yearly_actuals = {}
    for y in distinct_years:
        actuals = await budget_service.get_computed_actuals(db, user_id, y)
        yearly_actuals[y] = {k.lower(): v for k, v in actuals.items()}

    # 3. Fetch system budget categories to build rows for active expense types
    categories = await budget_service.get_categories(db, user_id)
    expense_cats = [c for c in categories if c.type == "expense"]
    
    trend_items = []

    # 4. Process the timeline history for every expense bucket
    for cat in expense_cats:
        cat_key = cat.name.lower()
        history_points = []
        
        for y, m in target_months:
            val = yearly_actuals[y].get(cat_key, {}).get(m, 0.0)
            history_points.append(val)
            
        # 5. Compute Trend Tags matching your original frontend layout thresholds
        recent_spend = history_points[-1]
        prev_spend = history_points[-2]
        
        diff_pct = 0.0
        if prev_spend > 0:
            diff_pct = ((recent_spend - prev_spend) / prev_spend) * 100.0
            
        if abs(diff_pct) < 5.0:
            tag = "Stable"
        elif diff_pct > 0:
            tag = "Rising"
        else:
            tag = "Reduced"
            
        trend_items.append(
            TrendItem(
                name=cat.name,
                icon=cat.icon,
                history=history_points,
                trend_tag=tag
            )
        )
        
    return TrendsResponse(trends=trend_items)

# ---------------------------------------------------------
# 4. Spending Insights
# ---------------------------------------------------------
async def get_spending_insights(
    db: AsyncSession, 
    user_id: uuid.UUID, 
    year: int, 
    month: int
) -> SpendingInsightsResponse:
    
    # 1. Fetch current year data matrix
    grid = await budget_service.get_budget_grid(db, user_id, year)
    
    # Determine lookback indexes safely
    month_idx = month - 1
    prev_month_idx = 11 if month == 1 else month - 2
    
    # Handle the cross-year boundary for January if required
    if month == 1:
        prev_grid = await budget_service.get_budget_grid(db, user_id, year - 1)
    else:
        prev_grid = grid

    insights = []

    # 2. Evaluate performance trends across expense targets
    for row in grid.expenses + grid.savings:
        actual = row.actual_values[month_idx]
        budget = row.planned_values[month_idx]
        
        # --- Rule A: Over/Under Budget Flags ---
        if actual > budget and budget > 0:
            diff = actual - budget
            insights.append(
                InsightChip(
                    text=f"{row.name} is ${diff:,.2f} over budget.",
                    type="over_budget",
                    category=row.name
                )
            )
        elif actual < budget and actual > 0:
            diff = budget - actual
            insights.append(
                InsightChip(
                    text=f"{row.name} came in ${diff:,.2f} under budget. Keep it up!",
                    type="under_budget",
                    category=row.name
                )
            )
            
        # --- Rule B: Month-over-Month Anomalies ---
        prev_actual = 0.0
        if month == 1:
            prev_row = next((r for r in prev_grid.expenses if r.name.lower() == row.name.lower()), None)
            if prev_row:
                prev_actual = prev_row.actual_values[11]
        else:
            prev_actual = row.actual_values[prev_month_idx]
            
        if prev_actual > 0:
            mom_percentage = ((actual - prev_actual) / prev_actual) * 100.0
            # Flag any spending spikes that exceed a 20% surge
            if mom_percentage >= 20.0:
                insights.append(
                    InsightChip(
                        text=f"Spending Spike: You spent {mom_percentage:.0f}% more on {row.name} than last month.",
                        type="anomaly",
                        category=row.name
                    )
                )

    return SpendingInsightsResponse(insights=insights)