"""
Portal mode: one deployment, many providers, and no way from one to the other.

The promise portal mode makes is narrow and absolute — a provider sees and
touches its own platforms and nothing else. These tests are that promise written
down, because SQLite here does not enforce foreign keys, so every boundary in
this app is a WHERE clause somebody had to remember to write.
"""
from conftest import add_platform, auth, register_provider


def two_providers(portal):
    a_token, a_org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    b_token, b_org = register_provider(portal, email="b@example.com", org_name="Beta Institute")
    a_lms = add_platform(portal, a_token, name="Alpha Main", base_url="https://alpha.example.edu")
    b_lms = add_platform(portal, b_token, name="Beta Main", base_url="https://beta.example.edu")
    return (a_token, a_org, a_lms), (b_token, b_org, b_lms)


# ── the public directory ──────────────────────────────

def test_directory_returns_only_that_organizations_platforms(portal):
    (_, a_org, a_lms), (_, b_org, b_lms) = two_providers(portal)

    a_items = portal.get(f"/p/{a_org['slug']}/api/v1/directory").json()["items"]
    b_items = portal.get(f"/p/{b_org['slug']}/api/v1/directory").json()["items"]

    assert [i["title"] for i in a_items] == ["Alpha Main"]
    assert [i["title"] for i in b_items] == ["Beta Main"]
    assert str(b_lms["id"]) not in {i["id"] for i in a_items}
    assert str(a_lms["id"]) not in {i["id"] for i in b_items}


def test_detail_by_id_under_the_wrong_slug_is_not_found(portal):
    (_, a_org, _), (_, _, b_lms) = two_providers(portal)
    # The whole isolation story in one request: guessing an integer under someone
    # else's slug must not resolve, or the prefix means nothing.
    res = portal.get(f"/p/{a_org['slug']}/api/v1/directory/{b_lms['id']}")
    assert res.status_code == 404


def test_universal_login_alias_is_scoped_too(portal):
    (_, a_org, _), (_, _, b_lms) = two_providers(portal)
    assert portal.get(
        f"/p/{a_org['slug']}/api/universal-login/lms/{b_lms['id']}"
    ).status_code == 404
    items = portal.get(f"/p/{a_org['slug']}/api/universal-login/lms/search").json()["items"]
    assert [i["title"] for i in items] == ["Alpha Main"]


def test_config_reports_curated_so_the_apps_hide_search(portal):
    _, a_org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    cfg = portal.get(f"/p/{a_org['slug']}/api/v1/config").json()
    # "curated" is the only value the apps act on. Anything else — including a
    # literal "portal" — silently degrades a white-label build into open search.
    assert cfg["directory_mode"] == "curated"
    assert cfg["provider_name"] == "Alpha College"


def test_hidden_platforms_stay_out_of_the_directory(portal):
    token, org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    live = add_platform(portal, token, name="Live", base_url="https://live.example.edu")
    draft = add_platform(portal, token, name="Draft", base_url="https://draft.example.edu")
    portal.put(f"/my/lms/{draft['id']}", json={"visibility": "hidden"}, headers=auth(token))

    items = portal.get(f"/p/{org['slug']}/api/v1/directory").json()["items"]
    assert [i["id"] for i in items] == [str(live["id"])]
    # …but the provider still manages it.
    assert {p["name"] for p in portal.get("/my/lms", headers=auth(token)).json()} == {"Live", "Draft"}


def test_directory_order_follows_sort_order(portal):
    token, org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    first = add_platform(portal, token, name="Should be second", base_url="https://x1.example.edu")
    second = add_platform(portal, token, name="Should be first", base_url="https://x2.example.edu")
    portal.put(f"/my/lms/{first['id']}", json={"sort_order": 10}, headers=auth(token))
    portal.put(f"/my/lms/{second['id']}", json={"sort_order": 1}, headers=auth(token))

    items = portal.get(f"/p/{org['slug']}/api/v1/directory").json()["items"]
    assert [i["title"] for i in items] == ["Should be first", "Should be second"]


