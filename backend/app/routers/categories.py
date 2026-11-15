from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Category, Record, User
from app.schemas import CategoryIn, CategoryOut, CategoryUpdate, CategoryUsage

router = APIRouter(prefix="/api/categories")

NAME_TAKEN = "おなじ名前の しゅるいが あるよ"


def _editable_category(db: Session, user: User, category_id: int) -> Category:
    """直せる・消せる項目(自分で作ったもの)を返す。"""
    category = db.scalar(
        select(Category).where(
            Category.id == category_id,
            or_(Category.user_id == user.id, Category.user_id.is_(None)),
        )
    )
    if category is None:  # 他の人の項目も、同じ 404
        raise HTTPException(status.HTTP_404_NOT_FOUND, "しゅるいが みつからないよ")
    if category.is_default:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "はじめから ある しゅるいは 直せないよ")
    return category


def _name_taken(db: Session, user: User, name: str, except_id: int | None = None) -> bool:
    """同じ名前が、はじめから入っている項目か、自分の項目にあるか。"""
    query = select(func.count()).select_from(Category).where(
        Category.name == name, or_(Category.user_id == user.id, Category.user_id.is_(None))
    )
    if except_id is not None:
        query = query.where(Category.id != except_id)
    return db.scalar(query) > 0


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(Category)
        .where(or_(Category.user_id == user.id, Category.user_id.is_(None)))
        .order_by(Category.is_default.desc(), Category.id)
    ).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if _name_taken(db, user, body.name):
        raise HTTPException(status.HTTP_409_CONFLICT, NAME_TAKEN)
    category = Category(user_id=user.id, name=body.name, color=body.color, is_default=False)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:  # 同時に 2 回押されたとき
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, NAME_TAKEN)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    body: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = _editable_category(db, user, category_id)
    if body.name is not None:
        if _name_taken(db, user, body.name, except_id=category.id):
            raise HTTPException(status.HTTP_409_CONFLICT, NAME_TAKEN)
        category.name = body.name
    if body.color is not None:
        category.color = body.color
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, NAME_TAKEN)
    return category


@router.get("/{category_id}/usage", response_model=CategoryUsage)
def category_usage(
    category_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    category = _editable_category(db, user, category_id)
    count = db.scalar(
        select(func.count()).select_from(Record).where(
            Record.user_id == user.id, Record.category_id == category.id
        )
    )
    return {"record_count": count}


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    category = _editable_category(db, user, category_id)
    other = db.scalar(
        select(Category).where(Category.is_default.is_(True), Category.name == "その他")
    )
    # 使われている記録を「その他」へ移してから消す(1 回の確定で、まとめて行う)
    db.execute(
        update(Record)
        .where(Record.user_id == user.id, Record.category_id == category.id)
        .values(category_id=other.id)
    )
    db.delete(category)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
