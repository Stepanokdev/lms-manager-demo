import os
import uuid
import base64
import binascii
import datetime
from pathlib import Path

import httpx
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel as _BaseModel
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload

from .database import Base, engine, get_db
from .models import (
    User, LMSInstance, LMSStatus, UserRole, Visibility,
    Report, ReportCategory, ReportStatus, ReportSeverity, CATEGORY_SEVERITY,
    ModerationEvent,
)
from .schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    AdminCreateRequest, UserRoleUpdateRequest,
    LMSCreateRequest, LMSUpdateStatusRequest, LMSFullUpdateRequest,
    LMSReviewRequest, LMSResponse,
    ReportCreateRequest, ReportCreateResponse, ReportUpdateRequest,
    ReportResponse, ReportStats, PublicConfigResponse, NotifyOwnerResponse,
    ModerationEventResponse, AffectedLMS, ReportLMSBrief,
)
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)
from .color_utils import adapt_accent_for_dark
from .config import get_config
from .database import migrate
from .seed import seed
from . import webhook, email_notify
from .netguard import is_public_url
from .ratelimit import reports_limiter, validate_limiter, client_ip

os.makedirs("data", exist_ok=True)
os.makedirs("data/uploads", exist_ok=True)
# Self-initialize regardless of entry point (uvicorn, gunicorn, run.py).
# create_all adds any new tables; migrate adds new columns; seed is a no-op
# once data exists. All three are idempotent.
Base.metadata.create_all(bind=engine)
migrate()
seed()

