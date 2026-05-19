"""
Axis Finance — Transactions Test Suite
conftest.py: shared fixtures and helpers

HOW TO RUN (from backend/):
    pip install pytest httpx python-dateutil
    pytest tests/ -v
    pytest tests/test_transactions_mvp.py -v
    pytest tests/test_transactions_polish.py -v

AUTH NOTE:
    auth.py is not implemented yet. All routes hardcode fake_user_id internally.
    No headers or cookies needed — a plain client works for everything.
"""

import uuid
import pytest
import httpx
from datetime import date
from dateutil.relativedelta import relativedelta
from typing import Generator

BASE_URL = "http://localhost:3000/api/v1"
FAKE_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DEFAULT_CUTOFF_DAY = 20


# ── Helpers ────────────────────────────────────────────────────────────────────

def next_month_first(d: date) -> str:
    return (d.replace(day=1) + relativedelta(months=1)).strftime("%Y-%m-%d")


def make_txn(**overrides) -> dict:
    """Minimal valid debit transaction payload."""
    base = {
        "date": "2025-04-15",
        "category": "Food",
        "description": "Test transaction",
        "amount": 50.00,
        "type": "debit",
    }
    base.update(overrides)
    return base


def make_csv_bytes(rows: list, delimiter: str = ",") -> bytes:
    d = delimiter
    header = f"date{d}description{d}amount{d}type\n"
    lines = [f"{r['date']}{d}{r['description']}{d}{r['amount']}{d}{r['type']}\n" for r in rows]
    return (header + "".join(lines)).encode("utf-8")


def create(client: httpx.Client, **overrides) -> dict:
    """
    Setup helper: creates a transaction, returns data dict.
    Uses in (200, 201) so test setup doesn't fail on the status-code spec bug.
    """
    resp = client.post("/transactions", json=make_txn(**overrides))
    assert resp.status_code in (200, 201), f"Setup create failed: {resp.status_code} {resp.text}"
    return resp.json()["data"]


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    """
    Plain unauthenticated client.
    auth.py is empty — routes hardcode the fake user. No credentials needed.
    """
    with httpx.Client(base_url=BASE_URL, timeout=10.0, follow_redirects=True) as c:
        yield c


@pytest.fixture
def txn_ids(client):
    """Collects IDs created during a test and soft-deletes them on teardown."""
    ids = []
    yield ids
    for tid in ids:
        client.delete(f"/transactions/{tid}")


@pytest.fixture(scope="session")
def seed_dataset(client):
    """
    10-transaction canonical seed dataset for cross-module reuse.
    Two full months, both sides of the cutoff, multiple categories.
    """
    SEED = [
        {"date": "2025-04-15", "type": "credit", "amount":  3000.00, "category": "Income",        "description": "Payroll April"},
        {"date": "2025-04-20", "type": "credit", "amount":   500.00, "category": "Income",        "description": "Freelance April"},
        {"date": "2025-04-10", "type": "debit",  "amount": 1200.00, "category": "Housing",       "description": "Rent April"},
        {"date": "2025-04-12", "type": "debit",  "amount":   85.50, "category": "Food",          "description": "Walmart"},
        {"date": "2025-04-18", "type": "debit",  "amount":   15.99, "category": "Subscriptions", "description": "Netflix"},
        {"date": "2025-05-15", "type": "credit", "amount":  3000.00, "category": "Income",        "description": "Payroll May"},
        {"date": "2025-05-20", "type": "credit", "amount":   500.00, "category": "Income",        "description": "Freelance May"},
        {"date": "2025-05-05", "type": "debit",  "amount": 1200.00, "category": "Housing",       "description": "Rent May"},
        {"date": "2025-05-08", "type": "debit",  "amount":  120.00, "category": "Food",          "description": "Loblaws"},
        {"date": "2025-05-22", "type": "debit",  "amount":   60.00, "category": "Transportation","description": "Petro-Canada"},
    ]
    created = []
    for payload in SEED:
        resp = client.post("/transactions", json=payload)
        assert resp.status_code in (200, 201), f"Seed failed: {payload}"
        created.append(resp.json()["data"])
    yield created
    for txn in created:
        client.delete(f"/transactions/{txn['id']}")
