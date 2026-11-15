from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import LoginIn, MeOut, MeUpdate, RegisterIn
from app.security import hash_password, verify_password

router = APIRouter(prefix="/api")


def _start_session(request: Request, user: User) -> None:
    # ログインのたびに、セッションを作り直す
    request.session.clear()
    request.session["user_id"] = user.id


@router.post("/auth/register", response_model=MeOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)) -> User:
    user = User(
        nickname=body.nickname,
        password_hash=hash_password(body.password),
        initial_wallet=body.initial_wallet,
        initial_savings=body.initial_savings,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "そのニックネームは つかわれているよ")
    _start_session(request, user)
    return user


@router.post("/auth/login", response_model=MeOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.nickname == body.nickname.strip()))
    # ニックネームとパスワードの、どちらが違うかは教えない
    if not verify_password(body.password, user.password_hash if user else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ニックネームか パスワードが ちがうよ")
    _start_session(request, user)
    return user


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request) -> Response:
    request.session.clear()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=MeOut)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=MeOut)
def update_me(
    body: MeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> User:
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    db.commit()
    return user
