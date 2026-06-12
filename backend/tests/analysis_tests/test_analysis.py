# backend/tests/analysis_tests/test_analysis.py
"""
ANALYSIS MODULE — Integration Test Suite
==========================================
Endpoints:
  GET /analysis/monthly-snapshot
  GET /analysis/category-breakdown
  GET /analysis/trends
  GET /analysis/spending-insights

All tests depend on the `analysis_ready` fixture from conftest, which seeds:
  - 3 budget categories  (FOOD_CAT/expense, INCOME_CAT/income, SAVINGS_CAT/savings)
  - 5 canonical transactions (see conftest docstring for exact amounts)
  - Planned values: Food=400, Income=3500, Savings=500 for May/June 2025

Expected state for assertions (derived from canonical seed):
  May 2025  Food actual  = 350   (planned 400  → under budget by 50)
  Jun 2025  Food actual  = 300   (planned 400  → under budget by 100)
  May 2025  Income actual = 3000 (T4 shifted to June)
  Jun 2025  Income actual = 500  (T4 shifted in)
  Savings actual = 0 both months (nothing seeded against it)

NOTE: The analysis router uses prefix="" and is assumed to be mounted at
/analysis in main.py. If paths need adjustment, change the ANALYSIS_BASE
constant below.
"""

import pytest
from conftest import (
    FOOD_CAT, INCOME_CAT, SAVINGS_CAT,
    EXPECTED_FOOD_MAY, EXPECTED_FOOD_JUN,
    EXPECTED_INCOME_MAY, EXPECTED_INCOME_JUN,
    create,
)

ANALYSIS_BASE = "/analysis"


# ═══════════════════════════════════════════════════════════════════════════════
# A — MONTHLY SNAPSHOT
# ═══════════════════════════════════════════════════════════════════════════════

class TestMonthlySnapshot:
    """GET /analysis/monthly-snapshot?year=&month="""

    async def test_returns_200(self, client, analysis_ready):
        resp = await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                params={"year": 2025, "month": 5})
        assert resp.status_code == 200

    async def test_response_has_spec_envelope(self, client, analysis_ready):
        body = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 5})).json()
        assert "data"  in body
        assert body["error"] is None

    async def test_response_has_required_fields(self, client, analysis_ready):
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 5})).json()["data"]
        for field in ("total_spent", "mom_change_percentage",
                      "biggest_category", "most_improved_category"):
            assert field in data, f"monthly-snapshot missing field: {field}"

    async def test_total_spent_matches_expense_actuals(self, client, analysis_ready):
        """total_spent must sum only expense categories (not income)."""
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert abs(data["total_spent"] - EXPECTED_FOOD_MAY) < 0.01

    async def test_empty_month_returns_zero_total_spent(self, client, analysis_ready):
        """A month with no transactions must return 0, not a server error."""
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 1})).json()["data"]
        assert data["total_spent"] == pytest.approx(0.0, abs=0.01)

    async def test_biggest_category_identifies_highest_expense(self, client, analysis_ready):
        """With only one expense category seeded, biggest must be FOOD_CAT."""
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert data["biggest_category"]["name"]   == FOOD_CAT
        assert abs(data["biggest_category"]["amount"] - EXPECTED_FOOD_MAY) < 0.01

    async def test_biggest_category_has_icon_field(self, client, analysis_ready):
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert "icon" in data["biggest_category"]

    async def test_mom_change_zero_when_no_prior_month_data(self, client, analysis_ready):
        """
        April has no expense transactions → prev_spent = 0 → mom_change = 0.0.
        The service guards against division by zero when prev_spent = 0.
        """
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert data["mom_change_percentage"] == pytest.approx(0.0, abs=0.01)

    async def test_mom_change_negative_when_spending_decreased(self, client, analysis_ready):
        """June (300) < May (350) → mom_change must be negative."""
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 6})).json()["data"]
        assert data["mom_change_percentage"] < 0

    async def test_mom_change_calculation_is_correct(self, client, analysis_ready):
        """(300 - 350) / 350 × 100 ≈ -14.3%"""
        data = (await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                 params={"year": 2025, "month": 6})).json()["data"]
        expected = ((EXPECTED_FOOD_JUN - EXPECTED_FOOD_MAY) / EXPECTED_FOOD_MAY) * 100
        assert abs(data["mom_change_percentage"] - expected) < 0.5

    async def test_january_snapshot_uses_december_of_prior_year(self, client, core_categories):
        """
        For month=1, prev_month=12 of the prior year.
        Service must not crash on the year boundary — returns 0 MoM
        when both months are empty.
        """
        resp = await client.get(f"{ANALYSIS_BASE}/monthly-snapshot",
                                params={"year": 2025, "month": 1})
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "mom_change_percentage" in data


# ═══════════════════════════════════════════════════════════════════════════════
# B — CATEGORY BREAKDOWN
# ═══════════════════════════════════════════════════════════════════════════════

