#!/usr/bin/env bash
# Proves the registry still does what it claims: the two original deployment
# modes are unchanged, provider-portal tenants cannot see or touch each other,
# and the schema change is safe to run twice against the live database.
set -euo pipefail
cd "$(dirname "$0")"
PY=.venv/bin/python
[ -x "$PY" ] || PY=python3
"$PY" -m pytest -q
