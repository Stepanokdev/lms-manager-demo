# LMS Registry — API contract

Version `0.4.x`. This is the authoritative contract the web console and the
mobile apps depend on. Interactive docs are always available at `/docs`
(Swagger) on a running instance.

Base URL of the pilot: `https://openedx-lms.stepanok.com`.

`DIRECTORY_MODE` is `search` | `curated` | `portal`. In `portal` mode the public
endpoints below move under a per-organization prefix — see
[Provider portal](#provider-portal-directory_modeportal).

## Auth

Bearer JWT. Obtain a token from `/auth/login` or `/auth/register`, send it as
`Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | – | Create an owner account, returns a token. In `portal` mode `organization_name` is required (optional `organization_slug`) and creates the organization with it. Rejected in `curated` mode |
| POST | `/auth/login` | – | Log in, returns a token |
| GET | `/auth/me` | user | Current user |

## LMS owner

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/lms` | user | Submit an LMS (auto-approved when `AUTO_APPROVE`). In `portal` mode it is stamped with the caller's organization |
| GET | `/my/lms` | user | My submissions — in `portal` mode, my organization's |
| GET | `/my/lms/{id}` | user | Full record for one of mine; `404` for anyone else's |
| PUT | `/my/lms/{id}` | user | Edit one of mine. `status`, `featured` and `admin_reviewed` are not accepted |
| POST | `/my/lms/{id}/request-review` | user | Ask for a re-review after a block |
| POST | `/uploads` | user | Upload a logo/background (≤ 2 MB). The extension comes from the file's magic bytes, not its name |
| POST | `/validate-lms` | – | Probe reachability + OAuth client id. Requires auth in `portal` mode, quota per account |

`GET /lms` and `GET /lms/{id}` are public but redacted: no `owner_email`,
`block_reason`, review or health state, and only **approved** platforms resolve.

## Public (mobile apps)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/config` | Directory mode + provider branding |
| GET | `/api/v1/directory?q=&featured=&limit=` | Search / curated list |
| GET | `/api/v1/directory/{id}` | Full LMS detail |
| POST | `/api/v1/reports` | File a complaint about an LMS |

Aliases `/api/universal-login/lms/search`, `/api/universal-login/lms/{id}`, and
`/api/universal-login/reports` map to the same handlers.

### `GET /api/v1/config`
```json
{ "directory_mode": "search", "provider_name": "Open X Project",
  "provider_tagline": "One app for every Open edX platform", "provider_logo_url": null }
```

`directory_mode` is `search` | `curated` | `portal`. The apps act on `curated`
(fixed list, no search box) and treat everything else as `search`, so a `portal`
value at the site root is not a catalog the apps can use — which is the point:
`/api/v1/directory` at the root of a portal returns `404`.

### `GET /api/v1/directory`
- `q` — free text (name / domain / URL).
- `featured=true` — return only featured instances (curated list).
- Curated mode returns featured instances regardless of `q`.
- Hidden instances are returned only on an exact `base_url`/host match.

Items carry `id, title, short_description, base_url, logo_url, accent_color,
visibility, featured`.

### `POST /api/v1/reports`
```json
{ "lms_id": 12, "base_url": "https://lms.example.com", "category": "inappropriate",
  "message": "…", "reporter_email": "learner@example.com",
  "platform": "ios", "app_version": "2.4.0",
  "screenshot_base64": "data:image/jpeg;base64,…" }
```
- Provide `lms_id` or `base_url` (the registry links the report to an LMS).
- `category` ∈ `inappropriate | scam | impersonation | spam | broken | other`.
- `screenshot_base64` is optional evidence: PNG, JPEG or WebP, ≤ 4 MB decoded.
- Returns `{ "id": 41, "status": "new" }`, and fires the configured webhook.
- Closed (`403`) in `curated` mode and on every provider directory.

## Provider portal (`DIRECTORY_MODE=portal`)

One deployment, many provider organizations. Each gets a permanent slug and
serves the public contract above under `/p/{slug}`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/p/{slug}/api/v1/config` | Always `directory_mode: "curated"`, with the organization's name, tagline and logo |
| GET | `/p/{slug}/api/v1/directory` | That organization's approved + public platforms, by `sort_order` |
| GET | `/p/{slug}/api/v1/directory/{id}` | Full detail; `404` if the id is another organization's |
| POST | `/p/{slug}/api/v1/reports` | Always `403` |

Aliases `/p/{slug}/api/universal-login/lms/search` and `/…/{id}` map to the same
handlers. An unknown slug and a suspended organization both return
`404 Unknown directory`, so a portal's tenants cannot be enumerated.

The apps resolve their paths relative to `DIRECTORY_URL`, so no mobile change is
needed — iOS via `URL.appendingPathComponent`, Android via Retrofit relative
paths. Slugs are `[a-z0-9-]{3,32}`, may not be a reserved word, and are
**immutable** once issued because they are compiled into shipped builds.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/provider/org` | user | My organization + `directory_url` + counts |
| PATCH | `/provider/org` | user | Name, tagline, logo, contact email. `slug` not accepted |
| GET | `/admin/orgs` | admin | Every organization on the deployment |
| PATCH | `/admin/orgs/{id}` | admin | `{"active": bool}` — suspend / restore |

A provider account is `role = user` with an `organization_id`; `require_admin`
therefore rejects it, so the global `/admin/*` surface is unreachable to tenants
by construction. The organization is always resolved from the account, never from
the request.

## Admin

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/overview` | Aggregate counts (LMS + reports) |
| GET | `/admin/lms?q=&status_filter=&reviewed=&visibility=&featured=&limit=&offset=` | Search/paginate LMS |
| PUT | `/admin/lms/{id}` | Full update (visibility, featured, flags, …) |
| PATCH | `/admin/lms/{id}` | Update status only |
| PATCH | `/admin/lms/{id}/review` | Mark reviewed / unreviewed |
| POST | `/admin/lms/{id}/recheck` | Re-probe health on demand |
| GET | `/admin/reports?status=` | Triage inbox (severity-sorted) |
| GET | `/admin/reports/stats` | Counts for the live badge |
| PATCH | `/admin/reports/{id}` | Set status + resolution note |
| GET | `/admin/users` | List users |
| POST | `/admin/users` | Create an admin |
| PATCH | `/admin/users/{id}/role` | Promote / revoke admin |
| GET | `/admin/lms/{id}` | Full record for one platform |
| GET | `/admin/lms/{id}/events` | Moderation timeline (audit) |
| POST | `/admin/lms/{id}/block` · `/unblock` | Remove / restore in the catalog |
| POST | `/admin/lms/{id}/notify-owner` | Compose (and send, if SMTP is set) the owner notice |
| GET | `/admin/reports/by-lms` | Grouped triage (+ distinct reporters) |

## Severity

Report severity is derived from the category: `inappropriate`, `scam` and
`impersonation` are **high**; `spam` and `broken` are **medium**; `other` is
**low**. The inbox sorts high first, then newest.

## Data model (essentials)

- **LMSInstance**: identity + OAuth, theming, feature flags
  (`pre_login_discovery`, `unknown_units_mode`, `offline_downloads`,
  `smart_push_automation`, …), catalog placement (`visibility`, `featured`,
  `sort_order`), moderation (`status`, `admin_reviewed`), health
  (`last_checked_at`, `last_health_ok`, `last_health_note`).
- **Report**: `lms_id`/`reported_base_url`, `category`, `severity`, `message`,
  `reporter_email`, `platform`, `app_version`, `status`, `resolution_note`.
- **User**: `role` = `admin | user`, plus a nullable `organization_id`.
- **Organization** (`portal`): `slug` (unique, immutable), `name`, `tagline`,
  `logo_url`, `contact_email`, `active`. `LMSInstance.organization_id` scopes a
  platform to one; `NULL` means it belongs to no tenant and appears in no
  provider directory.
