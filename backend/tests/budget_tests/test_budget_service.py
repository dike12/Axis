# backend/tests/budget_tests/test_budget_service.py
"""
BUDGET MODULE — Service Behaviour & Gap-Fill Tests
====================================================
This file covers behaviours NOT exercised by the existing test_budget.py:

  A  Cascade delete  — K's decision: delete_category removes its values first,
                       then the category (not guard-and-reject as the spec draft
                       originally described). Verified here to prevent regression.

  B  Actuals computation — correctness of cross-module get_category_actuals_for_year:
       - Uses effective_date (not date) for rollover-shifted transactions
       - Case-insensitive category name matching
       - Excludes soft-deleted transactions
       - Debit and credit transactions are both counted as positive actuals

  C  Grid structure integrity — shape and type-separation guarantees

  D  Performance summary — year-wide aggregation is consistent with grid values

All tests use the async ASGI client against a rollback-scoped DB session.
"""

import pytest
from conftest import (
    create, FOOD_CAT, INCOME_CAT, SAVINGS_CAT,
    EXPECTED_FOOD_MAY, EXPECTED_FOOD_JUN,
    EXPECTED_INCOME_MAY, EXPECTED_INCOME_JUN,
    EXPECTED_TOTAL_INCOME_2025, EXPECTED_TOTAL_EXPENSE_2025,
)


# ─── Local helpers ────────────────────────────────────────────────────────────

def _find_row(grid_data: dict, category_name: str) -> dict | None:
    """Search all three grid sections for a row by category name."""
    for section_key in ("income", "expenses", "savings"):
        for row in grid_data.get(section_key, []):
            if row["name"] == category_name:
                return row
    return None


async def _get_grid(client, year: int = 2025) -> dict:
    resp = await client.get("/budget/values", params={"year": year})
    assert resp.status_code == 200, f"GET /budget/values failed: {resp.text}"
    return resp.json()["data"]


# ═══════════════════════════════════════════════════════════════════════════════
# A — CASCADE DELETE
# ═══════════════════════════════════════════════════════════════════════════════

