"""
STAGE 2 — WHITE-BOX TESTS
==========================
These tests use the API to create/modify data, then query PostgreSQL directly
to verify what was actually persisted — not just what the API reflects back.

Findings from reading the source that black-box couldn't catch:
  WB-BUG-01: func.now() assigned to deleted_at (code smell — verify DB value is correct)
  WB-BUG-02: get_transaction_summary() has no month/year filter — lifetime totals only
  WB-BUG-03: TransactionUpdate uses dt_date.today() (local time) vs
              TransactionCreate which correctly uses datetime.now(timezone.utc).date()

HOW TO RUN:
    pip install psycopg2-binary
    DB_PASSWORD=yourpassword pytest test_transactions_whitebox.py -v
"""

import os
import time
import uuid
import pytest
import httpx
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone, timedelta
from dotenv import dotenv_values

from conftest import make_txn, create, BASE_URL, FAKE_USER_ID

def _load_env_file() -> dict:
    """
    Parses ~/Desktop/Axis/.env and returns key-value pairs.
    Falls back to environment variables if the file isn't found.
    """
    env_path = os.path.join(os.path.expanduser('~'), 'Desktop', 'Axis', '.env')
    env: dict = {}
    try:
        with open(os.path.abspath(env_path)) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    env[key.strip()] = val.strip()
    except FileNotFoundError:
        pass
    return env

# Inside the Docker container, docker-compose injects all .env values as
# environment variables automatically — os.getenv() reads them directly.
# The dotenv fallback covers running the tests from outside the container.
_env = dotenv_values(os.path.expanduser("~/Desktop/Axis/.env"))

DB_CONFIG = {
    "host": "database",   # Docker service name — correct inside the container
    "port": 5432,
    "dbname":   os.getenv("DB_NAME",     _env.get("DB_NAME",     "axis_finance")),
    "user":     os.getenv("DB_USER",     _env.get("DB_USER",     "kabelo")),
    "password": os.getenv("DB_PASSWORD", _env.get("DB_PASSWORD", "")),
}


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10.0, follow_redirects=True) as c:
        yield c


@pytest.fixture(scope="session")
def db():
    """
    Direct synchronous psycopg2 connection to Postgres.
    Skips the entire suite if DB_PASSWORD is not set.
    """
    if not DB_CONFIG["password"]:
        pytest.skip("DB_PASSWORD not found in .env. Make sure ~/Desktop/Axis/.env has DB_PASSWORD=...")

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.fixture
def txn_ids(client):
    ids = []
    yield ids
    for tid in ids:
        client.delete(f"/transactions/{tid}")


# ── DB query helpers ───────────────────────────────────────────────────────────

