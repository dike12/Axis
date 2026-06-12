"""
TIER 1 — MVP TESTS
==================
A failure here = something is broken or unusable for daily use.
Fix these before anything in Tier 2.

Known spec violations surfaced intentionally:
  - BUG-01: POST /transactions returns 200, spec requires 201
  - BUG-02: 404 responses return {"detail": "..."}, spec requires {"data": null, "error": {...}}
  - BUG-03: GET /transactions/summary has no month/year params (spec requires them)

Run:
    pytest tests/test_transactions_mvp.py -v
"""

import pytest
import httpx
from datetime import date

from conftest import make_txn, next_month_first, create, FAKE_USER_ID


# ══════════════════════════════════════════════════════════════════════════════
class TestResponseEnvelope:
    """The data/error envelope contract. Everything downstream depends on this."""

    async def test_success_response_has_data_field(self, client, txn_ids):
        resp = await client.post("/transactions", json=make_txn())
        body = resp.json()
        # Register for cleanup regardless of status
        if body.get("data") and body["data"].get("id"):
            txn_ids.append(body["data"]["id"])
        assert "data" in body
        assert body.get("error") is None

    async def test_error_response_has_error_field(self, client):
        """
        BUG-02: FastAPI HTTPException returns {"detail": "..."} not the spec envelope.
        This test will FAIL until router error handling is standardised.
        """
        resp = await client.get("/transactions/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404
        body = resp.json()
        assert body.get("data") is None, "error response must have data=null"
        assert "error" in body, "error response must have an 'error' field (not 'detail')"
        assert "code" in body["error"]
        assert "message" in body["error"]


# ══════════════════════════════════════════════════════════════════════════════
class TestCreateTransaction:
    """POST /transactions"""

    async def test_create_returns_201(self, client, txn_ids):
        """
        BUG-01: router has no status_code=201 on the decorator, so this returns 200.
        This test will FAIL until @router.post("/", status_code=201) is added.
        """
        resp = await client.post("/transactions", json=make_txn())
        body = resp.json()
        if body.get("data") and body["data"].get("id"):
            txn_ids.append(body["data"]["id"])
        assert resp.status_code == 201

    async def test_create_debit_effective_date_equals_date(self, client, txn_ids):
        data = await create(client, date="2025-05-20", type="debit", amount=100.00)
        txn_ids.append(data["id"])
        assert data["effective_date"] == "2025-05-20"
        assert data["is_shifted"] is False

    async def test_create_credit_before_cutoff_not_shifted(self, client, txn_ids):
        data = await create(client, date="2025-05-15", type="credit", amount=3000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is False
        assert data["effective_date"] == "2025-05-15"

    async def test_response_includes_all_required_fields(self, client, txn_ids):
        data = await create(client)
        txn_ids.append(data["id"])
        required = [
            "id", "user_id", "date", "effective_date", "category", "description",
            "amount", "type", "is_shifted", "shift_override", "import_source",
            "import_batch_id", "created_at", "updated_at",
        ]
        for field in required:
            assert field in data, f"Missing field: '{field}'"


# ══════════════════════════════════════════════════════════════════════════════
class TestCoreRolloverLogic:
    """
    The most critical business logic.
    Rule: credit with date.day >= 20 → effective_date = 1st of next month, is_shifted = True
    """

    async def test_credit_day_19_not_shifted(self, client, txn_ids):
        data = await create(client, date="2025-05-19", type="credit", amount=3000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is False
        assert data["effective_date"] == "2025-05-19"

    async def test_credit_day_20_is_shifted(self, client, txn_ids):
        """Cutoff is inclusive — day 20 MUST shift."""
        data = await create(client, date="2025-05-20", type="credit", amount=3000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is True
        assert data["effective_date"] == next_month_first(date(2025, 5, 20))

    async def test_credit_day_21_is_shifted(self, client, txn_ids):
        data = await create(client, date="2025-05-21", type="credit", amount=3000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is True
        assert data["effective_date"] == next_month_first(date(2025, 5, 21))

    async def test_debit_day_20_never_shifted(self, client, txn_ids):
        """Debits are NEVER shifted, even exactly on the cutoff day."""
        data = await create(client, date="2025-05-20", type="debit", amount=500.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is False
        assert data["effective_date"] == "2025-05-20"

    async def test_shift_override_prevents_rollover(self, client, txn_ids):
        """shift_override=True on a cutoff-day credit must suppress the shift."""
        data = await create(client, date="2025-05-20", type="credit", amount=3000.00, shift_override=True)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is False
        assert data["effective_date"] == "2025-05-20"
        assert data["shift_override"] is True

    async def test_credit_day_1_not_shifted(self, client, txn_ids):
        """Far below cutoff — sanity check."""
        data = await create(client, date="2025-05-01", type="credit", amount=3000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is False
        assert data["effective_date"] == "2025-05-01"


# ══════════════════════════════════════════════════════════════════════════════
class TestListTransactions:
    """GET /transactions"""

    async def test_created_transaction_appears_in_list(self, client, txn_ids):
        data = await create(client, description="List visibility check")
        txn_ids.append(data["id"])
        ids = [t["id"] for t in (await client.get("/transactions")).json()["data"]]
        assert data["id"] in ids

    async def test_no_match_returns_200_with_empty_list(self, client):
        resp = await client.get("/transactions", params={"category": "NoSuchCategoryXYZ"})
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_soft_deleted_transaction_absent_from_list(self, client):
        data = await create(client, description="Will be deleted")
        tid = data["id"]
        await client.delete(f"/transactions/{tid}")
        ids = [t["id"] for t in (await client.get("/transactions")).json()["data"]]
        assert tid not in ids

    async def test_filter_by_type_only_returns_that_type(self, client, txn_ids):
        data = await create(client, type="credit", amount=500.00)
        txn_ids.append(data["id"])
        results = (await client.get("/transactions", params={"type": "credit"})).json()["data"]
        for t in results:
            assert t["type"] == "credit"

    async def test_response_has_meta_with_total_count(self, client):
        resp = await client.get("/transactions")
        assert resp.status_code == 200
        meta = resp.json().get("meta", {})
        assert "total_count" in meta, "meta must include total_count"


# ══════════════════════════════════════════════════════════════════════════════
class TestGetTransaction:
    """GET /transactions/:id"""

    async def test_get_returns_correct_transaction(self, client, txn_ids):
        data = await create(client, description="Fetch me directly")
        txn_ids.append(data["id"])
        resp = await client.get(f"/transactions/{data['id']}")
        assert resp.status_code == 200
        assert resp.json()["data"]["description"] == "Fetch me directly"

    async def test_nonexistent_id_returns_404(self, client):
        resp = await client.get("/transactions/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404

    async def test_deleted_transaction_returns_404(self, client):
        data = await create(client)
        await client.delete(f"/transactions/{data['id']}")
        assert (await client.get(f"/transactions/{data['id']}")).status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
class TestUpdateTransaction:
    """PUT /transactions/:id"""

    async def test_update_description(self, client, txn_ids):
        data = await create(client, description="Original")
        txn_ids.append(data["id"])
        resp = await client.put(f"/transactions/{data['id']}", json={"description": "Updated"})
        assert resp.status_code == 200
        assert resp.json()["data"]["description"] == "Updated"

    async def test_moving_credit_date_to_cutoff_triggers_shift(self, client, txn_ids):
        """Changing date from day 15 → day 20 on a credit must cause it to shift."""
        data = await create(client, date="2025-05-15", type="credit", amount=1000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is False  # baseline

        resp = await client.put(f"/transactions/{data['id']}", json={"date": "2025-05-20"})
        assert resp.status_code == 200
        updated = resp.json()["data"]
        assert updated["is_shifted"] is True
        assert updated["effective_date"] == "2025-06-01"

    async def test_shift_override_true_unshifts_existing_shifted_credit(self, client, txn_ids):
        data = await create(client, date="2025-05-20", type="credit", amount=1000.00)
        txn_ids.append(data["id"])
        assert data["is_shifted"] is True  # baseline

        resp = await client.put(f"/transactions/{data['id']}", json={"shift_override": True})
        assert resp.status_code == 200
        updated = resp.json()["data"]
        assert updated["is_shifted"] is False
        assert updated["effective_date"] == "2025-05-20"

    async def test_update_nonexistent_returns_404(self, client):
        resp = await client.put("/transactions/00000000-0000-0000-0000-000000000000", json={"description": "Ghost"})
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
class TestDeleteTransaction:
    """DELETE /transactions/:id"""

    async def test_delete_returns_success(self, client):
        data = await create(client)
        resp = await client.delete(f"/transactions/{data['id']}")
        assert resp.status_code in (200, 204)

    async def test_deleted_transaction_gone_from_list(self, client):
        data = await create(client, description="Disappearing act")
        await client.delete(f"/transactions/{data['id']}")
        ids = [t["id"] for t in (await client.get("/transactions")).json()["data"]]
        assert data["id"] not in ids

    async def test_delete_nonexistent_returns_404(self, client):
        resp = await client.delete("/transactions/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
class TestSummaryEndpoint:
    """
    GET /transactions/summary

    BUG-03: Endpoint has no month/year params. Month-scoped tests are in Tier 2
    and will fail until params are added. These MVP tests only check structure
    and arithmetic correctness.
    """

    async def test_summary_returns_required_fields(self, client):
        resp = await client.get("/transactions/summary", params={"month": 5, "year": 2025})
        assert resp.status_code == 200
        data = resp.json()["data"]
        for field in ("total_income", "total_expenses", "net_flow"):
            assert field in data, f"Summary missing field: '{field}'"

    async def test_summary_net_flow_equals_income_minus_expenses(self, client):
        resp = await client.get("/transactions/summary", params={"month": 5, "year": 2025})
        assert resp.status_code == 200
        data = resp.json()["data"]
        income = float(data["total_income"])
        expenses = float(data["total_expenses"])
        net = float(data["net_flow"])
        assert net == pytest.approx(income - expenses, abs=0.01), \
            "net_flow must equal total_income - total_expenses"

    async def test_summary_totals_increase_after_adding_transactions(self, client, txn_ids):
        """Adding a debit increases total_expenses; adding a credit increases total_income."""
        before = (await client.get("/transactions/summary", params={"month": 5, "year": 2025})).json()["data"]

        d1 = await create(client, type="debit", amount=200.00, date="2025-05-10")
        d2 = await create(client, type="credit", amount=500.00, date="2025-05-10")
        txn_ids.extend([d1["id"], d2["id"]])

        after = (await client.get("/transactions/summary", params={"month": 5, "year": 2025})).json()["data"]
        assert float(after["total_expenses"]) > float(before["total_expenses"])
        assert float(after["total_income"]) > float(before["total_income"])


# ══════════════════════════════════════════════════════════════════════════════
class TestRequiredFieldValidation:
    """Missing required fields must return 422, not 500."""

    @pytest.mark.parametrize("missing_field", ["date", "category", "description", "amount", "type"])
    async def test_missing_field_returns_422(self, client, missing_field):
        payload = make_txn()
        del payload[missing_field]
        resp = await client.post("/transactions", json=payload)
        assert resp.status_code == 422, \
            f"Expected 422 when '{missing_field}' is missing, got {resp.status_code}"


# ══════════════════════════════════════════════════════════════════════════════
class TestCSVImport:
    """
    CSV import endpoints (POST /import/csv and /import/confirm) are not yet
    registered in the router. All tests here are skipped until they exist.
    """

    @pytest.mark.skip(reason="CSV import endpoints not in router.py yet")
    async def test_csv_upload_returns_preview_and_batch_id(self, client):
        pass

    @pytest.mark.skip(reason="CSV import endpoints not in router.py yet")
    async def test_csv_confirm_imports_rows(self, client):
        pass

    @pytest.mark.skip(reason="CSV import endpoints not in router.py yet")
    async def test_csv_import_applies_rollover(self, client):
        pass
