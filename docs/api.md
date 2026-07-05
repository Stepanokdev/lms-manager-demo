# API reference

The registry exposes a small HTTP API. Interactive docs (Swagger) are always at
**`/docs`** on a running instance; this page is the summary. Auth is a Bearer JWT
from `/auth/login` or `/auth/register`.

## Public (used by the mobile apps)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/config` | Directory mode + provider branding |
| `GET` | `/api/v1/directory?q=&featured=&limit=` | Search / curated list |
| `GET` | `/api/v1/directory/{id}` | Full platform detail (theme, feature flags) |
| `POST` | `/api/v1/reports` | File a complaint (optionally with a base64 screenshot) |

`/api/universal-login/lms/search`, `/…/{id}`, and `/…/reports` are aliases of the
same handlers.

### File a complaint

```json
POST /api/v1/reports
{
  "lms_id": 12,
  "base_url": "https://learn.example.com",
  "category": "inappropriate",
  "message": "…",
  "reporter_email": "learner@example.com",
  "platform": "ios",
  "app_version": "2.4.0",
  "screenshot_base64": "data:image/jpeg;base64,…"
}
```

`category` is one of `inappropriate`, `scam`, `impersonation`, `spam`, `broken`,
`other`. Provide `lms_id` or `base_url`. Rate-limited per IP.

## Owner (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/lms` | Submit a platform (from the wizard) |
| `GET` | `/my/lms` | My platforms |
| `POST` | `/my/lms/{id}/request-review` | Ask for a re-review after fixing a block |
| `POST` | `/validate-lms` | Check a URL + OAuth client are reachable |

## Admin (authenticated, admin role)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/overview` | Aggregate counts |
| `GET` | `/admin/lms` | Search / filter / paginate platforms |
| `POST` | `/admin/lms/{id}/block` · `/unblock` | Remove / restore in the catalog |
| `POST` | `/admin/lms/{id}/recheck` | Re-probe health |
| `PATCH` | `/admin/lms/{id}/review` | Mark reviewed |
| `GET` | `/admin/lms/{id}/events` | Moderation timeline (audit) |
| `GET` | `/admin/reports` | Triage inbox (filters: status/category/severity/platform) |
| `GET` | `/admin/reports/by-lms` | Grouped by platform (+ distinct reporters) |
| `GET` | `/admin/reports/stats` | Counts for the live badge |
| `PATCH` | `/admin/reports/{id}` | Set status + note |
| `POST` | `/admin/lms/{id}/notify-owner` | Compose / send the owner notice |
| `GET` `POST` | `/admin/users`, `/admin/users/{id}/role` | Manage the team |

The full field-level contract lives in
[`SPEC.md`](https://github.com/) in the repository root.