def db_fetch(db, tx_id: str) -> dict | None:
    """Fetches a row directly from Postgres — including soft-deleted rows."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM transactions WHERE id = %s", (tx_id,))
        return cur.fetchone()


def db_fetch_active(db, tx_id: str) -> dict | None:
    """Fetches only non-deleted rows."""
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM transactions WHERE id = %s AND deleted_at IS NULL",
            (tx_id,)
        )
        return cur.fetchone()


# ══════════════════════════════════════════════════════════════════════════════
class TestDatabasePersistence:
    """Verify that API writes land in the DB with correct values."""

    def test_created_transaction_exists_in_db(self, client, db, txn_ids):
        data = create(client, description="DB persistence check")
        txn_ids.append(data["id"])
        assert db_fetch_active(db, data["id"]) is not None

    def test_all_core_fields_persisted_correctly(self, client, db, txn_ids):
        data = create(client, date="2025-04-15", category="Food",
                      description="Field persistence test", amount=75.50, type="debit")
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert row is not None
        assert str(row["user_id"]) == str(FAKE_USER_ID)
        assert str(row["date"]) == "2025-04-15"
        assert row["category"] == "Food"
        assert row["description"] == "Field persistence test"
        assert float(row["amount"]) == pytest.approx(75.50)
        assert row["type"] == "debit"

    def test_rollover_fields_persisted_for_shifted_credit(self, client, db, txn_ids):
        """
        is_shifted and effective_date must be stored in the DB — not computed on read.
        Proves the rollover is durable, not ephemeral.
        """
        data = create(client, date="2025-05-20", type="credit", amount=3000.00)
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert row["is_shifted"] is True,          "is_shifted must be TRUE in DB"
        assert str(row["effective_date"]) == "2025-06-01", \
            "effective_date must be 2025-06-01 in DB"
        assert str(row["date"]) == "2025-05-20",   "original date must be preserved in DB"

    def test_rollover_fields_persisted_for_unshifted_credit(self, client, db, txn_ids):
        data = create(client, date="2025-05-19", type="credit", amount=3000.00)
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert row["is_shifted"] is False
        assert str(row["effective_date"]) == "2025-05-19"

    def test_debit_never_shifted_in_db(self, client, db, txn_ids):
        data = create(client, date="2025-05-20", type="debit", amount=500.00)
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert row["is_shifted"] is False
        assert str(row["effective_date"]) == "2025-05-20"

    def test_manual_transaction_has_null_import_fields(self, client, db, txn_ids):
        """import_source and import_batch_id must be NULL for manual entries."""
        data = create(client)
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert row["import_source"] is None,    "import_source must be NULL"
        assert row["import_batch_id"] is None,  "import_batch_id must be NULL"

    def test_amount_precision_preserved_in_db(self, client, db, txn_ids):
        """Decimal(12,2) — cents must survive the round-trip without drift."""
        data = create(client, amount=99.99)
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert float(row["amount"]) == pytest.approx(99.99, abs=0.001)

    def test_shift_override_true_persisted_and_suppresses_shift(self, client, db, txn_ids):
        data = create(client, date="2025-05-20", type="credit",
                      amount=1000.00, shift_override=True)
        txn_ids.append(data["id"])

        row = db_fetch_active(db, data["id"])
        assert row["shift_override"] is True
        assert row["is_shifted"] is False


# ══════════════════════════════════════════════════════════════════════════════
class TestSoftDeletePersistence:
    """
    Soft delete must set deleted_at on the row — not remove it.
    Also validates WB-BUG-01: func.now() assigned in service.py.
    """

    def test_soft_delete_row_still_exists_in_db(self, client, db):
        data = create(client, description="Soft delete DB check")
        client.delete(f"/transactions/{data['id']}")

        row = db_fetch(db, data["id"])  # includes deleted rows
        assert row is not None, "Row must still exist after soft delete — not hard deleted"

    def test_soft_delete_sets_deleted_at_not_null(self, client, db):
        data = create(client)
        client.delete(f"/transactions/{data['id']}")

        row = db_fetch(db, data["id"])
        assert row["deleted_at"] is not None, \
            "deleted_at must be set — WB-BUG-01: func.now() must resolve to a real timestamp"

    def test_deleted_at_is_a_recent_datetime(self, client, db):
        """
        WB-BUG-01 verification: service.py assigns `tx.deleted_at = func.now()`.
        func.now() is a SQLAlchemy expression object — but SQLAlchemy converts it
        to SQL NOW() in the UPDATE statement, so the DB gets a real timestamp.
        This test confirms the DB value is a proper recent datetime.

        Recommendation: replace with `datetime.now(timezone.utc)` for explicitness.
        """
        before = datetime.now(timezone.utc) - timedelta(seconds=5)
        data = create(client)
        client.delete(f"/transactions/{data['id']}")

        row = db_fetch(db, data["id"])
        deleted_at = row["deleted_at"]

        assert deleted_at is not None
        assert isinstance(deleted_at, datetime), \
            "deleted_at must be a Python datetime, not a string or expression object"

        # Make timezone-aware for comparison
        if deleted_at.tzinfo is None:
            deleted_at = deleted_at.replace(tzinfo=timezone.utc)
        assert deleted_at >= before, "deleted_at must be a recent timestamp"

    def test_soft_deleted_row_data_intact(self, client, db):
        """All other fields must be untouched after soft delete."""
        data = create(client, description="Integrity check", category="Food")
        client.delete(f"/transactions/{data['id']}")

        row = db_fetch(db, data["id"])
        assert row["description"] == "Integrity check"
        assert row["category"] == "Food"
        assert str(row["user_id"]) == str(FAKE_USER_ID)


# ══════════════════════════════════════════════════════════════════════════════
class TestUpdatePersistence:
    """PUT changes must be durable in the DB, including rollover recalculation."""

    def test_description_update_persists(self, client, db, txn_ids):
        data = create(client, description="Before")
        txn_ids.append(data["id"])

        client.put(f"/transactions/{data['id']}", json={"description": "After"})

        assert db_fetch_active(db, data["id"])["description"] == "After"

    def test_updated_at_changes_after_put(self, client, db, txn_ids):
        """
        The model has `onupdate=func.now()` on updated_at.
        Verify this actually fires and writes a newer timestamp.
        """
        data = create(client)
        txn_ids.append(data["id"])
        original = db_fetch_active(db, data["id"])["updated_at"]

        time.sleep(1)
        client.put(f"/transactions/{data['id']}", json={"description": "Trigger updated_at"})

        updated = db_fetch_active(db, data["id"])["updated_at"]
        assert updated > original, \
            "updated_at must be newer in DB after PUT — onupdate=func.now() must fire"

    def test_rollover_recalculation_persists_to_db(self, client, db, txn_ids):
        """Moving a credit from day 15 → day 20 must recalculate AND persist rollover fields."""
        data = create(client, date="2025-05-15", type="credit", amount=1000.00)
        txn_ids.append(data["id"])
        assert db_fetch_active(db, data["id"])["is_shifted"] is False  # baseline

        client.put(f"/transactions/{data['id']}", json={"date": "2025-05-20"})

        row = db_fetch_active(db, data["id"])
        assert row["is_shifted"] is True,              "is_shifted must be TRUE in DB"
        assert str(row["effective_date"]) == "2025-06-01", "effective_date must update in DB"
        assert str(row["date"]) == "2025-05-20"

    def test_shift_override_update_persists_and_unshifts(self, client, db, txn_ids):
        data = create(client, date="2025-05-20", type="credit", amount=1000.00)
        txn_ids.append(data["id"])
        assert db_fetch_active(db, data["id"])["is_shifted"] is True  # baseline

        client.put(f"/transactions/{data['id']}", json={"shift_override": True})

        row = db_fetch_active(db, data["id"])
        assert row["shift_override"] is True
        assert row["is_shifted"] is False
        assert str(row["effective_date"]) == "2025-05-20"

    def test_partial_update_leaves_other_fields_unchanged(self, client, db, txn_ids):
        """model_dump(exclude_unset=True) must not zero out untouched fields."""
        data = create(client, category="Food", amount=150.00, description="Partial test")
        txn_ids.append(data["id"])

        client.put(f"/transactions/{data['id']}", json={"description": "Only this"})

        row = db_fetch_active(db, data["id"])
        assert row["category"] == "Food"
        assert float(row["amount"]) == pytest.approx(150.00)


# ══════════════════════════════════════════════════════════════════════════════
class TestSummaryImplementation:
    """
    WB-BUG-02: get_transaction_summary() has no date filter.
    It aggregates ALL non-deleted transactions for the user — lifetime totals only.
    Month-scoped budgeting is impossible until month/year params are added.
    """

    def test_summary_is_lifetime_not_monthly(self, client, db, txn_ids):
        """Credits from two different years must both appear in summary."""
        d1 = create(client, date="2023-01-10", type="credit", amount=1000.00)
        d2 = create(client, date="2025-06-10", type="credit", amount=2000.00)
        txn_ids.extend([d1["id"], d2["id"]])

        summary = client.get("/transactions/summary").json()["data"]
        assert float(summary["total_income"]) >= 3000.00, \
            "Lifetime summary must include transactions from all years"

    def test_summary_excludes_soft_deleted(self, client, db, txn_ids):
        before = float(client.get("/transactions/summary").json()["data"]["total_expenses"])

        data = create(client, type="debit", amount=500.00)
        after_add = float(client.get("/transactions/summary").json()["data"]["total_expenses"])
        client.delete(f"/transactions/{data['id']}")
        after_del = float(client.get("/transactions/summary").json()["data"]["total_expenses"])

        assert after_add > before
        assert after_del < after_add

    def test_summary_matches_direct_db_calculation(self, client, db):
        """Cross-check: manually aggregate from DB and compare to API response."""
        summary = client.get("/transactions/summary").json()["data"]

        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT type, SUM(amount) as total
                FROM transactions
                WHERE user_id = %s AND deleted_at IS NULL
                GROUP BY type
            """, (str(FAKE_USER_ID),))
            rows = {r["type"]: float(r["total"]) for r in cur.fetchall()}

        db_income   = rows.get("credit", 0.0)
        db_expenses = rows.get("debit",  0.0)

        assert float(summary["total_income"])   == pytest.approx(db_income,   abs=0.01)
        assert float(summary["total_expenses"]) == pytest.approx(db_expenses, abs=0.01)
        assert float(summary["net_flow"])       == pytest.approx(db_income - db_expenses, abs=0.01)

    def test_amounts_stored_as_positive_in_db(self, client, db, txn_ids):
        """
        Schema enforces gt=0 — amounts are always positive regardless of type.
        The type field carries debit/credit semantics, not the amount sign.
        """
        d1 = create(client, type="credit", amount=500.00)
        d2 = create(client, type="debit",  amount=200.00)
        txn_ids.extend([d1["id"], d2["id"]])

        assert float(db_fetch_active(db, d1["id"])["amount"]) > 0
        assert float(db_fetch_active(db, d2["id"])["amount"]) > 0


