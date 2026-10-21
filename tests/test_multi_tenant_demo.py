"""
The shared multi-tenant demo: anyone signs up, lists their platform, and every
listed platform reaches both mobile apps through /instances.json.

What matters here is what a stranger can and cannot do to someone else's entry,
and that the key an app stores a learner's session under always means the same
platform.
"""
import json

import pytest

from tests.conftest import auth, build_app


def _signup(client, email: str) -> str:
    r = client.post("/auth/register", json={"email": email, "name": email.split("@")[0], "password": "s3cret-pass"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _add(client, token: str, name: str, url: str, client_id: str = "mobile-app", **extra) -> dict:
    body = {"name": name, "base_url": url, "platform_name": f"{name} Platform", "oauth_client_id": client_id}
    body.update(extra)
    r = client.post("/lms", json=body, headers=auth(token))
    assert r.status_code == 201, r.text
    return r.json()


def _catalog(client) -> list[dict]:
    r = client.get("/instances.json")
    assert r.status_code == 200, r.text
    assert r.headers["cache-control"] == "no-cache"
    return r.json()["instances"]


@pytest.fixture
def demo(tmp_path):
    yield build_app(tmp_path, "search", REGISTRY_PUBLIC_URL="https://multi-tenant.example.com", SHARED_DEMO="true")


def test_every_owner_lands_in_one_catalog(demo):
    ann = _signup(demo, "ann@one.edu")
    bob = _signup(demo, "bob@two.edu")
    _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu", accent_color="#0B6E4F",
         logo_upload_url="/uploads/logo.png")
    _add(demo, bob, "Arcadia College", "https://courses.arcadia.edu/", client_id="arcadia-mobile")

    catalog = _catalog(demo)

    assert [entry["name"] for entry in catalog] == ["Arcadia College", "Northwind Academy"]
    arcadia, northwind = catalog
    assert arcadia["api_host_url"] == "https://courses.arcadia.edu"
    assert arcadia["oauth_client_id"] == "arcadia-mobile"
    assert northwind["color"] == "#0B6E4F"
    assert northwind["theme"]["light"] == {"accent_color": "#0B6E4F"}
    assert northwind["theme"]["dark"]["accent_color"].startswith("#")
    assert northwind["theme"]["logo_url"] == "https://multi-tenant.example.com/uploads/logo.png"
    assert len({entry["key"] for entry in catalog}) == 2


def test_a_demo_platform_is_live_with_no_review_step(demo):
    ann = _signup(demo, "ann@one.edu")
    lms = _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu")

    assert lms["status"] == "approved"
    assert lms["admin_reviewed"] is True
    mine = demo.get("/my/lms", headers=auth(ann)).json()
    assert [(entry["status"], entry["admin_reviewed"]) for entry in mine] == [("approved", True)]
    assert [entry["name"] for entry in _catalog(demo)] == ["Northwind Academy"]


def test_the_catalog_carries_nothing_private(demo):
    ann = _signup(demo, "ann@one.edu")
    _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu")

    raw = demo.get("/instances.json").text

    assert "ann@one.edu" not in raw
    assert "password" not in raw.lower()
    entry = json.loads(raw)["instances"][0]
    assert set(entry) <= {
        "key", "name", "api_host_url", "oauth_client_id", "color", "PLATFORM_NAME",
        "sso_url", "sso_url_successful_login", "FEEDBACK_EMAIL_ADDRESS", "theme",
    }


def test_an_owner_cannot_touch_someone_elses_platform(demo):
    ann = _signup(demo, "ann@one.edu")
    bob = _signup(demo, "bob@two.edu")
    lms = _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu")

    assert demo.put(f"/my/lms/{lms['id']}", json={"name": "Hijacked"}, headers=auth(bob)).status_code == 404
    assert demo.delete(f"/my/lms/{lms['id']}", headers=auth(bob)).status_code == 404
    assert demo.delete(f"/my/lms/{lms['id']}").status_code in (401, 403)
    assert demo.put(f"/my/lms/{lms['id']}", json={"name": "Hijacked"}).status_code in (401, 403)

    assert [entry["name"] for entry in _catalog(demo)] == ["Northwind Academy"]


def test_an_owner_deletes_their_platform_and_it_leaves_the_catalog(demo):
    ann = _signup(demo, "ann@one.edu")
    bob = _signup(demo, "bob@two.edu")
    gone = _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu")
    _add(demo, bob, "Arcadia College", "https://courses.arcadia.edu")
    arcadia_key = next(e["key"] for e in _catalog(demo) if e["name"] == "Arcadia College")

    assert demo.delete(f"/my/lms/{gone['id']}", headers=auth(ann)).status_code == 204

    catalog = _catalog(demo)
    assert [entry["name"] for entry in catalog] == ["Arcadia College"]
    assert catalog[0]["key"] == arcadia_key
    assert demo.get("/my/lms", headers=auth(ann)).json() == []
    assert demo.delete(f"/my/lms/{gone['id']}", headers=auth(ann)).status_code == 404


def test_a_deleted_platforms_key_is_never_handed_to_the_next_one(demo):
    ann = _signup(demo, "ann@one.edu")
    first = _add(demo, ann, "First", "https://first.example.edu")
    first_key = _catalog(demo)[0]["key"]
    demo.delete(f"/my/lms/{first['id']}", headers=auth(ann))

    second = _add(demo, ann, "Second", "https://second.example.edu")

    # SQLite may well reuse the row id; the catalog key must not follow it.
    assert second["id"] == first["id"] or second["id"] > first["id"]
    assert _catalog(demo)[0]["key"] != first_key


def test_keys_survive_reordering_and_renames(demo):
    ann = _signup(demo, "ann@one.edu")
    zeta = _add(demo, ann, "Zeta", "https://zeta.example.edu")
    _add(demo, ann, "Mid", "https://mid.example.edu")
    before = {e["api_host_url"]: e["key"] for e in _catalog(demo)}

    demo.put(f"/my/lms/{zeta['id']}", json={"name": "Alpha now"}, headers=auth(ann))

    after = {e["api_host_url"]: e["key"] for e in _catalog(demo)}
    assert [e["name"] for e in _catalog(demo)] == ["Alpha now", "Mid"]
    assert after == before


def test_moving_a_platform_to_another_address_gives_it_a_new_key(demo):
    ann = _signup(demo, "ann@one.edu")
    lms = _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu")
    old_key = _catalog(demo)[0]["key"]

    demo.put(f"/my/lms/{lms['id']}", json={"base_url": "https://lms.northwind.edu/"}, headers=auth(ann))
    assert _catalog(demo)[0]["key"] == old_key  # the same address, written differently

    demo.put(f"/my/lms/{lms['id']}", json={"base_url": "https://new-host.northwind.edu"}, headers=auth(ann))
    assert _catalog(demo)[0]["key"] != old_key


@pytest.mark.parametrize(
    "url",
    [
        "http://lms.northwind.edu",
        "https://localhost",
        "https://127.0.0.1",
        "https://10.0.0.5",
        "https://169.254.169.254",
        "https://[::1]",
        "https://printer.local",
        "https://intranet",
        "ftp://lms.northwind.edu",
    ],
)
def test_the_public_catalog_only_takes_public_https_addresses(demo, url):
    ann = _signup(demo, "ann@one.edu")
    body = {"name": "X", "base_url": url, "platform_name": "X", "oauth_client_id": "c"}

    assert demo.post("/lms", json=body, headers=auth(ann)).status_code == 422
    lms = _add(demo, ann, "Northwind Academy", "https://lms.northwind.edu")
    assert demo.put(f"/my/lms/{lms['id']}", json={"base_url": url}, headers=auth(ann)).status_code == 422


def test_a_platform_without_an_oauth_client_stays_out_of_the_catalog(demo):
    ann = _signup(demo, "ann@one.edu")
    _add(demo, ann, "Complete", "https://complete.example.edu")
    _add(demo, ann, "Half done", "https://half.example.edu", client_id="")

    assert [e["name"] for e in _catalog(demo)] == ["Complete"]


def test_blocked_platforms_leave_the_catalog(tmp_path):
    client = build_app(tmp_path, "search", ADMIN_EMAIL="ops@example.com", ADMIN_PASSWORD="ops-pass-123")
    admin = client.post("/auth/login", json={"email": "ops@example.com", "password": "ops-pass-123"}).json()
    ann = _signup(client, "ann@one.edu")
    lms = _add(client, ann, "Northwind Academy", "https://lms.northwind.edu")

    r = client.post(f"/admin/lms/{lms['id']}/block", json={"reason": "spam"}, headers=auth(admin["access_token"]))
    assert r.status_code == 200, r.text

    assert _catalog(client) == []


def test_no_demo_accounts_exist_in_a_fresh_deployment(demo):
    for email, password in (("admin@demo.com", "admin123"), ("user@demo.com", "user123")):
        assert demo.post("/auth/login", json={"email": email, "password": password}).status_code == 401


def test_sign_ups_from_one_address_are_limited(demo):
    codes = [
        demo.post("/auth/register", json={"email": f"u{i}@x.edu", "name": "u", "password": "pw-123456"}).status_code
        for i in range(11)
    ]
    assert codes[:10] == [200] * 10
    assert codes[10] == 429


def test_a_portal_has_no_shared_catalog(portal):
    assert portal.get("/instances.json").status_code == 404


def test_a_deployment_serves_its_own_landing_and_downloads(tmp_path):
    landing = tmp_path / "landing"
    (landing / "img").mkdir(parents=True)
    (landing / "index.html").write_text("<h1>Multi-tenant demo</h1>")
    (landing / "img" / "hero.svg").write_text("<svg/>")
    downloads = tmp_path / "downloads"
    downloads.mkdir()
    (downloads / "demo.apk").write_bytes(b"PK\x03\x04")

    client = build_app(tmp_path, "search", LANDING_DIR=str(landing), DOWNLOADS_DIR=str(downloads))

    assert "Multi-tenant demo" in client.get("/").text
    assert client.get("/site/img/hero.svg").text == "<svg/>"
    apk = client.get("/downloads/demo.apk")
    assert apk.status_code == 200
    assert apk.headers["content-type"] == "application/vnd.android.package-archive"
