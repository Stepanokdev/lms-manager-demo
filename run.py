import os
import uvicorn
from app.database import Base, engine, migrate
import app.models  # noqa: F401 - register models with Base
from app.seed import seed

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    migrate()
    seed()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
