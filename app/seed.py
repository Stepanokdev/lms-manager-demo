"""Seed the database with demo data on first run."""
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import User, LMSInstance, UserRole, LMSStatus
from .auth import hash_password


def seed():
    db: Session = SessionLocal()
    try:
        if db.query(User).first():
            return  # already seeded

        # Admin user
        admin = User(
            email="admin@demo.com",
            name="Admin",
            password_hash=hash_password("admin123"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.flush()

        # Regular user
        user = User(
            email="user@demo.com",
            name="Demo User",
            password_hash=hash_password("user123"),
            role=UserRole.user,
        )
        db.add(user)
        db.flush()

        # LMS instances from iOS config.yaml
        lms_instances = [
            LMSInstance(
                name="axim-ccpv-dev",
                base_url="https://axim-ccpv-dev.raccoongang.net",
                platform_name="AXIM CCPV Dev",
                description="AXIM Collaborative Community Platform for development and testing of Open edX mobile applications.",
                oauth_client_id="SxDFlH1rb8Xw3nT6lOPwUejLb9vgXzOfkgqx1sY2",
                token_type="jwt",
                feedback_email="support@example.com",
                logo_url="",
                accent_color="#ED8794",
                pre_login_discovery=True,
                offline_downloads=True,
                smart_push_automation=False,
                status=LMSStatus.approved,
                submitted_by=admin.id,
            ),
            LMSInstance(
                name="lms-axim-stage",
                base_url="https://axim-mobile-dev.raccoongang.net",
                platform_name="AXIM Mobile Dev",
                description="AXIM Mobile Development environment for Open edX platform integration and mobile feature testing.",
                oauth_client_id="K5TcezWSOG6WBzgjBcnn16mVdxTDwFd66aOJndXF",
                token_type="jwt",
                feedback_email="support@example.com",
                logo_url="",
                accent_color="#007AFF",
                pre_login_discovery=True,
                offline_downloads=True,
                smart_push_automation=True,
                status=LMSStatus.approved,
                submitted_by=admin.id,
            ),
            LMSInstance(
                name="Venus Dev",
                base_url="https://venus.raccoongang.net",
                platform_name="White Label Dev",
                description="White Label development instance for customized Open edX deployments and partner integrations.",
                oauth_client_id="K5TcezWSOG6WBzgjBcnn16mVdxTDwFd66aOJndXF",
                token_type="jwt",
                feedback_email="support@example.com",
                logo_url="",
                accent_color="#5B8777",
                pre_login_discovery=True,
                offline_downloads=False,
                smart_push_automation=False,
                status=LMSStatus.approved,
                submitted_by=admin.id,
            ),
        ]
        db.add_all(lms_instances)
        db.commit()
        print("Database seeded with demo data.")
    finally:
        db.close()
