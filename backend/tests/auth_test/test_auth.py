# backend/tests/auth_tests/test_auth.py
"""
AUTH MODULE — Integration Test Suite
=====================================
Endpoints: POST /auth/register  POST /auth/login  POST /auth/logout  GET /auth/me

All tests run through the ASGI transport against a rollback-scoped DB session.

Key fixtures used
  anon_client — unauthenticated; used for register/login tests
  client      — pre-authenticated; used for logout and /auth/me tests

Registration tests use fresh UUID-derived emails to guarantee uniqueness within
a single test. Because the DB rolls back after each function, emails do not
persist across tests — uniqueness is only relevant within the function itself.
"""

import uuid
import pytest


# ─────────────────────────────────────────────────────────────────────────────
# LOCAL HELPER
# ─────────────────────────────────────────────────────────────────────────────

def fresh_user() -> dict:
    """Return a unique {email, name, password} payload for a registration call."""
    tag = uuid.uuid4().hex[:8]
    return {
        "email":    f"user_{tag}@gmail.com",
        "name":     f"Test User {tag}",
        "password": "SecurePass123!",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# A — REGISTER
# ═══════════════════════════════════════════════════════════════════════════════

class TestRegister:
    """POST /auth/register"""

    async def test_valid_registration_returns_200(self, anon_client):
        resp = await anon_client.post("/auth/register", json=fresh_user())
        assert resp.status_code == 200

    async def test_response_envelope_on_success(self, anon_client):
        resp = await anon_client.post("/auth/register", json=fresh_user())
        body = resp.json()
        assert "data"  in body
        assert "error" in body
        assert body["error"] is None

    async def test_returns_user_email_and_name(self, anon_client):
        payload = fresh_user()
        data = (await anon_client.post("/auth/register", json=payload)).json()["data"]
        assert data["email"] == payload["email"]
        assert data["name"]  == payload["name"]

    async def test_returns_user_id(self, anon_client):
        data = (await anon_client.post("/auth/register", json=fresh_user())).json()["data"]
        assert "id" in data
        # Must be a valid UUID string
        uuid.UUID(data["id"])

    async def test_hashed_password_never_returned(self, anon_client):
        body = (await anon_client.post("/auth/register", json=fresh_user())).json()
        assert "hashed_password" not in body
        assert "hashed_password" not in body.get("data", {})

    async def test_sets_axis_session_cookie(self, anon_client):
        resp = await anon_client.post("/auth/register", json=fresh_user())
        assert "axis_session" in resp.cookies

    async def test_duplicate_email_returns_400(self, anon_client):
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)          # first
        resp = await anon_client.post("/auth/register", json=payload)   # duplicate
        assert resp.status_code == 400

    async def test_duplicate_email_error_envelope(self, anon_client):
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)
        body = (await anon_client.post("/auth/register", json=payload)).json()
        assert body["data"]  is None
        assert body["error"] is not None
        assert "code" in body["error"]

    async def test_missing_email_returns_422(self, anon_client):
        resp = await anon_client.post("/auth/register", json={"name": "A", "password": "pass"})
        assert resp.status_code == 422

    async def test_missing_password_returns_422(self, anon_client):
        payload = fresh_user()
        del payload["password"]
        resp = await anon_client.post("/auth/register", json=payload)
        assert resp.status_code == 422

    async def test_missing_name_returns_422(self, anon_client):
        payload = fresh_user()
        del payload["name"]
        resp = await anon_client.post("/auth/register", json=payload)
        assert resp.status_code == 422

    async def test_register_creates_user_settings_row(self, anon_client, db_session):
        """
        SYSTEM TEST — register_user must auto-create a UserSettings row so that
        settings endpoints never return 404 for a newly registered user.
        """
        from sqlalchemy import select
        from modules.auth.models import User
        from modules.settings.models import UserSettings

        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)

        user = (await db_session.execute(
            select(User).where(User.email == payload["email"])
        )).scalar_one_or_none()
        assert user is not None

        settings = (await db_session.execute(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )).scalar_one_or_none()
        assert settings is not None, (
            "POST /auth/register must create a UserSettings row automatically"
        )

    async def test_register_default_settings_currency_is_cad(self, anon_client, db_session):
        from sqlalchemy import select
        from modules.auth.models import User
        from modules.settings.models import UserSettings

        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)

        user = (await db_session.execute(
            select(User).where(User.email == payload["email"])
        )).scalar_one_or_none()

        settings = (await db_session.execute(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )).scalar_one_or_none()

        assert settings.currency          == "CAD"
        assert settings.shift_late_income is True
        assert settings.income_cutoff_day == 20


