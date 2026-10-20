import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Default to SQLite for the pilot; DATABASE_URL lets a real deployment point at
# Postgres (recommended for many concurrent writers) with no code change.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/lms_registry.db")

_is_sqlite = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)


if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):
        # WAL lets readers and a writer coexist; busy_timeout waits out a lock
        # instead of failing immediately with "database is locked".
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


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
        ("block_reason", "VARCHAR DEFAULT ''"),
        ("review_requested_at", "DATETIME"),
        # v0.4 — portal mode. Nullable on purpose: a NULL row belongs to no tenant
        # and is therefore invisible to every /p/<slug> directory, which is the safe
        # default for the rows that already exist in a search/curated deployment.
        # SQLite refuses ADD COLUMN NOT NULL without a default, so nullable is also
        # the only form that works on both engines.
        ("organization_id", "INTEGER"),
        # v0.5 — the key the mobile catalog identifies a platform by (models.new_catalog_key)
        ("catalog_key", "VARCHAR"),
    ]
    with engine.begin() as conn:
        for col_name, col_def in new_columns:
            if col_name not in existing:
                conn.execute(text(f"ALTER TABLE lms_instances ADD COLUMN {col_name} {col_def}"))
        # Rows from before v0.5 get their key here, once; a key is never rewritten later
        # except when the platform's address changes.
        from .models import new_catalog_key
        missing = conn.execute(
            text("SELECT id FROM lms_instances WHERE catalog_key IS NULL OR catalog_key = ''")
        ).fetchall()
        for (row_id,) in missing:
            conn.execute(
                text("UPDATE lms_instances SET catalog_key = :key WHERE id = :id"),
                {"key": new_catalog_key(), "id": row_id},
            )
        # Removing deprecated columns is not supported in SQLite, so we leave them.

    # users table — portal mode attaches each provider account to an organization
    if "users" in insp.get_table_names():
        user_cols = {col["name"] for col in insp.get_columns("users")}
        if "organization_id" not in user_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN organization_id INTEGER"))

    # reports table (added in v0.3) — new columns since
    if "reports" in insp.get_table_names():
        report_cols = {col["name"] for col in insp.get_columns("reports")}
        report_new = [
            ("screenshot_url", "VARCHAR DEFAULT ''"),
            ("reporter_ip", "VARCHAR DEFAULT ''"),
        ]
        with engine.begin() as conn:
            for col_name, col_def in report_new:
                if col_name not in report_cols:
                    conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_def}"))

    # Indexes on hot filter/sort columns (idempotent; works on SQLite + Postgres).
    # Re-inspect: create_all may have added `organizations` after `insp` was built,
    # and get_table_names() results are cached on the inspector.
    tables = set(inspect(engine).get_table_names())
    index_specs = [
        ("ix_reports_status", "reports", "status"),
        ("ix_reports_lms_id", "reports", "lms_id"),
        ("ix_reports_status_severity", "reports", "status, severity"),
        ("ix_lms_status", "lms_instances", "status"),
        ("ix_lms_visibility", "lms_instances", "visibility"),
        ("ix_lms_featured", "lms_instances", "featured"),
        # portal mode: every /p/<slug> directory query filters on this pair
        ("ix_lms_org", "lms_instances", "organization_id"),
        ("ix_lms_org_status", "lms_instances", "organization_id, status"),
        ("ix_users_org", "users", "organization_id"),
        ("ix_lms_catalog_key", "lms_instances", "catalog_key"),
    ]
    with engine.begin() as conn:
        for name, table, cols in index_specs:
            if table in tables:
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({cols})"))
