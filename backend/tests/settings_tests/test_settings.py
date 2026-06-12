# backend/tests/settings_tests/test_settings.py
"""
SETTINGS MODULE — Integration Test Suite
==========================================
Endpoints: GET /settings   PUT /settings

Test sections
  A  GET /settings     — returns current settings with correct defaults
  B  PUT /settings     — partial/full update, validation, response envelope
  C  Rollover          — mass recalculation triggered by cutoff_day / toggle changes
  D  System workflows  — cross-module consistency checks

Rollover recalculation logic (from service.py):
  • If shift_late_income changes OR income_cutoff_day changes → trigger
  • Toggle OFF: bulk-update ALL credits to effective_date=date, is_shifted=False
  • Toggle ON / cutoff changed:
      for each credit with shift_override=False:
        if date.day >= cutoff_day → is_shifted=True, effective_date = 1st of next month
        else                      → is_shifted=False, effective_date = date

Default settings (created by register and by client fixture):
  currency           = "CAD"
  shift_late_income  = True
  income_cutoff_day  = 20
"""

import pytest
from conftest import create


# ═══════════════════════════════════════════════════════════════════════════════
# A — GET /settings
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetSettings:
    """GET /settings"""

    async def test_returns_200(self, client):
        resp = await client.get("/settings")
        assert resp.status_code == 200

    async def test_response_has_spec_envelope(self, client):
        body = (await client.get("/settings")).json()
        assert "data"  in body
        assert body["error"] is None

    async def test_returns_required_fields(self, client):
        data = (await client.get("/settings")).json()["data"]
        for field in ("currency", "shift_late_income", "income_cutoff_day"):
            assert field in data, f"GET /settings missing field: {field}"

    async def test_default_currency_is_cad(self, client):
        data = (await client.get("/settings")).json()["data"]
        assert data["currency"] == "CAD"

    async def test_default_shift_late_income_is_true(self, client):
        data = (await client.get("/settings")).json()["data"]
        assert data["shift_late_income"] is True

    async def test_default_income_cutoff_day_is_20(self, client):
        data = (await client.get("/settings")).json()["data"]
        assert data["income_cutoff_day"] == 20

    async def test_unauthenticated_returns_401(self, anon_client):
        resp = await anon_client.get("/settings")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# B — PUT /settings
# ═══════════════════════════════════════════════════════════════════════════════