def test_unknown_and_suspended_slugs_are_indistinguishable(portal):
    a_token, a_org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    admin_token = _make_superadmin(portal)

    unknown = portal.get("/p/does-not-exist/api/v1/config")
    portal.patch(f"/admin/orgs/{a_org['id']}", json={"active": False}, headers=auth(admin_token))
    suspended = portal.get(f"/p/{a_org['slug']}/api/v1/config")

    # Same status and same body: the response must not reveal which providers
    # exist on this deployment.
    assert unknown.status_code == suspended.status_code == 404
    assert unknown.json() == suspended.json()


def test_suspension_is_reversible_and_restores_the_same_url(portal):
    a_token, a_org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    add_platform(portal, a_token, name="Alpha Main", base_url="https://alpha.example.edu")
    admin_token = _make_superadmin(portal)

    portal.patch(f"/admin/orgs/{a_org['id']}", json={"active": False}, headers=auth(admin_token))
    assert portal.get(f"/p/{a_org['slug']}/api/v1/directory").status_code == 404
    assert portal.get("/provider/org", headers=auth(a_token)).status_code == 403

    portal.patch(f"/admin/orgs/{a_org['id']}", json={"active": True}, headers=auth(admin_token))
    restored = portal.get(f"/p/{a_org['slug']}/api/v1/directory")
    assert restored.status_code == 200
    assert [i["title"] for i in restored.json()["items"]] == ["Alpha Main"]


def test_reporting_is_closed_on_provider_directories(portal):
    _, org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    res = portal.post(
        f"/p/{org['slug']}/api/v1/reports",
        json={"base_url": "https://alpha.example.edu", "category": "spam"},
    )
    assert res.status_code == 403


def test_the_portal_front_door_is_the_portal_not_the_pilot_landing(portal):
    # The landing page sells the public catalog. A provider arriving at a portal
    # must land on the portal, or they go looking for a catalog that is not here.
    res = portal.get("/")
    assert res.status_code == 200
    body = res.text
    assert 'id="how-it-works"' not in body  # not the pilot's landing
    assert 'id="root"' in body              # the console shell


def test_the_deployment_root_serves_no_catalog(portal):
    register_provider(portal, email="a@example.com", org_name="Alpha College")
    # Loud, not empty: a provider who pasted the bare origin into DIRECTORY_URL
    # must find out at once, not ship an app that shows nothing.
    for path in ("/api/v1/directory", "/api/v1/directory/1", "/api/universal-login/lms/search"):
        res = portal.get(path)
        assert res.status_code == 404, path
    assert portal.get("/lms").json() == []
    assert portal.get("/lms/1").status_code == 404
    # The root config still answers, because the console reads it to decide which
    # workspace to show. It reports a mode no app implements as a catalog.
    assert portal.get("/api/v1/config").json()["directory_mode"] == "portal"


# ── the provider workspace ────────────────────────────

def test_my_lms_never_shows_another_organizations_platforms(portal):
    (a_token, _, a_lms), (b_token, _, b_lms) = two_providers(portal)
    assert [p["id"] for p in portal.get("/my/lms", headers=auth(a_token)).json()] == [a_lms["id"]]
    assert [p["id"] for p in portal.get("/my/lms", headers=auth(b_token)).json()] == [b_lms["id"]]


def test_reading_or_editing_another_organizations_platform_is_not_found(portal):
    (a_token, _, _), (b_token, _, b_lms) = two_providers(portal)
    assert portal.get(f"/my/lms/{b_lms['id']}", headers=auth(a_token)).status_code == 404
    assert portal.put(
        f"/my/lms/{b_lms['id']}", json={"name": "hijacked"}, headers=auth(a_token)
    ).status_code == 404
    assert portal.post(
        f"/my/lms/{b_lms['id']}/request-review", headers=auth(a_token)
    ).status_code == 404
    # …and B's platform is untouched.
    assert portal.get(f"/my/lms/{b_lms['id']}", headers=auth(b_token)).json()["name"] == "Beta Main"


