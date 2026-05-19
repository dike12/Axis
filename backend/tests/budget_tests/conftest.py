"""
conftest.py — Shared fixtures and constants for Axis Finance budget black-box tests.

All test data is prefixed with TEST_PREFIX so it is identifiable in the shared DB.
Seeded rows are cleaned up at session teardown (best-effort).
"""

import pytest
import httpx

# ─── Connection ───────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:3000/api/v1"
TEST_USER_ID = "11111111-1111-1111-1111-111111111111"

# Prefix for transaction descriptions (underscores fine — description has no pattern check)
TEST_PREFIX = "TESTBUDGET_"

# ── Category name constants ────────────────────────────────────────────────────
# Transaction schema enforces "no special characters" on the category field (spec 7.3).
# Pattern appears to be ^[A-Za-z0-9 ]+$ — underscores are NOT allowed.
# These purely-alphabetical names pass the pattern and are used by both
# core_categories (budget category creation) and seeded_transactions (transaction creation).
FOOD_CAT    = "TbFood"
INCOME_CAT  = "TbIncome"
SAVINGS_CAT = "TbSavings"

# ─── Auth ─────────────────────────────────────────────────────────────────────
# Auth is not yet implemented on the server.
# When a session mechanism is added, configure it here once — all fixtures
# and tests will inherit it automatically.
#
#   Header-based:  AUTH_HEADERS = {"X-User-Id": TEST_USER_ID}
#   Cookie-based:  AUTH_COOKIES = {"session": "<signed-jwt>"}
#
AUTH_HEADERS: dict = {}
AUTH_COOKIES: dict = {}

# ─── Expected actuals (derived from the seeded transaction set) ───────────────
#
#   T1  debit   2025-05-10   TbFood    200   effective_date = 2025-05-10  (no shift)
#   T2  debit   2025-05-15   TbFood    150   effective_date = 2025-05-15  (no shift)
#   T3  credit  2025-05-10   TbIncome  3000  effective_date = 2025-05-10  (before cutoff)
#   T4  credit  2025-05-22   TbIncome  500   effective_date = 2025-06-01  (>= 20th → SHIFTED)
#   T5  debit   2025-06-05   TbFood    300   effective_date = 2025-06-05  (no shift)
#   Note: schema requires amount > 0; sign is carried by the type field.
#
EXPECTED_FOOD_MAY             = 350.00   # T1(200) + T2(150)
EXPECTED_INCOME_MAY           = 3000.00  # T3 only  — T4 shifted out of May
EXPECTED_INCOME_JUN           = 500.00   # T4 shifted into June
EXPECTED_FOOD_JUN             = 300.00   # abs(T5)
EXPECTED_TOTAL_INCOME_2025    = 3500.00  # T3 + T4  (3000 + 500)
EXPECTED_TOTAL_EXPENSE_2025   = 650.00   # T1 + T2 + T5  (200 + 150 + 300)


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    """
    Session-scoped synchronous httpx client pointed at the live Docker server.
    One client for the entire test run — keeps connection pooling efficient.
    """
    with httpx.Client(
        base_url=BASE_URL,
        headers=AUTH_HEADERS,
        cookies=AUTH_COOKIES,
        timeout=15.0,
        follow_redirects=True,   # FastAPI 307-redirects requests missing trailing slashes
    ) as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY SEEDER
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def core_categories(client):
    """
    Creates the three canonical test categories needed for actuals and
    performance tests. Deletes them at session teardown (best-effort —
    deletion will be blocked by the spec guard if budget_values rows exist,
    which is acceptable for a shared persistent DB).

    Yields:
        dict mapping category name → category UUID string
        e.g. { "TbFood": "abc-123", ... }
    """
    definitions = [
        {"name": FOOD_CAT,    "type": "expense", "icon": "🍔", "is_fixed": False, "sort_order": 10},
        {"name": INCOME_CAT,  "type": "income",  "icon": "💰", "is_fixed": False, "sort_order": 11},
        {"name": SAVINGS_CAT, "type": "savings", "icon": "🏦", "is_fixed": False, "sort_order": 12},
    ]
    created: dict[str, str] = {}

    for cat in definitions:
        r = client.post("/budget/categories", json=cat)
        assert r.status_code in (200, 201), (
            f"[SEEDER] Failed to create category '{cat['name']}' — "
            f"HTTP {r.status_code}: {r.text}"
        )
        body = r.json()
        # Unwrap envelope ({ data: {...} }) or use the raw body
        cat_data = body["data"] if isinstance(body.get("data"), dict) else body
        created[cat["name"]] = cat_data["id"]

    yield created

    # Teardown — best-effort; silently ignored if guard blocks it
    for cat_id in created.values():
        client.delete(f"/budget/categories/{cat_id}")


# ─────────────────────────────────────────────────────────────────────────────
# TRANSACTION SEEDER
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def seeded_transactions(client, core_categories):
    """
    Seeds 5 transactions with fully deterministic dates, amounts, and
    rollover behaviour. Each description starts with TEST_PREFIX for
    easy identification in the DB.

    The rollover rule (spec §4.1) is central to tests B6 and B7:
      T4 is a credit on May 22 (>= 20th) → effective_date becomes 2025-06-01.

    Soft-deletes all seeded rows at session teardown via DELETE /transactions/:id.

    Yields:
        list of transaction UUID strings (in seed order T1→T5)
    """
    # Transaction schema requires amount > 0 (sign is carried by the `type` field).
    # Category names must be purely alphanumeric — no underscores (spec §7.3 pattern check).
    payloads = [
        # T1 — debit May 10, TbFood, 200 → effective May 10 (no shift, debit)
        dict(
            date="2025-05-10", amount=200.00, category=FOOD_CAT,
            description=f"{TEST_PREFIX}grocery_1",
            type="debit", shift_override=False,
        ),
        # T2 — debit May 15, TbFood, 150 → effective May 15 (no shift, debit)
        dict(
            date="2025-05-15", amount=150.00, category=FOOD_CAT,
            description=f"{TEST_PREFIX}grocery_2",
            type="debit", shift_override=False,
        ),
        # T3 — credit May 10, TbIncome, 3000 → effective May 10 (before cutoff)
        dict(
            date="2025-05-10", amount=3000.00, category=INCOME_CAT,
            description=f"{TEST_PREFIX}salary_may",
            type="credit", shift_override=False,
        ),
        # T4 — credit May 22, TbIncome, 500 → effective June 1 (>= 20th → SHIFTED)
        dict(
            date="2025-05-22", amount=500.00, category=INCOME_CAT,
            description=f"{TEST_PREFIX}bonus_shifted",
            type="credit", shift_override=False,
        ),
        # T5 — debit Jun 5, TbFood, 300 → effective Jun 5 (no shift, debit)
        dict(
            date="2025-06-05", amount=300.00, category=FOOD_CAT,
            description=f"{TEST_PREFIX}grocery_june",
            type="debit", shift_override=False,
        ),
    ]

    tx_ids: list[str] = []
    for payload in payloads:
        r = client.post("/transactions", json=payload)
        assert r.status_code in (200, 201), (
            f"[SEEDER] Failed to seed '{payload['description']}' — "
            f"HTTP {r.status_code}: {r.text}"
        )
        body = r.json()
        tx_data = body["data"] if isinstance(body.get("data"), dict) else body
        tx_ids.append(tx_data["id"])

    yield tx_ids

    # Teardown — soft-delete every seeded transaction
    for tx_id in tx_ids:
        client.delete(f"/transactions/{tx_id}")