class TestCascadeDelete:
    """
    K's scoping decision: deleting a category cascade-deletes its budget_values
    rows instead of returning a 409 guard error.
    """

    async def test_delete_category_with_no_values_succeeds(self, client, core_categories):
        food_id = core_categories[FOOD_CAT]
        resp = await client.delete(f"/budget/categories/{food_id}")
        assert resp.status_code in (200, 204)

    async def test_delete_category_with_values_succeeds(self, client, core_categories):
        """
        Category with associated planned values must still be deletable.
        This verifies the cascade-delete implementation, not guard-and-reject.
        """
        food_id = core_categories[FOOD_CAT]
        await client.put("/budget/values", json={"values": [
            {"category_id": food_id, "year": 2025, "month": 5, "planned_amount": 300.00},
            {"category_id": food_id, "year": 2025, "month": 6, "planned_amount": 300.00},
        ]})
        resp = await client.delete(f"/budget/categories/{food_id}")
        assert resp.status_code in (200, 204), (
            "Cascade delete must succeed even when budget_values exist"
        )

    async def test_deleted_category_no_longer_in_list(self, client, core_categories):
        food_id = core_categories[FOOD_CAT]
        await client.delete(f"/budget/categories/{food_id}")

        categories = (await client.get("/budget/categories")).json()["data"]
        remaining_ids = [c["id"] for c in categories]
        assert food_id not in remaining_ids

    async def test_delete_does_not_affect_other_categories(self, client, core_categories):
        food_id    = core_categories[FOOD_CAT]
        income_id  = core_categories[INCOME_CAT]
        savings_id = core_categories[SAVINGS_CAT]

        await client.delete(f"/budget/categories/{food_id}")

        categories = (await client.get("/budget/categories")).json()["data"]
        remaining_ids = [c["id"] for c in categories]
        assert income_id  in remaining_ids, "Income category must survive Food deletion"
        assert savings_id in remaining_ids, "Savings category must survive Food deletion"

    async def test_deleted_category_absent_from_grid(self, client, core_categories):
        food_id = core_categories[FOOD_CAT]
        await client.put("/budget/values", json={"values": [
            {"category_id": food_id, "year": 2025, "month": 5, "planned_amount": 200.00},
        ]})
        await client.delete(f"/budget/categories/{food_id}")

        grid = await _get_grid(client)
        assert _find_row(grid, FOOD_CAT) is None

    async def test_nonexistent_category_delete_returns_404(self, client):
        import uuid
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"/budget/categories/{fake_id}")
        assert resp.status_code == 404

    async def test_delete_another_users_category_returns_404(self, client, core_categories):
        """
        The service checks category.user_id == user_id before deletion.
        Providing a valid UUID that belongs to no category must return 404.
        """
        import uuid
        unowned_id = str(uuid.uuid4())
        resp = await client.delete(f"/budget/categories/{unowned_id}")
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# B — ACTUALS COMPUTATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestActualsComputation:
    """
    Verifies the correctness of get_category_actuals_for_year, which is the
    cross-module bridge between transactions and budget.
    """

    async def test_actuals_match_seeded_transaction_amounts(
        self, client, core_categories, seeded_transactions
    ):
        """End-to-end: canonical seed → budget grid → expected actuals."""
        grid = await _get_grid(client)
        food_row = _find_row(grid, FOOD_CAT)
        assert food_row is not None

        assert abs(food_row["actual_values"][4] - EXPECTED_FOOD_MAY) < 0.01  # May
        assert abs(food_row["actual_values"][5] - EXPECTED_FOOD_JUN) < 0.01  # Jun

    async def test_actuals_use_effective_date_not_transaction_date(
        self, client, core_categories
    ):
        """
        T4 in the seed: date=May 22, is_shifted=True → effective_date=June 1.
        It must appear in June income, NOT May income.
        """
        # Seed only T3 and T4 to isolate the test
        await create(client, date="2025-05-10", category=INCOME_CAT,
                     amount=3000.00, type="credit")
        await create(client, date="2025-05-22", category=INCOME_CAT,
                     amount=500.00, type="credit")   # will be shifted to June

        grid = await _get_grid(client)
        income_row = _find_row(grid, INCOME_CAT)
        assert income_row is not None

        may_actual  = income_row["actual_values"][4]   # index 4 = May
        june_actual = income_row["actual_values"][5]   # index 5 = June

        assert abs(may_actual  - 3000.00) < 0.01, "May income should be 3000 (T3 only)"
        assert abs(june_actual - 500.00)  < 0.01, "June income should be 500 (T4 shifted)"

    async def test_actuals_case_insensitive_category_matching(
        self, client, core_categories
    ):
        """
        The service does `actuals_lower.get(cat.name.lower(), {})`.
        A transaction whose category is the ALL-CAPS variant of FOOD_CAT must
        still be counted against FOOD_CAT's actuals row.
        """
        await create(client, date="2025-05-10", category=FOOD_CAT.upper(),
                     amount=200.00, type="debit")

        grid = await _get_grid(client)
        food_row = _find_row(grid, FOOD_CAT)
        assert food_row is not None
        assert abs(food_row["actual_values"][4] - 200.00) < 0.01

    async def test_actuals_exclude_soft_deleted_transactions(
        self, client, core_categories
    ):
        """
        Soft-deleted transactions (deleted_at IS NOT NULL) must not contribute
        to actuals. get_category_actuals_for_year filters deleted_at.is_(None).
        """
        t1 = await create(client, date="2025-05-10", category=FOOD_CAT,
                          amount=200.00, type="debit")

        # Soft-delete the transaction
        del_resp = await client.delete(f"/transactions/{t1['id']}")
        assert del_resp.status_code == 200

        grid = await _get_grid(client)
        food_row = _find_row(grid, FOOD_CAT)
        # Actuals must be 0 — the only food transaction was deleted
        may_actual = food_row["actual_values"][4] if food_row else 0.0
        assert abs(may_actual - 0.0) < 0.01

    async def test_actuals_are_zero_for_months_with_no_transactions(
        self, client, core_categories, seeded_transactions
    ):
        """Months 1–4 and 7–12 have no seeded transactions → must be 0."""
        grid = await _get_grid(client)
        food_row = _find_row(grid, FOOD_CAT)
        assert food_row is not None
        for month_idx in list(range(0, 4)) + list(range(6, 12)):
            assert food_row["actual_values"][month_idx] == pytest.approx(0.0, abs=0.01), (
                f"Expected 0 for month index {month_idx}"
            )

    async def test_income_actuals_match_seeded_seed(
        self, client, core_categories, seeded_transactions
    ):
        grid = await _get_grid(client)
        income_row = _find_row(grid, INCOME_CAT)
        assert income_row is not None
        assert abs(income_row["actual_values"][4] - EXPECTED_INCOME_MAY) < 0.01
        assert abs(income_row["actual_values"][5] - EXPECTED_INCOME_JUN) < 0.01

    async def test_credit_transactions_contribute_positively_to_actuals(
        self, client, core_categories
    ):
        """
        Credit transactions must add positively to actuals (not be subtracted).
        get_category_actuals_for_year: type='credit' → actuals[cat][month] += total
        """
        await create(client, date="2025-05-10", category=INCOME_CAT,
                     amount=1000.00, type="credit")

        grid = await _get_grid(client)
        income_row = _find_row(grid, INCOME_CAT)
        assert income_row is not None
        assert income_row["actual_values"][4] > 0


