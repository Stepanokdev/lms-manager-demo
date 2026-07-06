"""
Application configuration.

Values are read from environment variables first, then from an optional
``provider_config.json`` file at the repository root, then fall back to the
defaults below. This lets a provider fork the repository and configure it in
one place without touching code.

Two operating modes exist:

* ``search``  — public catalog. Any owner registers an LMS and it becomes
  discoverable through the mobile search. This is the pilot default.
* ``curated`` — provider / white-label mode. The mobile app skips the search
  step and shows a fixed list of the provider's own LMS instances (the ones
  flagged ``featured``) so a user can pick one immediately.
"""
import json
import os
from functools import lru_cache
from pathlib import Path

_CONFIG_FILE = Path(__file__).resolve().parent.parent / "provider_config.json"

_DEFAULTS = {
    "directory_mode": "search",          # "search" | "curated"
    "provider_name": "Open X Project",
    "provider_tagline": "One app for every Open edX platform",
    "provider_logo_url": "",
    "auto_approve": True,                 # new submissions go live immediately
    "webhook_url": "",                    # outgoing POST on each new complaint
    "webhook_secret": "",                 # optional shared secret header
    "registry_public_url": "",            # canonical https origin for absolute asset URLs
    # SMTP — used to email an LMS owner when their instance is moderated.
    # When unset, the console falls back to opening the admin's mail client.
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_password": "",
    "smtp_from": "",
    "smtp_use_tls": True,
}

_BOOL_KEYS = {"auto_approve", "smtp_use_tls"}


def _coerce_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _load_file() -> dict:
    if not _CONFIG_FILE.exists():
        return {}
    try:
        with _CONFIG_FILE.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


class AppConfig:
    """Resolved runtime configuration (env > file > defaults)."""

    def __init__(self) -> None:
        file_cfg = _load_file()
        resolved: dict = {}
        for key, default in _DEFAULTS.items():
            env_key = key.upper()
            if env_key in os.environ:
                raw = os.environ[env_key]
            elif key in file_cfg:
                raw = file_cfg[key]
            else:
                raw = default
            resolved[key] = _coerce_bool(raw) if key in _BOOL_KEYS else raw

        mode = str(resolved["directory_mode"]).strip().lower()
        resolved["directory_mode"] = mode if mode in {"search", "curated"} else "search"

        self.directory_mode: str = resolved["directory_mode"]
        self.provider_name: str = resolved["provider_name"]
        self.provider_tagline: str = resolved["provider_tagline"]
        self.provider_logo_url: str = resolved["provider_logo_url"]
        self.auto_approve: bool = resolved["auto_approve"]
        self.webhook_url: str = resolved["webhook_url"]
        self.webhook_secret: str = resolved["webhook_secret"]
        self.registry_public_url: str = resolved["registry_public_url"]
        self.smtp_host: str = resolved["smtp_host"]
        try:
            self.smtp_port: int = int(resolved["smtp_port"])
        except (TypeError, ValueError):
            self.smtp_port = 587
        self.smtp_user: str = resolved["smtp_user"]
        self.smtp_password: str = resolved["smtp_password"]
        self.smtp_from: str = resolved["smtp_from"] or resolved["smtp_user"]
        self.smtp_use_tls: bool = resolved["smtp_use_tls"]

    @property
    def is_curated(self) -> bool:
        return self.directory_mode == "curated"

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)

    def public_dict(self) -> dict:
        """Fields safe to expose to the mobile app via /api/v1/config."""
        return {
            "directory_mode": self.directory_mode,
            "provider_name": self.provider_name,
            "provider_tagline": self.provider_tagline,
            "provider_logo_url": self.provider_logo_url or None,
        }


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    return AppConfig()