class TestUpdateSettings:
    """PUT /settings"""

    async def test_update_returns_200(self, client):
        resp = await client.put("/settings", json={"currency": "USD"})
        assert resp.status_code == 200

    async def test_response_has_spec_envelope(self, client):
        body = (await client.put("/settings", json={"currency": "USD"})).json()
        assert "data"  in body
        assert body["error"] is None

    async def test_response_has_meta_message(self, client):
        body = (await client.put("/settings", json={"currency": "USD"})).json()
        assert body.get("meta", {}).get("message") is not None

    async def test_update_currency_persists(self, client):
        await client.put("/settings", json={"currency": "USD"})
        data = (await client.get("/settings")).json()["data"]
        assert data["currency"] == "USD"

    async def test_update_income_cutoff_day_persists(self, client):
        await client.put("/settings", json={"income_cutoff_day": 15})
        data = (await client.get("/settings")).json()["data"]
        assert data["income_cutoff_day"] == 15

    async def test_update_shift_late_income_false_persists(self, client):
        await client.put("/settings", json={"shift_late_income": False})
        data = (await client.get("/settings")).json()["data"]
        assert data["shift_late_income"] is False

    async def test_partial_update_leaves_other_fields_unchanged(self, client):
        """PUT uses exclude_unset=True — only supplied fields should change."""
        await client.put("/settings", json={"currency": "GBP"})
        data = (await client.get("/settings")).json()["data"]
        # Fields not in the PUT payload must retain defaults
        assert data["shift_late_income"]  is True
        assert data["income_cutoff_day"]  == 20

    async def test_multiple_fields_update_together(self, client):
        await client.put("/settings", json={"currency": "EUR", "income_cutoff_day": 18})
        data = (await client.get("/settings")).json()["data"]
        assert data["currency"]           == "EUR"
        assert data["income_cutoff_day"]  == 18
        assert data["shift_late_income"]  is True  # not supplied → unchanged

    async def test_unauthenticated_returns_401(self, anon_client):
        resp = await anon_client.put("/settings", json={"currency": "USD"})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# C — ROLLOVER RECALCULATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestRolloverRecalculation:
    """
    Verifies that changing income_cutoff_day or shift_late_income triggers
    apply_mass_rollover_recalculation on all relevant credit transactions.

    Each test:
      1. Creates a credit transaction
      2. Mutates settings
      3. Reads the transaction back to verify recalculation occurred
    """

    async def test_lowering_cutoff_shifts_previously_unshifted_credit(self, client):
        """
        T1: credit on day 15, default cutoff=20 → NOT shifted.
        Lower cutoff to 14 → day 15 >= 14 → MUST be shifted.
        """
        t1 = await create(client, date="2025-05-15", type="credit", amount=1000.00)
        assert t1["is_shifted"] is False, "Precondition: day 15 < cutoff 20 → not shifted"

        await client.put("/settings", json={"income_cutoff_day": 14})

        updated = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert updated["is_shifted"]     is True
        assert updated["effective_date"] == "2025-06-01"

    async def test_raising_cutoff_unshifts_previously_shifted_credit(self, client):
        """
        T1: credit on day 20, cutoff=20 → IS shifted.
        Raise cutoff to 25 → day 20 < 25 → MUST be unshifted.
        """
        t1 = await create(client, date="2025-05-20", type="credit", amount=1000.00)
        assert t1["is_shifted"] is True, "Precondition: day 20 >= cutoff 20 → shifted"

        await client.put("/settings", json={"income_cutoff_day": 25})

        updated = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert updated["is_shifted"]     is False
        assert updated["effective_date"] == "2025-05-20"

    async def test_toggle_shift_off_resets_all_credits_to_date(self, client):
        """
        With shift OFF: ALL credits get effective_date = date, is_shifted = False,
        regardless of when they fall in the month.
        """
        t1 = await create(client, date="2025-05-20", type="credit", amount=500.00)
        t2 = await create(client, date="2025-05-25", type="credit", amount=800.00)

        assert t1["is_shifted"] is True
        assert t2["is_shifted"] is True

        await client.put("/settings", json={"shift_late_income": False})

        u1 = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        u2 = (await client.get(f"/transactions/{t2['id']}")).json()["data"]

        assert u1["is_shifted"]     is False
        assert u1["effective_date"] == "2025-05-20"
        assert u2["is_shifted"]     is False
        assert u2["effective_date"] == "2025-05-25"

    async def test_toggle_shift_on_reapplies_rollover_to_eligible_credits(self, client):
        """
        Toggle OFF then ON must re-apply the rule to eligible credits.
        T1 on day 20 should end up shifted again after toggling back ON.
        """
        t1 = await create(client, date="2025-05-20", type="credit", amount=1000.00)

        await client.put("/settings", json={"shift_late_income": False})
        u_off = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert u_off["is_shifted"] is False  # intermediate check

        await client.put("/settings", json={"shift_late_income": True})

        u_on = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert u_on["is_shifted"]     is True
        assert u_on["effective_date"] == "2025-06-01"

    async def test_shift_override_true_protects_transaction_from_recalculation(self, client):
        """
        Transactions with shift_override=True are excluded from mass recalculation
        (service query filters: shift_override == False).
        """
        # Create with override — should NOT be shifted despite day 22 >= cutoff 20
        t1 = await create(client, date="2025-05-22", type="credit",
                          amount=500.00, shift_override=True)
        assert t1["is_shifted"] is False, "shift_override=True suppresses rollover on create"

        # Raise cutoff to 28 — without override, day 22 < 28 would revert to unshifted.
        # With override, the transaction must be untouched.
        await client.put("/settings", json={"income_cutoff_day": 28})

        updated = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert updated["is_shifted"]     is False
        assert updated["effective_date"] == "2025-05-22"

    async def test_debit_transactions_never_affected_by_rollover_settings(self, client):
        """
        The rollover rule only applies to credit transactions.
        Debit transactions must be unchanged regardless of settings changes.
        """
        t1 = await create(client, date="2025-05-22", type="debit", amount=300.00)
        original_effective = t1["effective_date"]

        await client.put("/settings", json={"income_cutoff_day": 10})
        await client.put("/settings", json={"shift_late_income": False})

        updated = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert updated["effective_date"] == original_effective
        assert updated["is_shifted"]     is False

    async def test_december_credit_rolls_to_january_next_year(self, client):
        """
        December credit on day 25 (>= cutoff 20) must roll to Jan 1 of next year.
        The service has an explicit branch: month == 12 → year + 1, month = 1.
        """
        t1 = await create(client, date="2025-12-25", type="credit", amount=2000.00)
        assert t1["is_shifted"]     is True
        assert t1["effective_date"] == "2026-01-01"

        # Confirm recalculation preserves the Jan boundary when cutoff changes
        await client.put("/settings", json={"income_cutoff_day": 24})
        updated = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert updated["is_shifted"]     is True
        assert updated["effective_date"] == "2026-01-01"

    async def test_unchanged_settings_do_not_trigger_recalculation(self, client):
        """
        PUT /settings with the exact same values as current must not corrupt
        any transaction's effective_date (cutoff_changed = False → no trigger).
        """
        t1 = await create(client, date="2025-05-20", type="credit", amount=500.00)
        original_effective = t1["effective_date"]

        # PUT with same values as default — should be a no-op for recalculation
        await client.put("/settings", json={
            "income_cutoff_day": 20,
            "shift_late_income": True,
        })

        updated = (await client.get(f"/transactions/{t1['id']}")).json()["data"]
        assert updated["effective_date"] == original_effective


