import os
import uuid
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import User, LMSInstance, LMSStatus, UserRole
from .schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    LMSCreateRequest, LMSUpdateStatusRequest, LMSFullUpdateRequest, LMSResponse,
)
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)
from .color_utils import adapt_accent_for_dark

os.makedirs("data", exist_ok=True)
os.makedirs("data/uploads", exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LMS Registry", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/uploads")
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"}
MAX_SIZE = 2 * 1024 * 1024  # 2MB


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


# ── LMS Validation ────────────────────────────────────

import httpx
from pydantic import BaseModel as _BaseModel

class LMSValidateRequest(_BaseModel):
    base_url: str
    oauth_client_id: str = ""


@app.post("/validate-lms")
async def validate_lms(req: LMSValidateRequest):
    """Validate LMS reachability and OAuth Client ID without user credentials."""
    base = req.base_url.rstrip("/")
    result = {"url_valid": False, "oauth_valid": False, "url_error": None, "oauth_error": None}

    # Step 1: Check LMS reachability
    async with httpx.AsyncClient(timeout=10, follow_redirects=True, verify=False) as client:
        try:
            r = await client.get(f"{base}/user_api/v1/account/registration/")
            if 200 <= r.status_code < 300:
                result["url_valid"] = True
            else:
                # Fallback check
                r2 = await client.get(f"{base}/oauth2/login/")
                if 200 <= r2.status_code < 400:
                    result["url_valid"] = True
                else:
                    result["url_error"] = f"LMS responded with status {r.status_code}"
        except httpx.ConnectError:
            result["url_error"] = "Cannot connect to this URL. Check that the address is correct."
        except httpx.TimeoutException:
            result["url_error"] = "Connection timed out. The server may be down or unreachable."
        except Exception as e:
            result["url_error"] = f"Connection failed: {str(e)[:100]}"

    # Step 2: Validate OAuth Client ID (only if URL is valid and client_id provided)
    if result["url_valid"] and req.oauth_client_id:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, verify=False) as client:
            try:
                r = await client.post(
                    f"{base}/oauth2/access_token",
                    data={
                        "client_id": req.oauth_client_id,
                        "grant_type": "password",
                        "username": "_validate_",
                        "password": "_validate_",
                    },
                )
                body = r.text.lower()
                if "invalid_client" in body:
                    result["oauth_error"] = "OAuth Client ID not found on this LMS. Check the ID."
                elif "invalid_grant" in body or "unauthorized" in body:
                    # invalid_grant = client_id recognized, just bad credentials — that's what we want
                    result["oauth_valid"] = True
                else:
                    # Any other non-error response also means the client_id exists
                    result["oauth_valid"] = True
            except Exception as e:
                result["oauth_error"] = f"Could not verify OAuth ID: {str(e)[:100]}"

    return result


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
    lms = LMSInstance(**data, submitted_by=user.id)
    db.add(lms)
    db.commit()
    db.refresh(lms)
    return lms


@app.get("/my/lms", response_model=list[LMSResponse])
def my_lms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(LMSInstance).filter(LMSInstance.submitted_by == user.id).all()


# ── Admin ─────────────────────────────────────────────

@app.get("/admin/lms", response_model=list[LMSResponse])
def admin_list_lms(
    status_filter: LMSStatus | None = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(LMSInstance)
    if status_filter:
        q = q.filter(LMSInstance.status == status_filter)
    return q.all()


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


@app.get("/admin/users", response_model=list[UserResponse])
def admin_list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).all()


# ── Mobile Directory API (iOS/Android compatible) ─────

def _make_absolute(url: str | None, base: str) -> str | None:
    """Convert relative /uploads/... paths to absolute HTTPS URLs."""
    if not url:
        return None
    if url.startswith("/"):
        full = base.rstrip("/") + url
        # Always use HTTPS for our uploads (behind Traefik TLS termination)
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
        "api": {
            "host_url": lms.base_url,
            "feedback_email": lms.feedback_email or "",
            "oauth_client_id": lms.oauth_client_id,
        },
        "feature_flags": {
            "pre_login_discovery": lms.pre_login_discovery,
            "unknown_units_mode": getattr(lms, "unknown_units_mode", "block"),
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


@app.get("/api/v1/directory")
def directory_search(q: str = "", request: Request = None, db: Session = Depends(get_db)):
    base = str(request.base_url).rstrip("/") if request else ""
    query = db.query(LMSInstance).filter(LMSInstance.status == LMSStatus.approved)
    if q:
        query = query.filter(
            LMSInstance.name.ilike(f"%{q}%")
            | LMSInstance.base_url.ilike(f"%{q}%")
        )
    items = [
        {
            "id": str(lms.id),
            "title": lms.name,
            "short_description": lms.platform_name,
            "base_url": lms.base_url,
            "logo_url": _make_absolute(lms.logo_url, base) or None,
            "accent_color": lms.accent_color or None,
        }
        for lms in query.all()
    ]
    return {"items": items}


@app.get("/api/v1/directory/{lms_id}")
def directory_detail(lms_id: str, request: Request, db: Session = Depends(get_db)):
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
def ul_search(query: str = "", limit: int = 20, request: Request = None, db: Session = Depends(get_db)):
    return directory_search(q=query, request=request, db=db)


@app.get("/api/universal-login/lms/{lms_id}")
def ul_detail(lms_id: str, request: Request, db: Session = Depends(get_db)):
    return directory_detail(lms_id=lms_id, request=request, db=db)


# ── Web UI ────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"

app.mount("/uploads", StaticFiles(directory="data/uploads"), name="uploads")
app.mount("/wizard", StaticFiles(directory=str(STATIC_DIR / "wizard"), html=True), name="wizard")

LANDING_DIR = STATIC_DIR / "landing"


@app.get("/", response_class=FileResponse)
def root():
    if LANDING_DIR.exists():
        return FileResponse(LANDING_DIR / "index.html")
    return FileResponse(STATIC_DIR / "index.html")


# Serve landing static assets (_next/*, images, video, etc.)
if (STATIC_DIR / "landing").exists():
    app.mount("/_next", StaticFiles(directory=str(LANDING_DIR / "_next")), name="landing_next")

    # Serve public assets from landing root (quick-demo.mp4, app-screenshot.png, etc.)
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
    return FileResponse(STATIC_DIR / "index.html")
