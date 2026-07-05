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
| `DIRECTORY_MODE` | `search` (public catalog) or `curated` (provider mode) |
| `PROVIDER_NAME` / `PROVIDER_TAGLINE` | Branding on the app landing + console |
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
