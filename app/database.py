from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite:///./data/lms_registry.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate():
    """Add missing columns to existing tables (SQLite doesn't support ADD COLUMN IF NOT EXISTS)."""
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    if "lms_instances" not in insp.get_table_names():
        return
    existing = {col["name"] for col in insp.get_columns("lms_instances")}
    new_columns = [
        ("login_background_url", "VARCHAR DEFAULT ''"),
        ("logo_upload_url", "VARCHAR DEFAULT ''"),
        ("accent_color_dark", "VARCHAR DEFAULT ''"),
        ("unknown_units_mode", "VARCHAR DEFAULT 'block'"),
        ("dashboard_type", "VARCHAR DEFAULT 'gallery'"),
        ("pre_login_experience", "BOOLEAN DEFAULT 1"),
        ("course_unit_progress", "BOOLEAN DEFAULT 1"),
        ("course_dropdown_nav", "BOOLEAN DEFAULT 1"),
        # v0.3 — catalog, moderation, health, extended flags
        ("offline_downloads", "BOOLEAN DEFAULT 1"),
        ("smart_push_automation", "BOOLEAN DEFAULT 0"),
        ("visibility", "VARCHAR DEFAULT 'public'"),
        ("featured", "BOOLEAN DEFAULT 0"),
        ("sort_order", "INTEGER DEFAULT 0"),
        ("admin_reviewed", "BOOLEAN DEFAULT 0"),
        ("reviewed_at", "DATETIME"),
        ("reviewed_by", "INTEGER"),
        ("last_checked_at", "DATETIME"),
        ("last_health_ok", "BOOLEAN"),
        ("last_health_note", "VARCHAR DEFAULT ''"),
        ("owner_notified_at", "DATETIME"),
    ]
    with engine.begin() as conn:
        for col_name, col_def in new_columns:
            if col_name not in existing:
                conn.execute(text(f"ALTER TABLE lms_instances ADD COLUMN {col_name} {col_def}"))
        # Removing deprecated columns is not supported in SQLite, so we leave them.