# ══════════════════════════════════════════════════════════════════════════════
class TestCodeReviewFindings:
    """Source-only findings, documented for traceability."""

    def test_wb_bug_01_deleted_at_is_real_datetime(self, client, db):
        """
        service.py: `tx.deleted_at = func.now()`
        func.now() is a SQLAlchemy ColumnElement. SQLAlchemy resolves it to
        SQL NOW() on commit, so the DB gets a real timestamp — but tx in Python
        memory is unusable after this without a db.refresh().
        Recommendation: use `datetime.now(timezone.utc)` for clarity.
        """
        data = create(client)
        client.delete(f"/transactions/{data['id']}")

        row = db_fetch(db, data["id"])
        assert row["deleted_at"] is not None
        assert isinstance(row["deleted_at"], datetime), \
            "DB deleted_at must be a real datetime — func.now() must have resolved correctly"

    def test_wb_bug_03_update_rejects_future_dates(self, client):
        """
        TransactionUpdate uses dt_date.today() (local time).
        TransactionCreate uses datetime.now(timezone.utc).date() (UTC).
        Both must reject future dates — inconsistency is a maintenance risk.
        Recommendation: standardise TransactionUpdate to use UTC.
        """
        future = "2099-01-01"
        assert client.post("/transactions", json=make_txn(date=future)).status_code in (400, 422)

        data = create(client)
        resp = client.put(f"/transactions/{data['id']}", json={"date": future})
        assert resp.status_code in (400, 422), "TransactionUpdate must also reject future dates"
        client.delete(f"/transactions/{data['id']}")

    def test_positive_only_amounts_schema_design(self, client, db, txn_ids):
        """
        The spec describes debits as negative, but the schema enforces amount > 0.
        The type field carries the sign semantics. Document this for future devs.
        """
        assert client.post("/transactions", json=make_txn(amount=-50.00)).status_code in (400, 422)
        data = create(client, type="debit", amount=50.00)
        txn_ids.append(data["id"])
        assert float(db_fetch_active(db, data["id"])["amount"]) == pytest.approx(50.00)
