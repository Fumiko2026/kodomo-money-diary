from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Category, Record, User
from app.schemas import BalanceOut, RecordIn, RecordOut
from app.services import calc_balance, month_range, today_jst

router = APIRouter(prefix="/api")

Month = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


def _out(record: Record, category: Category | None) -> RecordOut:
    out = RecordOut.model_validate(record)
    if category is not None:
        out.category_name = category.name
        out.category_color = category.color
    return out


def _own_record(db: Session, user: User, record_id: int) -> Record:
    record = db.scalar(
        select(Record).where(Record.id == record_id, Record.user_id == user.id)
    )
    if record is None:  # 他の人の記録も、同じ 404(存在を教えない)
        raise HTTPException(status.HTTP_404_NOT_FOUND, "きろくが みつからないよ")
    return record


def _check_input(db: Session, user: User, body: RecordIn) -> Category | None:
    if body.record_date > today_jst():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "あしたより あとの日づけは えらべないよ")
    if body.category_id is None:
        return None
    category = db.scalar(
        select(Category).where(
            Category.id == body.category_id,
            or_(Category.user_id == user.id, Category.user_id.is_(None)),
        )
    )
    if category is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "そのしゅるいは つかえないよ")
    return category


@router.get("/balance", response_model=BalanceOut)
def get_balance(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return calc_balance(db, user)


@router.get("/records", response_model=list[RecordOut])
def list_records(
    month: Month | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Record, Category)
        .outerjoin(Category, Record.category_id == Category.id)
        .where(Record.user_id == user.id)
        .order_by(Record.record_date.desc(), Record.id.desc())
        .limit(limit)
        .offset(offset)
    )
    if month:
        start, end = month_range(month)
        query = query.where(Record.record_date >= start, Record.record_date < end)
    return [_out(r, c) for r, c in db.execute(query).all()]


@router.post("/records", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_record(
    body: RecordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    category = _check_input(db, user, body)
    record = Record(user_id=user.id, **body.model_dump())
    db.add(record)
    db.commit()
    return _out(record, category)


@router.get("/records/{record_id}", response_model=RecordOut)
def get_record(
    record_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    record = _own_record(db, user, record_id)
    return _out(record, db.get(Category, record.category_id) if record.category_id else None)


@router.put("/records/{record_id}", response_model=RecordOut)
def update_record(
    record_id: int,
    body: RecordIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _own_record(db, user, record_id)
    category = _check_input(db, user, body)
    for field, value in body.model_dump().items():
        setattr(record, field, value)
    db.commit()
    return _out(record, category)


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.delete(_own_record(db, user, record_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
