"""
The two older modes must not change, and the schema change must be safe to run
against the live production database — twice.
"""
import shutil
import sqlite3
from pathlib import Path

from conftest import auth


# ── search mode (the pilot) still behaves exactly as before ──

def test_search_mode_keeps_its_public_catalog(search):
    res = search.post("/auth/register", json={
        "email": "owner@example.com", "name": "Owner", "password": "secret123",
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]

    created = search.post("/lms", json={
        "name": "Open Campus", "base_url": "https://open.example.edu",
        "platform_name": "Open Campus", "oauth_client_id": "abc",
    }, headers=auth(token))
    assert created.status_code == 201

    cfg = search.get("/api/v1/config").json()
    assert cfg["directory_mode"] == "search"

    items = search.get("/api/v1/directory").json()["items"]
    assert [i["title"] for i in items] == ["Open Campus"]
    assert [l["name"] for l in search.get("/lms").json()] == ["Open Campus"]
    assert search.get(f"/lms/{created.json()['id']}").status_code == 200


def test_search_mode_sign_up_still_needs_no_organization(search):
    res = search.post("/auth/register", json={
        "email": "owner@example.com", "name": "Owner", "password": "secret123",
    })
    assert res.status_code == 200
    me = search.get("/auth/me", headers=auth(res.json()["access_token"])).json()
    assert me["organization_id"] is None


def test_public_lms_reads_no_longer_leak_owner_or_moderation_data(search):
    token = search.post("/auth/register", json={
        "email": "owner@example.com", "name": "Owner", "password": "secret123",
    }).json()["access_token"]
    created = search.post("/lms", json={
        "name": "Open Campus", "base_url": "https://open.example.edu",
        "platform_name": "Open Campus", "oauth_client_id": "abc",
    }, headers=auth(token)).json()

    public = search.get(f"/lms/{created['id']}").json()
    for secret in ("owner_email", "block_reason", "admin_reviewed", "submitted_by",
                   "last_health_note", "review_requested_at", "owner_notified_at"):
        assert secret not in public, secret
    # The owner still gets the whole record from their own route.
    private = search.get(f"/my/lms/{created['id']}", headers=auth(token)).json()
    assert private["owner_email"] == "owner@example.com"


def test_unapproved_platforms_are_not_readable_by_id(search, tmp_path):
    from conftest import build_app
    client = build_app(tmp_path, "search", AUTO_APPROVE="false")
    token = client.post("/auth/register", json={
        "email": "owner@example.com", "name": "Owner", "password": "secret123",
    }).json()["access_token"]
    created = client.post("/lms", json={
        "name": "Pending Campus", "base_url": "https://pending.example.edu",
        "platform_name": "Pending", "oauth_client_id": "abc",
    }, headers=auth(token)).json()
    assert created["status"] == "pending"
    assert client.get(f"/lms/{created['id']}").status_code == 404


def test_the_universal_login_report_alias_works(search):
    token = search.post("/auth/register", json={
        "email": "owner@example.com", "name": "Owner", "password": "secret123",
    }).json()["access_token"]
    lms = search.post("/lms", json={
        "name": "Open Campus", "base_url": "https://open.example.edu",
        "platform_name": "Open Campus", "oauth_client_id": "abc",
    }, headers=auth(token)).json()

    # This alias used to 500 on every call: it forwarded to a handler that
    # requires the Request object for the rate-limit key without declaring one.
    res = search.post("/api/universal-login/reports", json={
        "lms_id": lms["id"], "category": "spam", "message": "not a real platform",
    })
    assert res.status_code == 201, res.text


def test_search_mode_still_serves_the_landing_page_at_the_root(search):
    res = search.get("/")
    assert res.status_code == 200
    assert "one mobile app for every Open edX instance" in res.text


# ── curated mode unchanged ────────────────────────────

def test_curated_mode_still_closes_sign_up_and_reporting(curated):
    assert curated.post("/auth/register", json={
        "email": "owner@example.com", "name": "Owner", "password": "secret123",
    }).status_code == 403
    assert curated.post("/api/v1/reports", json={
        "base_url": "https://x.example.edu", "category": "spam",
    }).status_code == 403
    assert curated.get("/api/v1/config").json()["directory_mode"] == "curated"


# ── the migration ─────────────────────────────────────

LIVE_DB = Path(__file__).resolve().parent.parent / "data" / "lms_registry.db"


def test_migrate_is_idempotent_on_a_pre_change_database(tmp_path, monkeypatch):
    """
    Run the migration twice against a database created by the OLD schema.

    migrate() runs at import in every process, so a migration that is not
    re-runnable is not a degraded feature — the container never finishes booting.
    """
    db_path = tmp_path / "legacy.db"
    conn = sqlite3.connect(db_path)
    # The v0.2 shape: no organization_id anywhere, and the columns v0.3 added
    # deliberately absent so the column-adding path is exercised too.
    conn.executescript(
        """
        CREATE TABLE users (
            id INTEGER NOT NULL PRIMARY KEY, email VARCHAR NOT NULL,
            name VARCHAR NOT NULL, password_hash VARCHAR NOT NULL,
            role VARCHAR(5) NOT NULL, created_at DATETIME
        );
        CREATE TABLE lms_instances (
            id INTEGER NOT NULL PRIMARY KEY, name VARCHAR NOT NULL,
            base_url VARCHAR NOT NULL, platform_name VARCHAR NOT NULL,
            oauth_client_id VARCHAR NOT NULL, status VARCHAR(8) NOT NULL,
            submitted_by INTEGER NOT NULL, created_at DATETIME, updated_at DATETIME
        );
        INSERT INTO users VALUES (1, 'a@example.com', 'A', 'x', 'admin', '2026-01-01');
        INSERT INTO lms_instances VALUES
            (1, 'Legacy', 'https://legacy.example.edu', 'Legacy', 'cid', 'approved', 1,
             '2026-01-01', '2026-01-01');
        """
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    import importlib
    import sys
    for name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[name]
    database = importlib.import_module("app.database")

    database.migrate()
    database.migrate()  # a second boot must be a no-op, not an error

    check = sqlite3.connect(db_path)
    user_cols = {r[1] for r in check.execute("PRAGMA table_info(users)")}
    lms_cols = {r[1] for r in check.execute("PRAGMA table_info(lms_instances)")}
    assert "organization_id" in user_cols
    assert "organization_id" in lms_cols
    # Additive only: nothing was rewritten or dropped.
    assert check.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
    assert check.execute("SELECT COUNT(*) FROM lms_instances").fetchone()[0] == 1
    assert check.execute("SELECT name FROM lms_instances WHERE id=1").fetchone()[0] == "Legacy"
    # Pre-existing rows belong to no tenant, which is what keeps them out of every
    # provider directory.
    assert check.execute("SELECT organization_id FROM lms_instances").fetchone()[0] is None
    check.close()


def test_migrate_runs_clean_against_a_copy_of_the_real_database(tmp_path, monkeypatch):
    """The same check against the actual development database, when one exists —
    a synthetic schema can miss a column the real file has."""
    if not LIVE_DB.exists():
        import pytest
        pytest.skip("no local data/lms_registry.db to check against")

    target = tmp_path / "copy.db"
    shutil.copy(LIVE_DB, target)
    before = sqlite3.connect(target).execute("SELECT COUNT(*) FROM lms_instances").fetchone()[0]

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{target}")
    import importlib
    import sys
    for name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[name]
    database = importlib.import_module("app.database")
    database.migrate()
    database.migrate()

    check = sqlite3.connect(target)
    assert check.execute("SELECT COUNT(*) FROM lms_instances").fetchone()[0] == before
    assert "organization_id" in {r[1] for r in check.execute("PRAGMA table_info(lms_instances)")}
    check.close()
