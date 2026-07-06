# LMS Registry — API contract

Version `0.3.x`. This is the authoritative contract the web console and the
mobile apps depend on. Interactive docs are always available at `/docs`
(Swagger) on a running instance.

Base URL in production: `https://openedx-lms.stepanok.com`.

## Auth

Bearer JWT. Obtain a token from `/auth/login` or `/auth/register`, send it as
`Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | – | Create an owner account, returns a token |
| POST | `/auth/login` | – | Log in, returns a token |
| GET | `/auth/me` | user | Current user |

## LMS owner

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/lms` | user | Submit an LMS (auto-approved when `AUTO_APPROVE`) |
| GET | `/my/lms` | user | My submissions |
| POST | `/uploads` | user | Upload a logo/background (≤ 2 MB, images) |
| POST | `/validate-lms` | – | Probe reachability + OAuth client id |

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

### `GET /api/v1/directory`
- `q` — free text (name / domain / URL).
- `featured=true` — return only featured instances (curated list).
- Curated mode returns featured instances regardless of `q`.
- Hidden instances are returned only on an exact `base_url`/host match.

Items carry `id, title, short_description, base_url, logo_url, accent_color,
visibility, featured`.

### `POST /api/v1/reports`
```json
{ "lms_id": 12, "base_url": "https://lms.example.com", "category": "login",
  "message": "…", "reporter_email": "learner@example.com",
  "platform": "ios", "app_version": "2.4.0" }
```
- Provide `lms_id` or `base_url` (the registry links the report to an LMS).
- `category` ∈ `login | content | branding | unreachable | inappropriate | other`.
- Returns `{ "id": 41, "status": "new" }`, and fires the configured webhook.

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

## Severity

Report severity is derived from the category: `login`, `unreachable`, and
`inappropriate` are **high**; `content` is **medium**; `branding` and `other`
are **low**. The inbox sorts high first, then newest.

## Data model (essentials)

- **LMSInstance**: identity + OAuth, theming, feature flags
  (`pre_login_discovery`, `unknown_units_mode`, `offline_downloads`,
  `smart_push_automation`, …), catalog placement (`visibility`, `featured`,
  `sort_order`), moderation (`status`, `admin_reviewed`), health
  (`last_checked_at`, `last_health_ok`, `last_health_note`).
- **Report**: `lms_id`/`reported_base_url`, `category`, `severity`, `message`,
  `reporter_email`, `platform`, `app_version`, `status`, `resolution_note`.
- **User**: `role` = `admin | user`.
