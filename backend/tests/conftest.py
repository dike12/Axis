# backend/tests/conftest.py
"""
Global test configuration — Axis Finance backend test suite.

Architecture
------------
All tests use an async ASGI transport client rather than a live server.
Every test function receives its own DB transaction that rolls back on exit,
providing complete isolation with zero explicit teardown code.

Client fixtures
  client      — JWT-authenticated (axis_session cookie present)
  anon_client — no cookie, for testing /auth/* endpoints directly

Cache management
  clear_budget_cache (autouse) flushes the in-memory actuals TTL cache
  before and after every test to prevent cross-test contamination.

Factory functions (plain sync callables, importable by any test file)
  make_txn(**overrides)         → valid POST /transactions payload dict
  create(client, **overrides)   → async; POSTs and returns the data dict
  next_month_first(date)        → ISO string for 1st of following month
  make_csv_bytes(rows)          → in-memory CSV bytes for import tests

Budget fixtures / constants
  core_categories               → creates 3 canonical budget categories
  seeded_transactions           → seeds 5 canonical transactions (see below)
  analysis_ready                → adds planned values on top of seeded data

Canonical 5-transaction seed (default cutoff = day 20):
  T1  debit  $200   2025-05-10  FOOD_CAT   → May  expense  $200
  T2  debit  $150   2025-05-15  FOOD_CAT   → May  expense  $150
  T3  credit $3000  2025-05-10  INCOME_CAT → May  income   $3000
  T4  credit $500   2025-05-22  INCOME_CAT → SHIFTED → June income $500
  T5  debit  $300   2025-06-05  FOOD_CAT   → June expense  $300
"""

import os
import uuid
import pytest
from pathlib import Path
from datetime import date as dt_date
from typing import AsyncGenerator
from dotenv import load_dotenv

# ── 1. BOOTSTRAP ENVIRONMENT ──────────────────────────────────────────────────
root_axis_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_axis_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
elif not os.getenv("DATABASE_URL"):
    raise FileNotFoundError(
        f"Critical Environment Setup Error:\n"
        f"Could not find a physical .env file at: {env_path}\n"
        f"And no active container environment variables (like DATABASE_URL) were detected."
    )

# ── 2. APP IMPORTS (after env bootstrap) ──────────────────────────────────────
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from passlib.context import CryptContext

from core.config import settings as app_settings
from core.database import get_db
from core.auth import create_access_token
from main import app
from modules.auth.models import User

# ── 3. TEST ENGINE ─────────────────────────────────────────────────────────────
test_engine = create_async_engine(app_settings.DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)

# ── 4. CREDENTIALS ─────────────────────────────────────────────────────────────
TEST_EMAIL = os.getenv("TEST_EMAIL", "test@gmail.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "test_password_123")
FAKE_USER_ID  = uuid.UUID("11111111-1111-1111-1111-111111111111")


# ═══════════════════════════════════════════════════════════════════════════════
# CORE FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Wraps each test in an outer DB transaction that rolls back on exit.
    All service-layer db.commit() calls commit a nested savepoint only,
    keeping writes visible within the test but invisible to the real DB.
    """
    async with test_engine.connect() as connection:
        transaction = await connection.begin()
        async with TestSessionLocal(bind=connection) as session:
            await session.begin_nested()
            yield session
            await transaction.rollback()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Authenticated ASGI client.
    Creates (or fetches) the test user and seeds a default UserSettings row
    inside the rollback transaction — both vanish after the test completes.
    """
    app.dependency_overrides[get_db] = lambda: db_session

    result = await db_session.execute(select(User).where(User.email == TEST_EMAIL))
    user = result.scalar_one_or_none()

    if not user:
        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        user = User(
            email=TEST_EMAIL,
            name="Test Account",
            hashed_password=pwd_ctx.hash(TEST_PASSWORD),
        )
        db_session.add(user)
        await db_session.flush()

    # Ensure a settings row exists — register_user creates one, but the fixture
    # creates the user directly and bypasses that code path.
    from modules.settings.models import UserSettings
    s_result = await db_session.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    if not s_result.scalar_one_or_none():
        db_session.add(UserSettings(user_id=user.id))
        await db_session.flush()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver/api/v1", follow_redirects=True
    ) as ac:
        ac.cookies.set("axis_session", create_access_token(user_id=user.id))
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def txn_ids():
    """Dummy fixture to satisfy legacy test signatures. Rollbacks handle actual cleanup."""
    return []

