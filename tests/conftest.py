"""
Test harness.

The app does real work at import time — it creates the engine from DATABASE_URL,
runs create_all + migrate, and seeds — so a test cannot just import it and then
choose a mode. `build_app` sets the environment first and re-imports the whole
`app` package, which gives each test its own database and its own resolved
config.
"""
import importlib
import os
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _purge_app_modules() -> None:
    for name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[name]


def build_app(tmp_path: Path, mode: str = "portal", **env):
    """A TestClient for a freshly imported app in `mode`, with its own SQLite file."""
    from fastapi.testclient import TestClient

    workdir = tmp_path / mode
    (workdir / "data" / "uploads").mkdir(parents=True, exist_ok=True)
    os.chdir(workdir)

    os.environ["DATABASE_URL"] = f"sqlite:///{workdir / 'registry.db'}"
    os.environ["DIRECTORY_MODE"] = mode
    os.environ["SECRET_KEY"] = "test-secret-key-not-a-real-one"
    os.environ.pop("SEED_DEMO", None)
    os.environ.pop("ADMIN_EMAIL", None)
    os.environ.pop("ADMIN_PASSWORD", None)
    os.environ.pop("REGISTRY_PUBLIC_URL", None)
    for key, value in env.items():
        os.environ[key] = value

    _purge_app_modules()
    main = importlib.import_module("app.main")
    return TestClient(main.app)


@pytest.fixture
def portal(tmp_path):
    """A provider-portal deployment with no data in it."""
    yield build_app(tmp_path, "portal")


@pytest.fixture
def search(tmp_path):
    """A stock public-catalog deployment — the pilot's configuration."""
    yield build_app(tmp_path, "search")


@pytest.fixture
def curated(tmp_path):
    """A single-organization white-label deployment."""
    yield build_app(tmp_path, "curated")


@pytest.fixture(autouse=True)
def _restore_cwd():
    before = os.getcwd()
    yield
    os.chdir(before)


# ── helpers shared by the isolation tests ─────────────

def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register_provider(client, *, email, org_name, slug=None, password="secret123"):
    """Sign up a provider and return (token, organization)."""
    body = {"email": email, "name": f"{org_name} Admin",
            "password": password, "organization_name": org_name}
    if slug:
        body["organization_slug"] = slug
    res = client.post("/auth/register", json=body)
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    org = client.get("/provider/org", headers=auth(token))
    assert org.status_code == 200, org.text
    return token, org.json()


PLATFORM = {
    "name": "Campus One",
    "base_url": "https://one.example.edu",
    "platform_name": "Campus One",
    "oauth_client_id": "client-one",
}


def add_platform(client, token, **overrides):
    body = {**PLATFORM, **overrides}
    res = client.post("/lms", json=body, headers=auth(token))
    assert res.status_code == 201, res.text
    return res.json()