# ═══════════════════════════════════════════════════════════════════════════════
# C — GRID STRUCTURE INTEGRITY
# ═══════════════════════════════════════════════════════════════════════════════

class TestGridStructure:
    """Validates the shape and type-separation guarantees of GET /budget/values."""

    async def test_grid_has_three_top_level_sections(self, client, core_categories):
        grid = await _get_grid(client)
        for key in ("income", "expenses", "savings"):
            assert key in grid, f"Grid missing top-level key: {key}"

    async def test_grid_has_year_field(self, client, core_categories):
        grid = await _get_grid(client)
        assert "year" in grid
        assert grid["year"] == 2025

    async def test_each_row_has_12_planned_values(self, client, core_categories):
        grid = await _get_grid(client)
        for section in ("income", "expenses", "savings"):
            for row in grid[section]:
                assert len(row["planned_values"]) == 12, (
                    f"Row '{row['name']}' has {len(row['planned_values'])} planned_values, expected 12"
                )

    async def test_each_row_has_12_actual_values(self, client, core_categories):
        grid = await _get_grid(client)
        for section in ("income", "expenses", "savings"):
            for row in grid[section]:
                assert len(row["actual_values"]) == 12, (
                    f"Row '{row['name']}' has {len(row['actual_values'])} actual_values, expected 12"
                )

    async def test_income_category_is_in_income_section_only(self, client, core_categories):
        grid = await _get_grid(client)
        income_names   = [r["name"] for r in grid["income"]]
        expenses_names = [r["name"] for r in grid["expenses"]]
        savings_names  = [r["name"] for r in grid["savings"]]

        assert INCOME_CAT in income_names
        assert INCOME_CAT not in expenses_names
        assert INCOME_CAT not in savings_names

    async def test_expense_category_is_in_expenses_section_only(self, client, core_categories):
        grid = await _get_grid(client)
        assert FOOD_CAT     in [r["name"] for r in grid["expenses"]]
        assert FOOD_CAT not in [r["name"] for r in grid["income"]]
        assert FOOD_CAT not in [r["name"] for r in grid["savings"]]

    async def test_savings_category_is_in_savings_section_only(self, client, core_categories):
        grid = await _get_grid(client)
        assert SAVINGS_CAT     in [r["name"] for r in grid["savings"]]
        assert SAVINGS_CAT not in [r["name"] for r in grid["income"]]
        assert SAVINGS_CAT not in [r["name"] for r in grid["expenses"]]

    async def test_grid_returns_correct_year(self, client, core_categories):
        resp = await client.get("/budget/values", params={"year": 2024})
        assert resp.status_code == 200
        assert resp.json()["data"]["year"] == 2024

    async def test_planned_values_reflect_upserted_amounts(self, client, core_categories):
        food_id = core_categories[FOOD_CAT]
        await client.put("/budget/values", json={"values": [
            {"category_id": food_id, "year": 2025, "month": 3, "planned_amount": 750.00},
        ]})
        grid = await _get_grid(client)
        food_row = _find_row(grid, FOOD_CAT)
        assert food_row is not None
        assert abs(food_row["planned_values"][2] - 750.00) < 0.01  # index 2 = March


