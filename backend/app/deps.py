from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    user = db.get(User, user_id) if user_id else None
    if user is None:
        request.session.clear()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ログインしてね")
    return user