class TestCategoryBreakdown:
    """GET /analysis/category-breakdown?year=&month="""

    async def test_returns_200(self, client, analysis_ready):
        resp = await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                params={"year": 2025, "month": 5})
        assert resp.status_code == 200

    async def test_response_has_categories_key(self, client, analysis_ready):
        data = (await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert "categories" in data

    async def test_each_item_has_required_fields(self, client, analysis_ready):
        categories = (await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                       params={"year": 2025, "month": 5})).json()["data"]["categories"]
        for item in categories:
            for field in ("name", "icon", "actual", "budget", "percent_used", "is_fixed"):
                assert field in item, f"category breakdown item missing field: {field}"

    async def test_includes_expenses_not_income(self, client, analysis_ready):
        """Breakdown covers expenses + savings only; income categories excluded."""
        categories = (await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                       params={"year": 2025, "month": 5})).json()["data"]["categories"]
        names = [c["name"] for c in categories]
        assert FOOD_CAT    in names,     "Food (expense) must appear in breakdown"
        assert SAVINGS_CAT in names,     "Savings must appear in breakdown"
        assert INCOME_CAT  not in names, "Income must NOT appear in breakdown"

    async def test_food_actual_matches_seeded_transactions(self, client, analysis_ready):
        categories = (await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                       params={"year": 2025, "month": 5})).json()["data"]["categories"]
        food = next(c for c in categories if c["name"] == FOOD_CAT)
        assert abs(food["actual"] - EXPECTED_FOOD_MAY) < 0.01

    async def test_percent_used_calculated_correctly(self, client, analysis_ready):
        """Food May: actual=350, planned=400 → percent_used = 87.5%"""
        categories = (await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                       params={"year": 2025, "month": 5})).json()["data"]["categories"]
        food = next(c for c in categories if c["name"] == FOOD_CAT)
        expected_pct = (EXPECTED_FOOD_MAY / 400.0) * 100
        assert abs(food["percent_used"] - expected_pct) < 0.5

    async def test_zero_budget_returns_zero_percent_no_crash(self, client, core_categories):
        """
        A category with planned=0 must not produce a ZeroDivisionError.
        The service guards: if planned > 0 else percent_used = 0.
        """
        resp = await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                params={"year": 2025, "month": 5})
        assert resp.status_code == 200
        categories = resp.json()["data"]["categories"]
        for cat in categories:
            if cat["budget"] == 0:
                assert cat["percent_used"] == pytest.approx(0.0, abs=0.01)

    async def test_empty_month_returns_zero_actuals(self, client, analysis_ready):
        categories = (await client.get(f"{ANALYSIS_BASE}/category-breakdown",
                                       params={"year": 2025, "month": 1})).json()["data"]["categories"]
        for cat in categories:
            assert cat["actual"] == pytest.approx(0.0, abs=0.01)


# ═══════════════════════════════════════════════════════════════════════════════
# C — TRENDS
# ═══════════════════════════════════════════════════════════════════════════════

class TestTrends:
    """GET /analysis/trends?year=&month="""

    async def test_returns_200(self, client, analysis_ready):
        resp = await client.get(f"{ANALYSIS_BASE}/trends",
                                params={"year": 2025, "month": 5})
        assert resp.status_code == 200

    async def test_response_has_trends_key(self, client, analysis_ready):
        data = (await client.get(f"{ANALYSIS_BASE}/trends",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert "trends" in data

    async def test_each_trend_item_has_required_fields(self, client, analysis_ready):
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 5})).json()["data"]["trends"]
        for item in trends:
            for field in ("name", "icon", "history", "trend_tag"):
                assert field in item, f"trend item missing field: {field}"

    async def test_history_array_has_exactly_6_entries(self, client, analysis_ready):
        """Service always builds a 6-month window regardless of data availability."""
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 5})).json()["data"]["trends"]
        for item in trends:
            assert len(item["history"]) == 6, (
                f"Expected 6 history entries for {item['name']}, got {len(item['history'])}"
            )

    async def test_trend_tag_is_valid_value(self, client, analysis_ready):
        valid_tags = {"Rising", "Reduced", "Stable"}
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 5})).json()["data"]["trends"]
        for item in trends:
            assert item["trend_tag"] in valid_tags, (
                f"Unknown trend_tag '{item['trend_tag']}' for {item['name']}"
            )

    async def test_trend_stable_when_no_prior_month_data(self, client, analysis_ready):
        """
        When prev_spend = 0 the service sets diff_pct = 0.0 → tag = 'Stable'.
        May is the first month with data, so the 5-month lookback is all zeros.
        """
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 5})).json()["data"]["trends"]
        food = next(t for t in trends if t["name"] == FOOD_CAT)
        assert food["trend_tag"] == "Stable"

    async def test_most_recent_history_entry_matches_actual(self, client, analysis_ready):
        """history[-1] must equal the actual spend for the requested month."""
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 5})).json()["data"]["trends"]
        food = next(t for t in trends if t["name"] == FOOD_CAT)
        assert abs(food["history"][-1] - EXPECTED_FOOD_MAY) < 0.01

    async def test_only_expense_categories_in_trends(self, client, analysis_ready):
        """Trends are built for expense categories only (same as analysis logic)."""
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 5})).json()["data"]["trends"]
        names = [t["name"] for t in trends]
        assert INCOME_CAT not in names, "Income category must not appear in trends"

    async def test_january_handles_year_boundary_without_crash(self, client, core_categories):
        """For month=1, the 6-month window crosses into the previous year."""
        resp = await client.get(f"{ANALYSIS_BASE}/trends",
                                params={"year": 2025, "month": 1})
        assert resp.status_code == 200
        trends = resp.json()["data"]["trends"]
        for item in trends:
            assert len(item["history"]) == 6

    async def test_trend_reduced_tag_correct(self, client, analysis_ready, core_categories):
        """
        Add a Jun transaction that is LESS than May spend to trigger 'Reduced'.
        May food = 350, Jun food = 300 → diff = (300-350)/350 = -14.3% → Reduced.
        """
        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 6})).json()["data"]["trends"]
        food = next(t for t in trends if t["name"] == FOOD_CAT)
        assert food["trend_tag"] == "Reduced"

    async def test_trend_rising_tag_correct(self, client, analysis_ready):
        """
        Inject a large Jun transaction to push spending > 5% above May → Rising.
        May food = 350. We add $400 more in Jun → Jun = 700 → +100% → Rising.
        """
        await create(client, date="2025-06-15", category=FOOD_CAT,
                     amount=400.00, type="debit")

        trends = (await client.get(f"{ANALYSIS_BASE}/trends",
                                   params={"year": 2025, "month": 6})).json()["data"]["trends"]
        food = next(t for t in trends if t["name"] == FOOD_CAT)
        assert food["trend_tag"] == "Rising"


