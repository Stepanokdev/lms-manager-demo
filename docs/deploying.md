# Configuration & deployment

The backend is a plain Python (FastAPI) app. The web apps (wizard + console) are
pre-built into `app/static/`, so the container needs no Node step.

## Run locally

```bash
python3.12 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
SEED_DEMO=1 python run.py          # http://localhost:8000
```

- `/dashboard` — admin console
- `/wizard/` — registration wizard
- `/docs` — interactive API docs

Demo logins (only when `SEED_DEMO=1`): `admin@demo.com / admin123` and
`user@demo.com / user123`.

Rebuild the web apps after changing them:

```bash
cd wizard && npm install && npm run build && cd ..
cd admin  && npm install && npm run build && cd ..
```

## Configuration

Set as environment variables, or in a `provider_config.json` at the repo root
(env wins). Everything has a working default.

| Key | Meaning |
|-----|---------|
| `DIRECTORY_MODE` | `search` (public catalog), `curated` (one organization) or `portal` (many provider organizations) — see [Three ways to run it](modes.md) |
| `PROVIDER_NAME` / `PROVIDER_TAGLINE` | Branding on the app landing + console |
| `REGISTRY_PUBLIC_URL` | Canonical `https://` origin. **Required in `portal` mode** |
| `AUTO_APPROVE` | New submissions go live immediately (default `true`) |
| `WEBHOOK_URL` / `WEBHOOK_SECRET` | POST on each new complaint (Slack/Discord/…) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Send owner emails; without these the console opens a pre-filled mail draft instead |

### Production must-sets

!!! danger "Set these before a real production deploy"
    - **`SECRET_KEY`** — a strong random string. Without it, sign-in tokens use a
      throwaway key that resets on every restart.
    - **`ADMIN_EMAIL` + `ADMIN_PASSWORD`** — on a fresh database the first admin is
      created from these. Leave `SEED_DEMO` unset so demo credentials are never
      shipped.
    - **`DATABASE_URL`** — optional; point at PostgreSQL for many concurrent
      writers. Defaults to SQLite (with WAL enabled), which is fine for the pilot.

## Deploy (Docker + Traefik)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` attaches the container to a Traefik `web` network with
TLS. Persist `./data` as a volume. Verify after deploy:

```bash
curl -s https://YOUR-HOST/api/v1/config
```

## Running a provider portal

A portal is the same image with a different mode, its own database and its own
hostname. Run it **alongside** an existing catalog rather than converting one.

```bash
DIRECTORY_MODE=portal
REGISTRY_PUBLIC_URL=https://providers.example.com
SECRET_KEY=<a long random string>
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<set before first boot>
```

!!! warning "`REGISTRY_PUBLIC_URL` is not optional here"
    Behind a reverse proxy the request the app sees is plain HTTP on an internal
    hostname. The address a provider is handed ends up compiled into a shipped
    mobile binary — set this, or every provider ships the wrong URL.

!!! warning "Start from an empty database"
    A row created before the switch belongs to no organization, so it appears in
    no `/p/<slug>` directory. That is the safe outcome, not a useful one. Give a
    portal its own database and its own `./data` volume.

The repository ships `docker-compose.portal.yml` as a second Traefik service on
the same host — its own Compose **project name**, container name, volume
(`./data-portal`), `Host()` rule and `.env.portal`:

```bash
cp .env.portal.example .env.portal   # then fill it in
mkdir -p data-portal
docker compose -f docker-compose.yml -f docker-compose.portal.yml up -d --build
```

!!! danger "The project name is what keeps the two apart"
    Both stacks are launched from the same directory, and Compose identifies a
    project by that directory. `docker-compose.portal.yml` sets
    `name: openedx-lms-portal` for exactly this reason — without it, starting the
    portal reads as *recreate the public catalog with new settings* and takes the
    running pilot down. Don't remove it, and check `docker compose … config | head -1`
    says `name: openedx-lms-portal` before you bring anything up.

Point a DNS `A` record at the server for the `Host()` in the compose file first;
Traefik gets the certificate on the first request.

Verify:

```bash
curl -s https://providers.example.com/api/v1/config     # {"directory_mode":"portal",…}
curl -s https://providers.example.com/p/<slug>/api/v1/config  # {"directory_mode":"curated",…}
```

## Tests

```bash
pip install -r requirements-dev.txt
./verify.sh
```

Covers cross-organization isolation in `portal` mode, that `search` and `curated`
still behave exactly as before, and that the schema migration is safe to run twice
against a copy of the production database.