app = FastAPI(title="LMS Registry", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # Auth is via Bearer tokens (Authorization header), not cookies, so we do
    # not enable credentials — that keeps a wildcard origin safe.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/uploads")
REPORT_SHOT_DIR = UPLOAD_DIR / "reports"
# No SVG: uploads are served same-origin as the console, and SVG can carry
# scripts (stored XSS). Raster formats only.
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_SIZE = 2 * 1024 * 1024  # 2MB
MAX_SCREENSHOT_SIZE = 4 * 1024 * 1024  # 4MB decoded


def _sniff_image_ext(data: bytes) -> str | None:
    """Return a file extension for a supported image, or None if unrecognized."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def _save_report_screenshot(b64: str | None) -> str:
    """Decode a base64 image from a mobile report and store it. Returns a URL or ''."""
    if not b64:
        return ""
    # A data: URI without a comma would otherwise crash the split.
    raw = b64.split(",", 1)[1] if (b64.startswith("data:") and "," in b64) else b64
    try:
        data = base64.b64decode(raw, validate=False)
    except (binascii.Error, ValueError):
        return ""
    if not data or len(data) > MAX_SCREENSHOT_SIZE:
        return ""
    ext = _sniff_image_ext(data)
    if not ext:
        return ""
    REPORT_SHOT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    (REPORT_SHOT_DIR / filename).write_bytes(data)
    return f"/uploads/reports/{filename}"


# ── Auth ──────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=req.email, name=req.name, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id, user.role.value))


@app.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id, user.role.value))


@app.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


# ── File Upload ───────────────────────────────────────

@app.post("/uploads")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")
    ext = Path(file.filename or "file").suffix or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)
    return {"url": f"/uploads/{filename}"}


# ── LMS Validation / health probe ─────────────────────

class LMSValidateRequest(_BaseModel):
    base_url: str
    oauth_client_id: str = ""


async def _probe_lms(base_url: str, oauth_client_id: str = "") -> dict:
    """Check LMS reachability and (optionally) OAuth Client ID without credentials."""
    base = base_url.rstrip("/")
    result = {"url_valid": False, "oauth_valid": False, "url_error": None, "oauth_error": None}

    # SSRF guard: never let an owner-supplied URL point at our own network.
    if not is_public_url(base):
        result["url_error"] = "This address could not be reached (must be a public https URL)."
        return result

    async with httpx.AsyncClient(timeout=10, follow_redirects=True, verify=False) as client:
        try:
            r = await client.get(f"{base}/user_api/v1/account/registration/")
            if 200 <= r.status_code < 300:
                result["url_valid"] = True
            else:
                r2 = await client.get(f"{base}/oauth2/login/")
                if 200 <= r2.status_code < 400:
                    result["url_valid"] = True
                else:
                    result["url_error"] = f"LMS responded with status {r.status_code}"
        except httpx.ConnectError:
            result["url_error"] = "Cannot connect to this URL. Check that the address is correct."
        except httpx.TimeoutException:
            result["url_error"] = "Connection timed out. The server may be down or unreachable."
        except Exception as e:  # noqa: BLE001
            result["url_error"] = f"Connection failed: {str(e)[:100]}"

    if result["url_valid"] and oauth_client_id:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, verify=False) as client:
            try:
                r = await client.post(
                    f"{base}/oauth2/access_token",
                    data={
                        "client_id": oauth_client_id,
                        "grant_type": "password",
                        "username": "_validate_",
                        "password": "_validate_",
                    },
                )
                body = r.text.lower()
                if "invalid_client" in body:
                    result["oauth_error"] = "OAuth Client ID not found on this LMS. Check the ID."
                elif "invalid_grant" in body or "unauthorized" in body:
                    result["oauth_valid"] = True
                else:
                    result["oauth_valid"] = True
            except Exception as e:  # noqa: BLE001
                result["oauth_error"] = f"Could not verify OAuth ID: {str(e)[:100]}"

    return result


@app.post("/validate-lms")
async def validate_lms(req: LMSValidateRequest, request: Request):
    """Validate LMS reachability and OAuth Client ID without user credentials."""
    if not validate_limiter.allow(client_ip(request), limit=20, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many checks. Try again in a minute.")
    return await _probe_lms(req.base_url, req.oauth_client_id)


# ── Public LMS list ───────────────────────────────────

@app.get("/lms", response_model=list[LMSResponse])
def list_approved_lms(db: Session = Depends(get_db)):
    return db.query(LMSInstance).filter(LMSInstance.status == LMSStatus.approved).all()


@app.get("/lms/{lms_id}", response_model=LMSResponse)
def get_lms(lms_id: int, db: Session = Depends(get_db)):
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    return lms


# ── User: submit LMS ─────────────────────────────────

@app.post("/lms", response_model=LMSResponse, status_code=201)
def submit_lms(req: LMSCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = req.model_dump()
    data["accent_color_dark"] = adapt_accent_for_dark(data.get("accent_color", "#007AFF"))
    # Submissions go live immediately when auto-approve is on; admins then
    # confirm they checked the instance (admin_reviewed).
    initial_status = LMSStatus.approved if get_config().auto_approve else LMSStatus.pending
    lms = LMSInstance(**data, submitted_by=user.id, status=initial_status, admin_reviewed=False)
    db.add(lms)
    db.commit()
    db.refresh(lms)
    return lms


@app.get("/my/lms", response_model=list[LMSResponse])
def my_lms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(LMSInstance).filter(LMSInstance.submitted_by == user.id).all()


@app.post("/my/lms/{lms_id}/request-review", response_model=LMSResponse)
def request_review(lms_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Owner asks for a re-review after fixing a blocked instance."""
    lms = db.query(LMSInstance).filter(
        LMSInstance.id == lms_id, LMSInstance.submitted_by == user.id
    ).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    lms.review_requested_at = datetime.datetime.utcnow()
    _log_event(db, actor_id=user.id, actor_name=user.name, lms_id=lms.id,
               action="review_requested", detail="owner says the issue is fixed")
    db.commit()
    db.refresh(lms)
    return lms


# ── Admin: LMS ────────────────────────────────────────

@app.get("/admin/lms", response_model=list[LMSResponse])
def admin_list_lms(
    status_filter: LMSStatus | None = None,
    q: str = "",
    reviewed: bool | None = None,
    visibility: Visibility | None = None,
    featured: bool | None = None,
    review_requested: bool | None = None,
    limit: int = 100,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(LMSInstance)
    if status_filter:
        query = query.filter(LMSInstance.status == status_filter)
    if reviewed is not None:
        query = query.filter(LMSInstance.admin_reviewed == reviewed)
    if review_requested:
        query = query.filter(LMSInstance.review_requested_at.isnot(None))
    if visibility is not None:
        query = query.filter(LMSInstance.visibility == visibility)
    if featured is not None:
        query = query.filter(LMSInstance.featured == featured)
    if q:
        like = f"%{q}%"
        query = query.filter(
            LMSInstance.name.ilike(like)
            | LMSInstance.base_url.ilike(like)
            | LMSInstance.platform_name.ilike(like)
        )
    query = query.order_by(LMSInstance.created_at.desc())
    return query.offset(max(0, offset)).limit(min(max(1, limit), 500)).all()


@app.get("/admin/overview")
def admin_overview(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    def lms_count(**kw):
        query = db.query(func.count(LMSInstance.id))
        for k, v in kw.items():
            query = query.filter(getattr(LMSInstance, k) == v)
        return query.scalar() or 0

    return {
        "lms": {
            "total": lms_count(),
            "approved": lms_count(status=LMSStatus.approved),
            "pending": lms_count(status=LMSStatus.pending),
            "rejected": lms_count(status=LMSStatus.rejected),
            "public": lms_count(visibility=Visibility.public),
            "hidden": lms_count(visibility=Visibility.hidden),
            "featured": lms_count(featured=True),
            "unreviewed": lms_count(admin_reviewed=False, status=LMSStatus.approved),
        },
        "reports": _report_stats(db).model_dump(),
    }


@app.patch("/admin/lms/{lms_id}", response_model=LMSResponse)
def admin_update_lms_status(
    lms_id: int,
    req: LMSUpdateStatusRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    lms.status = req.status
    db.commit()
    db.refresh(lms)
    return lms


@app.put("/admin/lms/{lms_id}", response_model=LMSResponse)
def admin_full_update_lms(
    lms_id: int,
    req: LMSFullUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    updates = req.model_dump(exclude_none=True)
    if "accent_color" in updates:
        updates["accent_color_dark"] = adapt_accent_for_dark(updates["accent_color"])
    for key, value in updates.items():
        setattr(lms, key, value)
    db.commit()
    db.refresh(lms)
    return lms


@app.patch("/admin/lms/{lms_id}/review", response_model=LMSResponse)
def admin_review_lms(
    lms_id: int,
    req: LMSReviewRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    lms.admin_reviewed = req.admin_reviewed
    lms.reviewed_at = datetime.datetime.utcnow() if req.admin_reviewed else None
    lms.reviewed_by = admin.id if req.admin_reviewed else None
    if req.admin_reviewed:
        _log_event(db, actor_id=admin.id, actor_name=admin.name, lms_id=lms.id, action="reviewed")
    db.commit()
    db.refresh(lms)
    return lms


@app.get("/admin/lms/{lms_id}/events", response_model=list[ModerationEventResponse])
def admin_lms_events(
    lms_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """The moderation timeline for one LMS (who did what, when)."""
    return (
        db.query(ModerationEvent)
        .filter(ModerationEvent.lms_id == lms_id)
        .order_by(ModerationEvent.id.desc())
        .limit(100)
        .all()
    )


@app.post("/admin/lms/{lms_id}/recheck", response_model=LMSResponse)
async def admin_recheck_lms(
    lms_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Re-probe an LMS on demand so an admin can quickly confirm a complaint."""
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    result = await _probe_lms(lms.base_url)
    lms.last_checked_at = datetime.datetime.utcnow()
    lms.last_health_ok = bool(result["url_valid"])
    lms.last_health_note = "Online" if result["url_valid"] else (result.get("url_error") or "Not responding")
    db.commit()
    db.refresh(lms)
    return lms


# ── Admin: users ──────────────────────────────────────

@app.get("/admin/users", response_model=list[UserResponse])
def admin_list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.asc()).all()


@app.post("/admin/users", response_model=UserResponse, status_code=201)
def admin_create_admin(
    req: AdminCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        name=req.name,
        password_hash=hash_password(req.password),
        role=UserRole.admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/admin/users/{user_id}/role", response_model=UserResponse)
def admin_update_user_role(
    user_id: int,
    req: UserRoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id and req.role != UserRole.admin:
        raise HTTPException(status_code=400, detail="You cannot revoke your own admin role")
    target.role = req.role
    db.commit()
    db.refresh(target)
    return target


# ── Reports / complaints ──────────────────────────────

def _normalize_host(value: str) -> str:
    v = (value or "").strip().lower()
    for prefix in ("https://", "http://"):
        if v.startswith(prefix):
            v = v[len(prefix):]
    if v.startswith("www."):
        v = v[4:]
    return v.strip("/")


def _match_lms_by_url(db: Session, base_url: str) -> LMSInstance | None:
    target = _normalize_host(base_url)
    if not target:
        return None
    for lms in db.query(LMSInstance).all():
        if _normalize_host(lms.base_url) == target:
            return lms
    return None


@app.post("/api/v1/reports", response_model=ReportCreateResponse, status_code=201)
def create_report(
    req: ReportCreateRequest,
    background: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public endpoint: a mobile user files a complaint about an LMS."""
    ip = client_ip(request)
    if not reports_limiter.allow(ip, limit=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many reports. Try again shortly.")

    lms: LMSInstance | None = None
    if req.lms_id is not None:
        lms = db.query(LMSInstance).filter(LMSInstance.id == req.lms_id).first()
    if lms is None and req.base_url:
        lms = _match_lms_by_url(db, req.base_url)

    if lms is None and not req.base_url:
        raise HTTPException(status_code=400, detail="Provide lms_id or base_url")

    severity = CATEGORY_SEVERITY.get(req.category, ReportSeverity.low)
    report = Report(
        lms_id=lms.id if lms else None,
        reported_base_url=(lms.base_url if lms else req.base_url) or "",
        category=req.category,
        severity=severity,
        message=(req.message or "").strip(),
        reporter_email=(req.reporter_email or ""),
        reporter_ip=ip,
        screenshot_url=_save_report_screenshot(req.screenshot_base64),
        platform=(req.platform or "").strip().lower(),
        app_version=(req.app_version or "").strip(),
        status=ReportStatus.new,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Hiding/blocking is always a human decision — no automatic action here, so
    # a coordinated spam campaign can't knock a legitimate LMS out of the app.
    # The grouped inbox surfaces volume + distinct reporters for fast triage.
    background.add_task(webhook.deliver, webhook.build_payload(report, lms))
    return report


def _log_event(db: Session, *, actor_id, action, lms_id=None, report_id=None,
               detail="", actor_name=""):
    """Append a moderation event to the audit trail."""
    db.add(ModerationEvent(
        actor_id=actor_id,
        actor_name=actor_name,
        lms_id=lms_id,
        report_id=report_id,
        action=action,
        detail=detail,
    ))


# High severity first, then newest — computed in SQL so paging is cheap at scale.
_SEVERITY_ORDER = case(
    {ReportSeverity.high: 0, ReportSeverity.medium: 1, ReportSeverity.low: 2},
    value=Report.severity,
    else_=3,
)


def _report_query(db: Session, status: ReportStatus | None):
    query = db.query(Report).options(
        joinedload(Report.lms).joinedload(LMSInstance.submitter)
    )
    if status is not None:
        query = query.filter(Report.status == status)
    return query


@app.get("/admin/reports", response_model=list[ReportResponse])
def admin_list_reports(
    status: ReportStatus | None = None,
    category: ReportCategory | None = None,
    severity: ReportSeverity | None = None,
    platform: str | None = None,
    lms_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Order + paginate in SQL, and eager-load lms + owner to avoid N+1 per row.
    query = _report_query(db, status)
    if category is not None:
        query = query.filter(Report.category == category)
    if severity is not None:
        query = query.filter(Report.severity == severity)
    if platform:
        query = query.filter(Report.platform == platform.strip().lower())
    if lms_id is not None:
        query = query.filter(Report.lms_id == lms_id)
    return (
        query
        .order_by(_SEVERITY_ORDER.asc(), Report.id.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 500))
        .all()
    )


_OPEN_STATUSES = [ReportStatus.new, ReportStatus.reviewing]
_SEV_RANK = {ReportSeverity.high: 0, ReportSeverity.medium: 1, ReportSeverity.low: 2}


@app.get("/admin/reports/by-lms", response_model=list[AffectedLMS])
def admin_reports_by_lms(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Triage grouped by LMS: one row per reported platform with open count,
    distinct-reporter count, categories and worst severity. Makes brigading
    visible (40 reports != 1) and lets an admin act per platform, not per row.
    """
    rows = (
        _report_query(db, None)
        .filter(Report.status.in_(_OPEN_STATUSES))
        .order_by(Report.id.desc())
        .limit(2000)
        .all()
    )
    groups: dict = {}
    for r in rows:
        key = r.lms_id if r.lms_id is not None else f"url:{r.reported_base_url}"
        g = groups.setdefault(key, {"lms": r.lms, "url": r.reported_base_url or "", "reports": []})
        g["reports"].append(r)

    out = []
    for g in groups.values():
        reps = g["reports"]
        reporters = {(x.reporter_ip or x.reporter_email or f"r{x.id}") for x in reps}
        categories = list(dict.fromkeys(x.category for x in reps))
        worst = min((x.severity for x in reps), key=lambda s: _SEV_RANK.get(s, 3))
        latest = max(x.created_at for x in reps)
        out.append(AffectedLMS(
            lms=ReportLMSBrief.model_validate(g["lms"]) if g["lms"] else None,
            reported_base_url=g["url"],
            open_count=len(reps),
            total_count=len(reps),
            distinct_reporters=len(reporters),
            worst_severity=worst,
            categories=categories,
            latest_at=latest,
        ))
    out.sort(key=lambda a: (_SEV_RANK.get(a.worst_severity, 3), -a.open_count))
    return out


def _report_stats(db: Session) -> ReportStats:
    def count(status):
        return db.query(func.count(Report.id)).filter(Report.status == status).scalar() or 0

    new = count(ReportStatus.new)
    reviewing = count(ReportStatus.reviewing)
    blocked = count(ReportStatus.blocked)
    dismissed = count(ReportStatus.dismissed)
    high_open = (
        db.query(func.count(Report.id))
        .filter(
            Report.severity == ReportSeverity.high,
            Report.status.in_(_OPEN_STATUSES),
        )
        .scalar()
        or 0
    )
    affected = (
        db.query(func.count(func.distinct(Report.lms_id)))
        .filter(
            Report.lms_id.isnot(None),
            Report.status.in_(_OPEN_STATUSES),
        )
        .scalar()
        or 0
    )
    return ReportStats(
        new=new,
        reviewing=reviewing,
        blocked=blocked,
        dismissed=dismissed,
        total=new + reviewing + blocked + dismissed,
        high_open=high_open,
        affected_lms=affected,
    )


@app.get("/admin/reports/stats", response_model=ReportStats)
def admin_report_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return _report_stats(db)


@app.patch("/admin/reports/{report_id}", response_model=ReportResponse)
def admin_update_report(
    report_id: int,
    req: ReportUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if req.status is not None:
        report.status = req.status
        if req.status in (ReportStatus.blocked, ReportStatus.dismissed):
            report.resolved_by = admin.id
            report.resolved_at = datetime.datetime.utcnow()
        else:
            report.resolved_by = None
            report.resolved_at = None
        _log_event(db, actor_id=admin.id, actor_name=admin.name, lms_id=report.lms_id,
                   report_id=report.id, action=req.status.value,
                   detail=(req.resolution_note or "").strip())
    if req.resolution_note is not None:
        report.resolution_note = req.resolution_note
    db.commit()
    db.refresh(report)
    return report


@app.post("/admin/lms/{lms_id}/block", response_model=LMSResponse)
def admin_block_lms(
    lms_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove an LMS from the catalog and mark its open complaints as blocked."""
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    lms.status = LMSStatus.rejected
    now = datetime.datetime.utcnow()
    open_reports = (
        db.query(Report)
        .filter(Report.lms_id == lms_id, Report.status.in_(_OPEN_STATUSES))
        .all()
    )
    # Record a reason the owner will see, from the complaints that led here.
    recent_categories = [
        r.category.value
        for r in db.query(Report).filter(Report.lms_id == lms_id).order_by(Report.id.desc()).limit(10).all()
    ]
    lms.block_reason = email_notify.summarize_reason(recent_categories)
    for report in open_reports:
        report.status = ReportStatus.blocked
        report.resolved_by = admin.id
        report.resolved_at = now
    _log_event(db, actor_id=admin.id, actor_name=admin.name, lms_id=lms.id,
               action="blocked", detail=lms.block_reason)
    db.commit()
    db.refresh(lms)
    return lms


@app.post("/admin/lms/{lms_id}/notify-owner", response_model=NotifyOwnerResponse)
def admin_notify_owner(
    lms_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Compose (and, if SMTP is configured, send) a moderation notice to the LMS
    owner: what was reported, that access is temporarily removed, and that we
    restore it once fixed. Always returns the composed message so the console
    can fall back to the admin's own mail client.
    """
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")

    recent = (
        db.query(Report)
        .filter(Report.lms_id == lms_id)
        .order_by(Report.id.desc())
        .limit(10)
        .all()
    )
    categories = [r.category.value for r in recent]
    latest_detail = next((r.message for r in recent if r.message), "")

    subject, body = email_notify.compose_block_notice(lms, categories, latest_detail)
    sent = email_notify.send_email(lms.owner_email, subject, body)

    lms.owner_notified_at = datetime.datetime.utcnow()
    _log_event(db, actor_id=admin.id, actor_name=admin.name, lms_id=lms.id,
               action="notified", detail="sent" if sent else "drafted (mail client)")
    db.commit()
    db.refresh(lms)

    return NotifyOwnerResponse(
        sent=sent,
        owner_email=lms.owner_email,
        subject=subject,
        body=body,
        owner_notified_at=lms.owner_notified_at,
    )


@app.post("/admin/lms/{lms_id}/unblock", response_model=LMSResponse)
def admin_unblock_lms(
    lms_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restore a previously blocked LMS to the catalog."""
    lms = db.query(LMSInstance).filter(LMSInstance.id == lms_id).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    lms.status = LMSStatus.approved
    lms.block_reason = ""
    lms.review_requested_at = None
    _log_event(db, actor_id=admin.id, actor_name=admin.name, lms_id=lms.id, action="unblocked")
    db.commit()
    db.refresh(lms)
    return lms


# ── Mobile Directory API (iOS/Android compatible) ─────

def _make_absolute(url: str | None, base: str) -> str | None:
    """Convert relative /uploads/... paths to absolute HTTPS URLs."""
    if not url:
        return None
    if url.startswith("/"):
        full = base.rstrip("/") + url
        return full.replace("http://", "https://", 1)
    return url


def _lms_to_directory_detail(lms: LMSInstance, base_url: str = "") -> dict:
    return {
        "id": str(lms.id),
        "title": lms.name,
        "description": lms.description or lms.platform_name,
        "short_description": lms.platform_name,
        "base_url": lms.base_url,
        "logo_url": _make_absolute(lms.logo_url, base_url) or None,
        "accent_color": lms.accent_color or None,
        "visibility": lms.visibility.value,
        "featured": lms.featured,
        "api": {
            "host_url": lms.base_url,
            "feedback_email": lms.feedback_email or "",
            "oauth_client_id": lms.oauth_client_id,
        },
        "feature_flags": {
            "pre_login_discovery": lms.pre_login_discovery,
            "unknown_units_mode": getattr(lms, "unknown_units_mode", "block"),
            "offline_downloads": getattr(lms, "offline_downloads", True),
            "smart_push_automation": getattr(lms, "smart_push_automation", False),
        },
        "theme": {
            "accent_color_dark": getattr(lms, "accent_color_dark", None) or None,
            "login_background_url": _make_absolute(getattr(lms, "login_background_url", None), base_url),
            "logo_upload_url": _make_absolute(getattr(lms, "logo_upload_url", None), base_url),
        },
        "ui_components": {
            "course_unit_progress_enabled": getattr(lms, "course_unit_progress", True),
            "course_dropdown_navigation_enabled": getattr(lms, "course_dropdown_nav", True),
            "pre_login_experience_enabled": getattr(lms, "pre_login_experience", True),
        },
        "dashboard": {
            "type": getattr(lms, "dashboard_type", "gallery"),
        },
    }


def _lms_to_summary(lms: LMSInstance, base: str) -> dict:
    return {
        "id": str(lms.id),
        "title": lms.name,
        "short_description": lms.platform_name,
        "base_url": lms.base_url,
        "logo_url": _make_absolute(lms.logo_url, base) or None,
        "accent_color": lms.accent_color or None,
        "visibility": lms.visibility.value,
        "featured": lms.featured,
    }


@app.get("/api/v1/config", response_model=PublicConfigResponse)
def public_config():
    return get_config().public_dict()


@app.get("/api/v1/directory")
def directory_search(
    q: str = "",
    featured: bool = False,
    limit: int = 50,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Catalog search for the mobile app.

    * curated mode (or ?featured=true): returns featured instances ordered by
      sort_order — the provider's own list, shown without searching.
    * search mode with a query: public instances matching the query, plus any
      hidden instance whose base_url exactly matches the query.
    * search mode without a query: the public catalog.
    """
    base = str(request.base_url).rstrip("/") if request else ""
    cfg = get_config()
    approved = db.query(LMSInstance).filter(LMSInstance.status == LMSStatus.approved)

    curated = cfg.is_curated or featured
    if curated:
        rows = (
            approved.filter(LMSInstance.featured == True)  # noqa: E712
            .order_by(LMSInstance.sort_order.asc(), LMSInstance.name.asc())
            .all()
        )
    elif q:
        like = f"%{q}%"
        public_matches = approved.filter(
            LMSInstance.visibility == Visibility.public,
            (LMSInstance.name.ilike(like) | LMSInstance.base_url.ilike(like)),
        ).all()
        target = _normalize_host(q)
        hidden_exact = [
            lms for lms in approved.filter(LMSInstance.visibility == Visibility.hidden).all()
            if _normalize_host(lms.base_url) == target
        ]
        rows = public_matches + hidden_exact
    else:
        rows = approved.filter(LMSInstance.visibility == Visibility.public).order_by(
            LMSInstance.featured.desc(), LMSInstance.sort_order.asc(), LMSInstance.name.asc()
        ).all()

    rows = rows[: min(max(1, limit), 200)]
    return {"items": [_lms_to_summary(lms, base) for lms in rows]}


@app.get("/api/v1/directory/{lms_id}")
def directory_detail(lms_id: str, request: Request, db: Session = Depends(get_db)):
    if not lms_id.isdigit():
        raise HTTPException(status_code=404, detail="LMS not found")
    lms = db.query(LMSInstance).filter(
        LMSInstance.id == int(lms_id),
        LMSInstance.status == LMSStatus.approved,
    ).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    base = str(request.base_url).rstrip("/")
    if request.headers.get("x-forwarded-proto") == "https":
        base = base.replace("http://", "https://", 1)
    return _lms_to_directory_detail(lms, base_url=base)


# ── Aliases matching iOS backend.md paths ─────────────

@app.get("/api/universal-login/lms/search")
def ul_search(query: str = "", limit: int = 20, featured: bool = False, request: Request = None, db: Session = Depends(get_db)):
    return directory_search(q=query, featured=featured, limit=limit, request=request, db=db)


@app.get("/api/universal-login/lms/{lms_id}")
def ul_detail(lms_id: str, request: Request, db: Session = Depends(get_db)):
    return directory_detail(lms_id=lms_id, request=request, db=db)


@app.post("/api/universal-login/reports", response_model=ReportCreateResponse, status_code=201)
def ul_report(req: ReportCreateRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    return create_report(req=req, background=background, db=db)


# ── Web UI ────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"
ADMIN_DIR = STATIC_DIR / "admin"
LANDING_DIR = STATIC_DIR / "landing"

app.mount("/uploads", StaticFiles(directory="data/uploads"), name="uploads")
app.mount("/wizard", StaticFiles(directory=str(STATIC_DIR / "wizard"), html=True), name="wizard")

# The admin console is a built React app (base: /admin/). It is mounted only
# once built; before that, endpoints fall back to the legacy static page.
if ADMIN_DIR.exists():
    app.mount("/admin", StaticFiles(directory=str(ADMIN_DIR), html=True), name="admin")

# User documentation (built MkDocs site) served at /guide/.
GUIDE_DIR = STATIC_DIR / "guide"
if GUIDE_DIR.exists():
    app.mount("/guide", StaticFiles(directory=str(GUIDE_DIR), html=True), name="guide")


def _admin_index() -> FileResponse:
    """Serve the admin console entry point, falling back to the legacy page."""
    admin_index = ADMIN_DIR / "index.html"
    if admin_index.exists():
        return FileResponse(admin_index)
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/", response_class=FileResponse)
def root():
    if LANDING_DIR.exists():
        return FileResponse(LANDING_DIR / "index.html")
    return _admin_index()


# Serve landing static assets (_next/*, images, video, etc.)
if (STATIC_DIR / "landing").exists():
    app.mount("/_next", StaticFiles(directory=str(LANDING_DIR / "_next")), name="landing_next")

    @app.get("/quick-demo.mp4", response_class=FileResponse)
    def landing_video():
        return FileResponse(LANDING_DIR / "quick-demo.mp4", media_type="video/mp4")

    @app.get("/app-screenshot.png", response_class=FileResponse)
    def landing_screenshot():
        return FileResponse(LANDING_DIR / "app-screenshot.png", media_type="image/png")

    @app.get("/testflight.png", response_class=FileResponse)
    def landing_testflight():
        return FileResponse(LANDING_DIR / "testflight.png", media_type="image/png")

    @app.get("/android.png", response_class=FileResponse)
    def landing_android():
        return FileResponse(LANDING_DIR / "android.png", media_type="image/png")

    @app.get("/openedx-universal.apk", response_class=FileResponse)
    def landing_apk():
        return FileResponse(LANDING_DIR / "openedx-universal.apk", media_type="application/vnd.android.package-archive")


@app.get("/dashboard", response_class=FileResponse)
def dashboard():
    return _admin_index()