# ═══════════════════════════════════════════════════════════════════════════════
# D — SPENDING INSIGHTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSpendingInsights:
    """GET /analysis/spending-insights?year=&month="""

    async def test_returns_200(self, client, analysis_ready):
        resp = await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                params={"year": 2025, "month": 5})
        assert resp.status_code == 200

    async def test_response_has_insights_key(self, client, analysis_ready):
        data = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                 params={"year": 2025, "month": 5})).json()["data"]
        assert "insights" in data

    async def test_each_insight_has_required_fields(self, client, analysis_ready):
        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 5})).json()["data"]["insights"]
        for chip in insights:
            for field in ("text", "type", "category"):
                assert field in chip, f"insight chip missing field: {field}"

    async def test_under_budget_insight_generated(self, client, analysis_ready):
        """Food May: actual=350 < planned=400 and actual>0 → under_budget chip."""
        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 5})).json()["data"]["insights"]
        types = [i["type"] for i in insights]
        assert "under_budget" in types

    async def test_under_budget_insight_references_correct_category(self, client, analysis_ready):
        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 5})).json()["data"]["insights"]
        under = [i for i in insights if i["type"] == "under_budget"]
        categories = [i["category"] for i in under]
        assert FOOD_CAT in categories

    async def test_over_budget_insight_generated(self, client, analysis_ready):
        """
        Push Food above its $400 planned budget by adding an extra transaction,
        then verify an over_budget insight is produced.
        """
        await create(client, date="2025-05-20", category=FOOD_CAT,
                     amount=200.00, type="debit")  # Food May → 550 > 400 planned

        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 5})).json()["data"]["insights"]
        types = [i["type"] for i in insights]
        assert "over_budget" in types

    async def test_no_insight_when_actual_is_zero(self, client, analysis_ready):
        """
        Savings has actual=0 in May — rule requires actual > 0 for under_budget.
        Savings must NOT produce an under_budget chip.
        """
        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 5})).json()["data"]["insights"]
        savings_insights = [i for i in insights if i["category"] == SAVINGS_CAT]
        assert not any(i["type"] == "under_budget" for i in savings_insights)

    async def test_anomaly_insight_on_20_pct_spike(self, client, analysis_ready):
        """
        Jun Food = 300. Add $420 → Jun total = 720.
        MoM = (720 - 350) / 350 = 105.7% ≥ 20% → anomaly chip expected.
        """
        await create(client, date="2025-06-15", category=FOOD_CAT,
                     amount=420.00, type="debit")

        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 6})).json()["data"]["insights"]
        types = [i["type"] for i in insights]
        assert "anomaly" in types

    async def test_no_anomaly_below_20_pct_change(self, client, analysis_ready):
        """
        Jun Food = 300 vs May Food = 350 → -14.3% (decrease, not spike).
        No anomaly chip expected.
        """
        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 6})).json()["data"]["insights"]
        anomalies = [i for i in insights if i["type"] == "anomaly"
                     and i["category"] == FOOD_CAT]
        assert not anomalies

    async def test_empty_month_returns_empty_insights_list(self, client, analysis_ready):
        insights = (await client.get(f"{ANALYSIS_BASE}/spending-insights",
                                     params={"year": 2025, "month": 1})).json()["data"]["insights"]
        assert isinstance(insights, list)
        assert len(insights) == 0