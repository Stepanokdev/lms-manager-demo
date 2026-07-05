from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import hashlib
import hmac
import os
import base64
import logging
import secrets
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, UserRole

# Never ship a hardcoded shared secret. Read it from the environment; if it is
# unset, generate a strong random key for this process only. That means tokens
# don't survive a restart when SECRET_KEY is unset — safe by default, and a
# real deployment MUST set SECRET_KEY so tokens persist across restarts.
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    logging.getLogger("lms_registry.auth").warning(
        "SECRET_KEY is not set — using an ephemeral key; set SECRET_KEY in production."
    )
    SECRET_KEY = secrets.token_urlsafe(48)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return base64.b64encode(salt).decode() + "$" + base64.b64encode(dk).decode()


def verify_password(plain: str, stored: str) -> bool:
    salt_b64, dk_b64 = stored.split("$", 1)
    salt = base64.b64decode(salt_b64)
    dk = base64.b64decode(dk_b64)
    dk2 = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, 100_000)
    return hmac.compare_digest(dk, dk2)


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(user_id), "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