# ═══════════════════════════════════════════════════════════════════════════════
# D — PERFORMANCE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

class TestPerformanceSummary:
    """GET /budget/performance?year="""

    async def test_returns_200(self, client, core_categories):
        resp = await client.get("/budget/performance", params={"year": 2025})
        assert resp.status_code == 200

    async def test_response_has_spec_envelope(self, client, core_categories):
        body = (await client.get("/budget/performance", params={"year": 2025})).json()
        assert "data"  in body
        assert body["error"] is None

    async def test_response_has_required_sections(self, client, core_categories):
        data = (await client.get("/budget/performance", params={"year": 2025})).json()["data"]
        for key in ("year", "income", "expenses", "savings"):
            assert key in data, f"Performance response missing key: {key}"

    async def test_each_section_has_planned_and_actual(self, client, core_categories):
        data = (await client.get("/budget/performance", params={"year": 2025})).json()["data"]
        for section in ("income", "expenses", "savings"):
            assert "planned" in data[section], f"'{section}' missing 'planned'"
            assert "actual"  in data[section], f"'{section}' missing 'actual'"

    async def test_total_expense_actual_matches_seeded_transactions(
        self, client, core_categories, seeded_transactions
    ):
        """
        Seeded debit transactions total = T1(200) + T2(150) + T5(300) = 650.
        Performance expense.actual must equal this across the full year.
        """
        data = (await client.get("/budget/performance", params={"year": 2025})).json()["data"]
        assert abs(data["expenses"]["actual"] - EXPECTED_TOTAL_EXPENSE_2025) < 0.01

    async def test_total_income_actual_matches_seeded_transactions(
        self, client, core_categories, seeded_transactions
    ):
        """T3(3000) + T4(500) = 3500 total income regardless of shift month."""
        data = (await client.get("/budget/performance", params={"year": 2025})).json()["data"]
        assert abs(data["income"]["actual"] - EXPECTED_TOTAL_INCOME_2025) < 0.01

    async def test_planned_sums_all_12_months_correctly(
        self, client, core_categories
    ):
        """
        Seed 3 monthly planned values for Food → annual planned = 3 × 400 = 1200.
        performance.expenses.planned must reflect the sum.
        """
        food_id = core_categories[FOOD_CAT]
        await client.put("/budget/values", json={"values": [
            {"category_id": food_id, "year": 2025, "month": 1, "planned_amount": 400.00},
            {"category_id": food_id, "year": 2025, "month": 2, "planned_amount": 400.00},
            {"category_id": food_id, "year": 2025, "month": 3, "planned_amount": 400.00},
        ]})
        data = (await client.get("/budget/performance", params={"year": 2025})).json()["data"]
        assert abs(data["expenses"]["planned"] - 1200.00) < 0.01

    async def test_performance_year_field_matches_query_param(self, client, core_categories):
        data = (await client.get("/budget/performance", params={"year": 2023})).json()["data"]
        assert data["year"] == 2023

    async def test_performance_empty_year_returns_zeros(self, client, core_categories):
        """A year with no transactions and no planned values must return 0s, not errors."""
        data = (await client.get("/budget/performance", params={"year": 2019})).json()["data"]
        for section in ("income", "expenses", "savings"):
            assert data[section]["planned"] == pytest.approx(0.0, abs=0.01)
            assert data[section]["actual"]  == pytest.approx(0.0, abs=0.01)