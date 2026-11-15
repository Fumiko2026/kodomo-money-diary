from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Category, Record, User
from app.schemas import SummaryOut
from app.services import month_range

router = APIRouter(prefix="/api")

Month = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


@router.get("/summary", response_model=SummaryOut)
def get_summary(
    month: Month, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    start, end = month_range(month)
    in_month = (
        Record.user_id == user.id,
        Record.record_date >= start,
        Record.record_date < end,
    )

    # 種類・もらった種類ごとの合計
    totals: dict[tuple[str, str | None], int] = {
        (t, k): int(s)
        for t, k, s in db.execute(
            select(Record.type, Record.income_kind, func.sum(Record.amount))
            .where(*in_month)
            .group_by(Record.type, Record.income_kind)
        )
    }
    allowance = totals.get(("income", "allowance"), 0)
    otoshidama = totals.get(("income", "otoshidama"), 0)
    expense_total = totals.get(("expense", None), 0)

    by_category = [
        {"category_id": cid, "name": name, "color": color, "amount": int(amount)}
        for cid, name, color, amount in db.execute(
            select(Category.id, Category.name, Category.color, func.sum(Record.amount))
            .join(Category, Record.category_id == Category.id)
            .where(*in_month, Record.type == "expense")
            .group_by(Category.id, Category.name, Category.color)
            .order_by(func.sum(Record.amount).desc(), Category.id)
        )
    ]

    return {
        "month": month,
        "income": {"total": allowance + otoshidama, "allowance": allowance, "otoshidama": otoshidama},
        "expense": {"total": expense_total, "by_category": by_category},
        "deposit": totals.get(("deposit", None), 0),
        "withdraw": totals.get(("withdraw", None), 0),
        # 貯金の出し入れは、さいふと貯金の間の移動なので、差額には入れない
        "diff": allowance + otoshidama - expense_total,
    }