def test_a_provider_cannot_reach_the_global_admin_surface(portal):
    (a_token, _, _), (_, b_org, b_lms) = two_providers(portal)
    headers = auth(a_token)
    forbidden = [
        ("get", "/admin/lms", None),
        ("get", "/admin/overview", None),
        ("get", "/admin/users", None),
        ("get", "/admin/orgs", None),
        ("get", "/admin/reports", None),
        ("get", "/admin/reports/stats", None),
        ("get", "/admin/reports/by-lms", None),
        ("get", f"/admin/lms/{b_lms['id']}/events", None),
        ("post", f"/admin/lms/{b_lms['id']}/block", None),
        ("post", f"/admin/lms/{b_lms['id']}/unblock", None),
        ("post", f"/admin/lms/{b_lms['id']}/recheck", None),
        ("post", f"/admin/lms/{b_lms['id']}/notify-owner", None),
        ("put", f"/admin/lms/{b_lms['id']}", {"name": "hijacked"}),
        ("patch", f"/admin/lms/{b_lms['id']}", {"status": "rejected"}),
        ("patch", f"/admin/lms/{b_lms['id']}/review", {"admin_reviewed": True}),
        ("patch", f"/admin/orgs/{b_org['id']}", {"active": False}),
    ]
    for method, path, body in forbidden:
        res = getattr(portal, method)(path, headers=headers, **({"json": body} if body else {}))
        assert res.status_code == 403, f"{method.upper()} {path} -> {res.status_code}"


