import os
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import User, LMSInstance, LMSStatus, UserRole
from .schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    LMSCreateRequest, LMSUpdateStatusRequest, LMSResponse,
)
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)

os.makedirs("data", exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LMS Registry", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    lms = LMSInstance(**req.model_dump(), submitted_by=user.id)
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


@app.get("/admin/users", response_model=list[UserResponse])
def admin_list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).all()


# ── Mobile Directory API (iOS/Android compatible) ─────

def _lms_to_directory_detail(lms: LMSInstance) -> dict:
    return {
        "id": str(lms.id),
        "title": lms.name,
        "description": lms.description or lms.platform_name,
        "short_description": lms.platform_name,
        "base_url": lms.base_url,
        "logo_url": lms.logo_url or None,
        "accent_color": lms.accent_color or None,
        "api": {
            "host_url": lms.base_url,
            "feedback_email": lms.feedback_email or "",
            "oauth_client_id": lms.oauth_client_id,
        },
        "feature_flags": {
            "pre_login_discovery": lms.pre_login_discovery,
            "offline_downloads": lms.offline_downloads,
            "smart_push_automation": lms.smart_push_automation,
        },
    }


@app.get("/api/v1/directory")
def directory_search(q: str = "", db: Session = Depends(get_db)):
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
            "logo_url": lms.logo_url or None,
        }
        for lms in query.all()
    ]
    return {"items": items}


@app.get("/api/v1/directory/{lms_id}")
def directory_detail(lms_id: str, db: Session = Depends(get_db)):
    lms = db.query(LMSInstance).filter(
        LMSInstance.id == int(lms_id),
        LMSInstance.status == LMSStatus.approved,
    ).first()
    if not lms:
        raise HTTPException(status_code=404, detail="LMS not found")
    return _lms_to_directory_detail(lms)


# ── Aliases matching iOS backend.md paths ─────────────

@app.get("/api/universal-login/lms/search")
def ul_search(query: str = "", limit: int = 20, db: Session = Depends(get_db)):
    return directory_search(q=query, db=db)


@app.get("/api/universal-login/lms/{lms_id}")
def ul_detail(lms_id: str, db: Session = Depends(get_db)):
    return directory_detail(lms_id=lms_id, db=db)


# ── Web UI ────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"


@app.get("/", response_class=FileResponse)
def root():
    return FileResponse(STATIC_DIR / "index.html")