# ═══════════════════════════════════════════════════════════════════════════════
# B — LOGIN
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogin:
    """POST /auth/login"""

    async def test_valid_credentials_return_200(self, anon_client):
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)
        resp = await anon_client.post("/auth/login", json={
            "email": payload["email"], "password": payload["password"]
        })
        assert resp.status_code == 200

    async def test_valid_login_sets_cookie(self, anon_client):
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)
        resp = await anon_client.post("/auth/login", json={
            "email": payload["email"], "password": payload["password"]
        })
        assert "axis_session" in resp.cookies

    async def test_valid_login_response_envelope(self, anon_client):
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)
        body = (await anon_client.post("/auth/login", json={
            "email": payload["email"], "password": payload["password"]
        })).json()
        assert "data"  in body
        assert body["error"] is None

    async def test_wrong_password_returns_401(self, anon_client):
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)
        resp = await anon_client.post("/auth/login", json={
            "email": payload["email"], "password": "WRONG_PASSWORD"
        })
        assert resp.status_code == 401

    async def test_nonexistent_email_returns_401_not_404(self, anon_client):
        """Spec: never reveal whether an email exists — always return 401."""
        resp = await anon_client.post("/auth/login", json={
            "email": "nobody@nowhere.ax", "password": "any_password"
        })
        assert resp.status_code == 401

    async def test_wrong_email_and_wrong_password_both_return_401(self, anon_client):
        """
        Both failure modes must return identical 401 to prevent email enumeration
        (timing-attack mitigation is a service-layer concern, not tested here).
        """
        payload = fresh_user()
        await anon_client.post("/auth/register", json=payload)

        r_bad_pass  = await anon_client.post("/auth/login", json={
            "email": payload["email"], "password": "BAD_PASS"
        })
        r_bad_email = await anon_client.post("/auth/login", json={
            "email": "ghost@gmail.com", "password": payload["password"]
        })
        assert r_bad_pass.status_code  == 401
        assert r_bad_email.status_code == 401

    async def test_auth_failure_error_envelope(self, anon_client):
        resp = await anon_client.post("/auth/login", json={
            "email": "nobody@nowhere.ax", "password": "whatever"
        })
        body = resp.json()
        assert body["data"]  is None
        assert body["error"] is not None

    async def test_missing_email_field_returns_422(self, anon_client):
        resp = await anon_client.post("/auth/login", json={"password": "pass"})
        assert resp.status_code == 422

    async def test_missing_password_field_returns_422(self, anon_client):
        resp = await anon_client.post("/auth/login", json={"email": "x@gmail.com"})
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# C — LOGOUT
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogout:
    """POST /auth/logout"""

    async def test_logout_returns_200(self, client):
        resp = await client.post("/auth/logout")
        assert resp.status_code == 200

    async def test_logout_response_envelope(self, client):
        body = (await client.post("/auth/logout")).json()
        assert body["error"] is None
        assert "meta" in body

    async def test_logout_clears_session_cookie(self, client):
        resp = await client.post("/auth/logout")
        # httpx surfaces a cleared cookie as empty string
        assert not resp.cookies.get("axis_session", "")

    async def test_logout_does_not_require_active_session(self, anon_client):
        """Logout must be idempotent — unauthenticated call should not 401/500."""
        resp = await anon_client.post("/auth/logout")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# D — GET /auth/me
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetMe:
    """GET /auth/me"""

    async def test_authenticated_returns_200(self, client):
        resp = await client.get("/auth/me")
        assert resp.status_code == 200

    async def test_returns_required_fields(self, client):
        data = (await client.get("/auth/me")).json()["data"]
        for field in ("id", "email", "name"):
            assert field in data, f"GET /auth/me missing field: {field}"

    async def test_returns_correct_email(self, client):
        from conftest import TEST_EMAIL
        data = (await client.get("/auth/me")).json()["data"]
        assert data["email"] == TEST_EMAIL

    async def test_hashed_password_not_in_response(self, client):
        body = (await client.get("/auth/me")).json()
        assert "hashed_password" not in body
        assert "hashed_password" not in body.get("data", {})

    async def test_unauthenticated_request_returns_401(self, anon_client):
        resp = await anon_client.get("/auth/me")
        assert resp.status_code == 401

    async def test_response_envelope(self, client):
        body = (await client.get("/auth/me")).json()
        assert "data"  in body
        assert body["error"] is None

    async def test_system_register_then_get_me(self, anon_client):
        """
        SYSTEM TEST — full registration → cookie → authenticated /auth/me flow.
        Verifies that a cookie issued at registration is valid for subsequent calls.
        """
        payload = fresh_user()
        reg_resp = await anon_client.post("/auth/register", json=payload)
        assert reg_resp.status_code == 200

        # Use the cookie set by registration for the /me call
        me_resp = await anon_client.get("/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["data"]["email"] == payload["email"]