@pytest.fixture(scope="function")
async def anon_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Unauthenticated ASGI client — no axis_session cookie.
    Use this fixture for /auth/register and /auth/login tests.
    Uses the same db_session as `client`, so data created by either
    client is visible within the same test.
    """
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver/api/v1", follow_redirects=True,
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_budget_cache():
    """
    Flush the in-memory actuals TTL cache before and after every test.
    Prevents the 5-second TTL from bleeding cached results across test
    functions that share the same user_id + year cache key.
    """
    from modules.budget.service import actuals_cache
    actuals_cache.clear()
    yield
    actuals_cache.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSACTION FACTORIES & HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

# A safe default date: day 10, before the default cutoff (day 20) — never shifted.
_SAFE_DATE = "2025-05-10"


def make_txn(**overrides) -> dict:
    """
    Return a valid POST /transactions payload dict.
    Override any field with keyword arguments:

        make_txn(type="credit", date="2025-12-22", amount=5000.00)
    """
    base = {
        "date":           _SAFE_DATE,
        "category":       "Food",
        "description":    "Test transaction",
        "amount":         100.00,
        "type":           "debit",
        "shift_override": False,
    }
    base.update(overrides)
    return base


async def create(client: AsyncClient, **overrides) -> dict:
    """
    POST /transactions/ and return the `data` payload dict.
    Raises AssertionError on any non-2xx status so failures are immediately
    visible rather than producing confusing downstream errors.
    """
    resp = await client.post("/transactions/", json=make_txn(**overrides))
    assert resp.status_code in (200, 201), (
        f"create() helper failed (HTTP {resp.status_code}): {resp.text[:400]}"
    )
    return resp.json()["data"]


def next_month_first(d: dt_date) -> str:
    """Return the ISO-8601 string for the 1st of the month following `d`."""
    if d.month == 12:
        return f"{d.year + 1}-01-01"
    return f"{d.year}-{d.month + 1:02d}-01"


def make_csv_bytes(rows: list[dict] | None = None) -> bytes:
    """Build a minimal in-memory CSV for import endpoint tests."""
    if rows is None:
        rows = [
            {"date": "2025-05-10", "description": "Salary",  "amount": "3000.00", "type": "credit"},
            {"date": "2025-05-12", "description": "Walmart", "amount": "150.00",  "type": "debit"},
        ]
    header = ",".join(rows[0].keys())
    lines  = [header] + [",".join(str(v) for v in r.values()) for r in rows]
    return "\n".join(lines).encode()


# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

TEST_PREFIX  = "PYTEST "
FOOD_CAT     = f"{TEST_PREFIX}Food"
INCOME_CAT   = f"{TEST_PREFIX}Income"
SAVINGS_CAT  = f"{TEST_PREFIX}Savings"

# Expected actuals derived from the canonical 5-transaction seed.
# T4 (credit, May 22) is shifted to June because day 22 >= default cutoff 20.
EXPECTED_FOOD_MAY            = 350.00    # T1($200) + T2($150)
EXPECTED_FOOD_JUN            = 300.00    # T5($300)
EXPECTED_INCOME_MAY          = 3000.00   # T3 only — T4 shifted out
EXPECTED_INCOME_JUN          = 500.00    # T4 shifted in
EXPECTED_TOTAL_INCOME_2025   = 3500.00   # T3 + T4
EXPECTED_TOTAL_EXPENSE_2025  = 650.00    # T1 + T2 + T5


# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="function")
async def core_categories(client: AsyncClient) -> dict:
    """
    Create the 3 canonical budget categories inside the rollback transaction.
    Returns: { FOOD_CAT: "<uuid>", INCOME_CAT: "<uuid>", SAVINGS_CAT: "<uuid>" }
    """
    mapping = {}
    for payload in [
        {"name": FOOD_CAT,    "type": "expense", "icon": "🍔"},
        {"name": INCOME_CAT,  "type": "income",  "icon": "💵"},
        {"name": SAVINGS_CAT, "type": "savings", "icon": "🏦"},
    ]:
        r = await client.post("/budget/categories", json=payload)
        assert r.status_code in (200, 201), f"core_categories fixture: {r.text}"
        mapping[payload["name"]] = r.json()["data"]["id"]
    return mapping


@pytest.fixture(scope="function")
async def seeded_transactions(client: AsyncClient, core_categories: dict) -> list[str]:
    """
    Seed the 5 canonical transactions. Returns their IDs in insertion order.
    Depends on core_categories so category names are guaranteed to exist first.
    """
    seeds = [
        dict(date="2025-05-10", category=FOOD_CAT,   description="T1",          amount=200.00,  type="debit"),
        dict(date="2025-05-15", category=FOOD_CAT,   description="T2",          amount=150.00,  type="debit"),
        dict(date="2025-05-10", category=INCOME_CAT, description="T3",          amount=3000.00, type="credit"),
        dict(date="2025-05-22", category=INCOME_CAT, description="T4_shifted",  amount=500.00,  type="credit"),
        dict(date="2025-06-05", category=FOOD_CAT,   description="T5",          amount=300.00,  type="debit"),
    ]
    ids = []
    for seed in seeds:
        data = await create(client, **seed)
        ids.append(data["id"])
    return ids


@pytest.fixture(scope="function")
async def analysis_ready(client: AsyncClient, core_categories: dict, seeded_transactions: list) -> dict:
    """
    Full data setup for analysis tests:
      - 3 budget categories  (via core_categories)
      - 5 canonical transactions  (via seeded_transactions)
      - Planned values for Apr / May / Jun 2025

    Planned layout used by assertions:
      Food    planned 400/month  → May actual 350 (under), June actual 300 (under)
      Income  planned 3500/month → May actual 3000 (under)
      Savings planned 500/month  → actuals 0 (nothing seeded)
    """
    food_id    = core_categories[FOOD_CAT]
    income_id  = core_categories[INCOME_CAT]
    savings_id = core_categories[SAVINGS_CAT]

    await client.put("/budget/values", json={"values": [
        {"category_id": food_id,    "year": 2025, "month": 4, "planned_amount": 400.00},
        {"category_id": food_id,    "year": 2025, "month": 5, "planned_amount": 400.00},
        {"category_id": food_id,    "year": 2025, "month": 6, "planned_amount": 400.00},
        {"category_id": income_id,  "year": 2025, "month": 5, "planned_amount": 3500.00},
        {"category_id": income_id,  "year": 2025, "month": 6, "planned_amount": 3500.00},
        {"category_id": savings_id, "year": 2025, "month": 5, "planned_amount": 500.00},
        {"category_id": savings_id, "year": 2025, "month": 6, "planned_amount": 500.00},
    ]})

    return {
        "food_id":    food_id,
        "income_id":  income_id,
        "savings_id": savings_id,
        "year":       2025,
    }