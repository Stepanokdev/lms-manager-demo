"""
Multi-tenancy for portal mode.

One deployment, many provider organizations. Each provider owns a slug, and that
slug is the whole isolation boundary: ``/p/<slug>/api/v1/...`` serves only that
organization's platforms, and every authenticated provider route resolves the
caller's organization from their own account rather than from anything the client
sends.

Two rules the rest of the app depends on:

1. **A provider is never an admin.** Provider accounts are ``UserRole.user`` with
   an ``organization_id``. ``require_admin`` therefore rejects them, which is why
   the 14 global ``/admin/*`` routes need no per-org filtering to stay safe.
2. **Slugs are permanent.** The directory URL is compiled into shipped mobile
   builds. Renaming a slug would break every install in the field, so nothing in
   this module or the API lets a slug change after creation.
"""
import re

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .auth import get_current_user
from .config import get_config
from .database import get_db
from .models import Organization, User

SLUG_MIN = 3
SLUG_MAX = 32
_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")

# Paths the app already serves at the origin root. A slug may not shadow one,
# because the provider's directory URL is handed out as `<origin>/p/<slug>` and
# people reasonably try `<origin>/<slug>` too — better that it never resolves to
# something surprising. Kept deliberately generous.
RESERVED_SLUGS = {
    "admin", "api", "auth", "dashboard", "docs", "guide", "lms", "my",
    "openapi", "p", "provider", "redoc", "static", "uploads", "validate-lms",
    "wizard", "www", "assets", "_next", "health", "about", "support", "help",
    "login", "logout", "register", "settings", "new", "edit", "index",
}


def normalize_slug(value: str) -> str:
    """Lowercase, collapse anything that is not a letter or digit into hyphens."""
    text = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower())
    return text.strip("-")


def validate_slug(value: str) -> str:
    """Return a clean slug or raise a 400 explaining exactly what is wrong."""
    slug = normalize_slug(value)
    if len(slug) < SLUG_MIN:
        raise HTTPException(
            status_code=400,
            detail=f"The address needs at least {SLUG_MIN} letters or digits.",
        )
    if len(slug) > SLUG_MAX:
        raise HTTPException(
            status_code=400,
            detail=f"The address can be at most {SLUG_MAX} characters.",
        )
    if not _SLUG_RE.match(slug):
        raise HTTPException(
            status_code=400,
            detail="Use lowercase letters, digits and hyphens only.",
        )
    if slug in RESERVED_SLUGS:
        raise HTTPException(status_code=400, detail=f"'{slug}' is reserved. Pick another address.")
    return slug


def unique_slug(db: Session, desired: str) -> str:
    """`desired` if free, otherwise the same slug with the smallest free suffix."""
    base = validate_slug(desired)
    if not db.query(Organization).filter(Organization.slug == base).first():
        return base
    for n in range(2, 1000):
        candidate = f"{base}-{n}"[:SLUG_MAX].rstrip("-")
        if not db.query(Organization).filter(Organization.slug == candidate).first():
            return candidate
    raise HTTPException(status_code=400, detail="That address is taken. Pick another one.")


def public_origin(request: Request | None) -> str:
    """
    The absolute ``https://host`` this deployment is reached at.

    ``REGISTRY_PUBLIC_URL`` wins when set, because behind Traefik the request the
    app sees is plain http on an internal name, and the directory URL we hand a
    provider ends up baked into a mobile build — it has to be the real one.
    """
    configured = (get_config().registry_public_url or "").strip().rstrip("/")
    if configured:
        return configured
    if request is None:
        return ""
    origin = str(request.base_url).rstrip("/")
    if request.headers.get("x-forwarded-proto") == "https":
        origin = origin.replace("http://", "https://", 1)
    return origin


def directory_url_for(org: Organization, request: Request | None) -> str:
    """The URL a provider pastes into ``LMS_DIRECTORY.DIRECTORY_URL``."""
    return f"{public_origin(request)}/p/{org.slug}"


def require_portal_mode() -> None:
    """Guard for routes that only exist in a provider-portal deployment."""
    if not get_config().is_portal:
        raise HTTPException(status_code=404, detail="Not found")


def org_by_slug(slug: str, db: Session) -> Organization:
    """
    Resolve a public ``/p/<slug>`` prefix.

    An unknown slug, a suspended organization and a non-portal deployment all
    return the same 404 on purpose: the response must not tell a stranger which
    organizations exist here.
    """
    require_portal_mode()
    org = (
        db.query(Organization)
        .filter(Organization.slug == (slug or "").strip().lower())
        .first()
    )
    if not org or not org.active:
        raise HTTPException(status_code=404, detail="Unknown directory")
    return org


def get_public_org(slug: str, db: Session = Depends(get_db)) -> Organization:
    """FastAPI dependency form of :func:`org_by_slug` for ``/p/{slug}/...`` routes."""
    return org_by_slug(slug, db)


def require_org(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Organization:
    """
    The caller's own organization, for authenticated ``/provider/*`` routes.

    Resolved from the account, never from the request — a token minted for one
    provider can therefore not be pointed at another provider's data by editing
    a path or a body field.
    """
    require_portal_mode()
    if user.organization_id is None:
        raise HTTPException(status_code=403, detail="This account is not a provider account.")
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(status_code=403, detail="This account is not a provider account.")
    if not org.active:
        raise HTTPException(
            status_code=403,
            detail="This organization is suspended. Contact the registry operator.",
        )
    return org
