from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Record, User

JST = ZoneInfo("Asia/Tokyo")


def today_jst() -> date:
    return datetime.now(JST).date()


def month_range(month: str) -> tuple[date, date]:
    """'2026-11' -> (2026-11-01, 2026-12-01)。終わりの日は含まない。"""
    year, mon = (int(x) for x in month.split("-"))
    start = date(year, mon, 1)
    end = date(year + (mon == 12), mon % 12 + 1, 1)
    return start, end


def calc_balance(db: Session, user: User) -> dict[str, int]:
    """さいふと貯金を、記録から計算する(docs/er.md 第3節)。

    さいふ = 初期残高 + もらった − つかった − 貯金へ入れた + 貯金からだした
    貯金   = 初期貯金 + 貯金へ入れた − 貯金からだした
    """
    rows = db.execute(
        select(Record.type, func.coalesce(func.sum(Record.amount), 0))
        .where(Record.user_id == user.id)
        .group_by(Record.type)
    ).all()
    total = {t: 0 for t in ("income", "expense", "deposit", "withdraw")}
    total.update({t: int(s) for t, s in rows})
    return {
        "wallet": user.initial_wallet
        + total["income"]
        - total["expense"]
        - total["deposit"]
        + total["withdraw"],
        "savings": user.initial_savings + total["deposit"] - total["withdraw"],
    }


def allocate_savings(savings: int, targets: list[int]) -> list[int]:
    """貯金を、作った順(上のもの)から順に、目標金額まであてる(docs/screens.md S7)。

    貯金が 1,000 円で目標が [600, 800] なら、[600, 400]。マイナスの貯金は 0 として扱う。
    """
    remaining = max(savings, 0)
    saved = []
    for target in targets:
        used = min(remaining, target)
        saved.append(used)
        remaining -= used
    return saved


def months_left(target: int, saved: int, monthly_plan: int | None) -> int | None:
    """毎月の計画で、あと何か月か。計画が空か 0 円のときは、計算できないので None。"""
    if not monthly_plan:
        return None
    return max(0, -(-(target - saved) // monthly_plan))  # 切り上げ