# ═══════════════════════════════════════════════════════════════════════════════
# D — SYSTEM WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════════

class TestSettingsSystemWorkflow:
    """Multi-step cross-module workflow tests."""

    @pytest.mark.xfail(reason="Mass recalculation pending")
    async def test_cutoff_change_reflected_in_budget_actuals(
        self, client, core_categories, seeded_transactions
    ):
        """
        SYSTEM TEST — changing income_cutoff_day must shift T4 into a different
        month, which must then be visible in the budget grid actuals.

        Canonical seed: T4 credit $500 on May 22 → shifted to June (cutoff=20).
        Raise cutoff to 23 → T4.day(22) < 23 → T4 reverts to May.
        May income actual must then be 3500 (T3 + T4), not 3000.
        """
        from conftest import INCOME_CAT, EXPECTED_INCOME_MAY

        # Confirm initial state: May income = 3000 (T4 shifted out)
        grid_before = (await client.get("/budget/values", params={"year": 2025})).json()["data"]
        income_row = next(
            r for r in grid_before["income"] if r["name"] == INCOME_CAT
        )
        assert abs(income_row["actual_values"][4] - EXPECTED_INCOME_MAY) < 0.01  # index 4 = May

        # Raise cutoff to 23 → T4 (day 22) no longer qualifies → stays in May
        await client.put("/settings", json={"income_cutoff_day": 23})

        grid_after = (await client.get("/budget/values", params={"year": 2025})).json()["data"]
        income_row_after = next(
            r for r in grid_after["income"] if r["name"] == INCOME_CAT
        )
        # May income should now include T3 (3000) + T4 (500) = 3500
        assert abs(income_row_after["actual_values"][4] - 3500.00) < 0.01