def test_a_provider_cannot_promote_or_unblock_its_own_listing(portal):
    token, org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    lms = add_platform(portal, token, name="Alpha Main", base_url="https://alpha.example.edu")

    # These fields are simply not in the owner schema, so they are dropped rather
    # than applied — an owner edit can never become a moderation decision.
    res = portal.put(
        f"/my/lms/{lms['id']}",
        json={"name": "Renamed", "featured": True, "status": "rejected", "admin_reviewed": True},
        headers=auth(token),
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed"
    assert res.json()["featured"] is False
    assert res.json()["status"] == "approved"


def test_platform_ownership_comes_from_the_account_not_the_request(portal):
    (a_token, a_org, _), (_, b_org, _) = two_providers(portal)
    # Even if a client invents an organization_id, creation uses the caller's own.
    created = portal.post(
        "/lms",
        json={"name": "Sneaky", "base_url": "https://sneaky.example.edu",
              "platform_name": "Sneaky", "oauth_client_id": "x",
              "organization_id": b_org["id"]},
        headers=auth(a_token),
    )
    assert created.status_code == 201
    assert created.json()["organization_id"] == a_org["id"]
    b_items = portal.get(f"/p/{b_org['slug']}/api/v1/directory").json()["items"]
    assert "Sneaky" not in {i["title"] for i in b_items}


# ── organizations and their addresses ─────────────────

def test_signing_up_without_an_organization_name_is_rejected(portal):
    res = portal.post("/auth/register", json={
        "email": "a@example.com", "name": "A", "password": "secret123",
    })
    assert res.status_code == 400


def test_slug_is_derived_deduplicated_and_permanent(portal):
    _, first = register_provider(portal, email="a@example.com", org_name="Alpha College")
    assert first["slug"] == "alpha-college"

    _, second = register_provider(portal, email="b@example.com", org_name="Alpha College")
    assert second["slug"] == "alpha-college-2"

    token = portal.post(
        "/auth/login", json={"email": "a@example.com", "password": "secret123"}
    ).json()["access_token"]
    # A slug is compiled into shipped apps. The update endpoint does not accept
    # one, so a rename cannot take an installed app offline.
    res = portal.patch(
        "/provider/org",
        json={"name": "Alpha University", "slug": "something-else"},
        headers=auth(token),
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Alpha University"
    assert res.json()["slug"] == "alpha-college"


def test_reserved_and_malformed_slugs_are_refused(portal):
    for bad in ("admin", "api", "wizard", "guide", "uploads", "p"):
        res = portal.post("/auth/register", json={
            "email": f"{bad}@example.com", "name": "X", "password": "secret123",
            "organization_name": "X Group", "organization_slug": bad,
        })
        assert res.status_code == 400, bad
    short = portal.post("/auth/register", json={
        "email": "s@example.com", "name": "X", "password": "secret123",
        "organization_name": "X", "organization_slug": "ab",
    })
    assert short.status_code == 400


def test_directory_url_is_the_absolute_url_a_provider_pastes(portal):
    _, org = register_provider(portal, email="a@example.com", org_name="Alpha College")
    assert org["directory_url"].endswith("/p/alpha-college")
    assert org["directory_url"].startswith("http")


def test_directory_url_uses_the_configured_public_origin(tmp_path):
    from conftest import build_app
    client = build_app(tmp_path, "portal", REGISTRY_PUBLIC_URL="https://providers.example.com")
    _, org = register_provider(client, email="a@example.com", org_name="Alpha College")
    # Behind a proxy the request the app sees is internal http. The URL handed to a
    # provider ends up inside a shipped binary, so it has to be the real one.
    assert org["directory_url"] == "https://providers.example.com/p/alpha-college"


def test_counts_reflect_what_the_app_actually_shows(portal):
    token, _ = register_provider(portal, email="a@example.com", org_name="Alpha College")
    add_platform(portal, token, name="Live", base_url="https://live.example.edu")
    hidden = add_platform(portal, token, name="Draft", base_url="https://draft.example.edu")
    portal.put(f"/my/lms/{hidden['id']}", json={"visibility": "hidden"}, headers=auth(token))

    org = portal.get("/provider/org", headers=auth(token)).json()
    assert org["platform_count"] == 2
    assert org["published_count"] == 1


def test_a_non_provider_account_cannot_use_provider_routes(portal):
    admin_token = _make_superadmin(portal)
    assert portal.get("/provider/org", headers=auth(admin_token)).status_code == 403


# ── the platform operator ─────────────────────────────

def _make_superadmin(client) -> str:
    """Promote the first account into a platform superadmin, the way a real
    deployment does it through ADMIN_EMAIL at first boot."""
    from app.database import SessionLocal
    from app.models import User, UserRole
    from app.auth import hash_password, create_access_token

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "operator@example.com").first()
        if not admin:
            admin = User(
                email="operator@example.com",
                name="Operator",
                password_hash=hash_password("secret123"),
                role=UserRole.admin,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        return create_access_token(admin.id, admin.role.value)
    finally:
        db.close()


def test_the_operator_sees_every_tenant(portal):
    two_providers(portal)
    admin_token = _make_superadmin(portal)
    orgs = portal.get("/admin/orgs", headers=auth(admin_token)).json()
    assert {o["slug"] for o in orgs} == {"alpha-college", "beta-institute"}
    assert {o["owner_email"] for o in orgs} == {"a@example.com", "b@example.com"}
    assert all(o["directory_url"].endswith(f"/p/{o['slug']}") for o in orgs)


def test_org_admin_routes_are_absent_outside_portal_mode(search):
    res = search.post("/auth/register", json={
        "email": "op@example.com", "name": "Op", "password": "secret123",
    })
    token = res.json()["access_token"]
    # A plain search deployment has no tenants at all; the routes must not exist
    # rather than return an empty list that implies they might.
    assert search.get("/provider/org", headers=auth(token)).status_code in (403, 404)


# ── things portal mode changes for everyone ───────────

def test_url_probing_requires_an_account_in_portal_mode(portal):
    anonymous = portal.post("/validate-lms", json={"base_url": "https://example.edu"})
    assert anonymous.status_code == 401

    token, _ = register_provider(portal, email="a@example.com", org_name="Alpha College")
    signed_in = portal.post(
        "/validate-lms", json={"base_url": "https://not-a-real-host.invalid"}, headers=auth(token)
    )
    assert signed_in.status_code == 200


def test_uploads_take_their_extension_from_the_bytes(portal):
    token, _ = register_provider(portal, email="a@example.com", org_name="Alpha College")
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64

    ok = portal.post(
        "/uploads",
        files={"file": ("logo.html", png, "image/png")},
        headers=auth(token),
    )
    assert ok.status_code == 200
    # Uploads are served same-origin as the console. A file that claims to be a
    # PNG but is named .html must not land at a URL that runs as a page.
    assert ok.json()["url"].endswith(".png")

    not_an_image = portal.post(
        "/uploads",
        files={"file": ("logo.png", b"<script>alert(1)</script>", "image/png")},
        headers=auth(token),
    )
    assert not_an_image.status_code == 400
