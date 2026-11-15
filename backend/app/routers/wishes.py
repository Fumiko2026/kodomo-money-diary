from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User, Wish
from app.schemas import WishIn, WishOut, WishUpdate
from app.services import allocate_savings, calc_balance, months_left

router = APIRouter(prefix="/api/wishes")

MAX_WISHES = 3


def _own_wish(db: Session, user: User, wish_id: int) -> Wish:
    wish = db.scalar(select(Wish).where(Wish.id == wish_id, Wish.user_id == user.id))
    if wish is None:  # 他の人のものも、同じ 404
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ほしいものが みつからないよ")
    return wish


def _all_out(db: Session, user: User) -> list[WishOut]:
    wishes = db.scalars(
        select(Wish).where(Wish.user_id == user.id).order_by(Wish.created_at, Wish.id)
    ).all()
    saved = allocate_savings(
        calc_balance(db, user)["savings"], [w.target_amount for w in wishes]
    )
    out = []
    for wish, s in zip(wishes, saved):
        item = WishOut.model_validate(wish)
        item.saved = s
        item.months_left = months_left(wish.target_amount, s, wish.monthly_plan)
        out.append(item)
    return out


def _one_out(db: Session, user: User, wish_id: int) -> WishOut:
    return next(w for w in _all_out(db, user) if w.id == wish_id)


@router.get("", response_model=list[WishOut])
def list_wishes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _all_out(db, user)


@router.post("", response_model=WishOut, status_code=status.HTTP_201_CREATED)
def create_wish(
    body: WishIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    count = db.scalar(select(func.count()).select_from(Wish).where(Wish.user_id == user.id))
    if count >= MAX_WISHES:
        raise HTTPException(status.HTTP_409_CONFLICT, "ほしいものは 3 つまでだよ")
    wish = Wish(user_id=user.id, **body.model_dump())
    db.add(wish)
    db.commit()
    return _one_out(db, user, wish.id)


@router.patch("/{wish_id}", response_model=WishOut)
def update_wish(
    wish_id: int,
    body: WishUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wish = _own_wish(db, user, wish_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(wish, field, value)
    db.commit()
    return _one_out(db, user, wish.id)


@router.delete("/{wish_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wish(
    wish_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.delete(_own_wish(db, user, wish_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
