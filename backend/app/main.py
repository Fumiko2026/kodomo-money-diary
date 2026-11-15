from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.db import get_db
from app.routers import auth, categories, records, summary, wishes

app = FastAPI(title="こどもマネー日記")

# セッションは、署名つきの Cookie に入れる(JavaScript からは読めない)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    session_cookie="kodomo_session",
    max_age=settings.session_max_age_seconds,
    same_site="lax",
    https_only=settings.cookie_secure,
)

app.include_router(auth.router)
app.include_router(records.router)
app.include_router(categories.router)
app.include_router(summary.router)
app.include_router(wishes.router)


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
