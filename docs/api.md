# API reference

The registry exposes a small HTTP API. Interactive docs (Swagger) are always at
**`/docs`** on a running instance; this page is the summary. Auth is a Bearer JWT
from `/auth/login` or `/auth/register`.

## Public (used by the mobile apps)

!!! note "`GET /lms` and `GET /lms/{id}`"
    These two return a redacted view — no owner email, block reason, or review
    and health state — and `/lms/{id}` resolves only **approved** platforms. An
    owner reads their own full record from `/my/lms/{id}`. In `portal` mode
    `/lms` is empty and `/lms/{id}` is `404`, because a deployment-wide list
    would expose every tenant.


| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/config` | Directory mode + provider branding |
| `GET` | `/api/v1/directory?q=&featured=&limit=` | Search / curated list |
| `GET` | `/api/v1/directory/{id}` | Full platform detail (theme, feature flags) |
| `POST` | `/api/v1/reports` | File a complaint (optionally with a base64 screenshot) |

`/api/universal-login/lms/search`, `/…/{id}`, and `/…/reports` are aliases of the
same handlers.

### Per-organization directories (`portal` mode only)

In `portal` mode the same public endpoints live under a per-organization prefix,
and the site root serves no catalog at all:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/p/{slug}/api/v1/config` | Always `directory_mode: "curated"`, plus that organization's name, tagline and logo |
| `GET` | `/p/{slug}/api/v1/directory` | That organization's published platforms, ordered by `sort_order` |
| `GET` | `/p/{slug}/api/v1/directory/{id}` | Full detail — `404` if the id belongs to another organization |
| `POST` | `/p/{slug}/api/v1/reports` | Always `403`; provider directories have no complaint channel |

`/p/{slug}/api/universal-login/lms/search` and `/…/{id}` are aliases.

An unknown slug and a suspended organization both answer `404 Unknown directory`,
so the responses can't be used to enumerate the providers on a portal.

The apps need no change for this: they resolve their paths **relative to
`DIRECTORY_URL`**, so setting it to `https://host/p/acme` yields
`https://host/p/acme/api/v1/config`.

At the site root in `portal` mode, `/api/v1/config` reports
`directory_mode: "portal"` (the console reads it to decide which workspace to
render) while `/api/v1/directory` returns `404` with an explanation — so a build
that was pointed at the bare origin fails loudly instead of showing an empty list.

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
| `GET` | `/my/lms` | My platforms — in `portal` mode, my organization's |
| `GET` | `/my/lms/{id}` | Full record for one of mine (what the wizard loads to edit) |
| `PUT` | `/my/lms/{id}` | Edit one of mine. Moderation fields (`status`, `featured`, `admin_reviewed`) are not accepted |
| `POST` | `/my/lms/{id}/request-review` | Ask for a re-review after fixing a block |
| `POST` | `/validate-lms` | Check a URL + OAuth client are reachable. Requires auth in `portal` mode |

Anything that belongs to another owner or organization answers `404`, not `403`,
so ids can't be probed.

### Provider (`portal` mode only)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/provider/org` | My organization, its `directory_url` and platform counts |
| `PATCH` | `/provider/org` | Update name, tagline, logo, contact email. `slug` is **not** accepted — it is compiled into shipped apps |

The organization is resolved from the account, never from the request, so a token
minted for one provider cannot be aimed at another by editing a path or a body.

Sign-up in `portal` mode goes through the ordinary `POST /auth/register` with an
extra required `organization_name` (and an optional `organization_slug`); the
account and the organization are created together.

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
| `GET` | `/admin/lms/{id}` | Full record for one platform |
| `GET` `POST` | `/admin/users`, `/admin/users/{id}/role` | Manage the team |
| `GET` | `/admin/orgs` | *(portal)* Every organization, its directory URL and owner |
| `PATCH` | `/admin/orgs/{id}` | *(portal)* Suspend or restore one organization |

The full field-level contract lives in `SPEC.md` in the repository root.
