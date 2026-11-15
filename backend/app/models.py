"""ER図(docs/er.md)のテーブル。残高・貯金は保存せず、記録から計算する。"""

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

RECORD_TYPES = ("income", "expense", "deposit", "withdraw")
INCOME_KINDS = ("allowance", "otoshidama")


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("initial_wallet >= 0", name="ck_users_initial_wallet"),
        CheckConstraint("initial_savings >= 0", name="ck_users_initial_savings"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nickname: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    initial_wallet: Mapped[int] = mapped_column(Integer, default=0)
    initial_savings: Mapped[int] = mapped_column(Integer, default=0)


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    # NULL = はじめから入っている項目(全員で共通)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(30))
    color: Mapped[str] = mapped_column(String(20))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class Record(TimestampMixin, Base):
    __tablename__ = "records"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_records_amount"),
        CheckConstraint(
            "type IN ('income','expense','deposit','withdraw')", name="ck_records_type"
        ),
        CheckConstraint(
            "(type = 'income' AND income_kind IS NOT NULL"
            " AND income_kind IN ('allowance','otoshidama'))"
            " OR (type <> 'income' AND income_kind IS NULL)",
            name="ck_records_income_kind",
        ),
        CheckConstraint(
            "(type = 'expense') = (category_id IS NOT NULL)",
            name="ck_records_category",
        ),
        Index(
            "ix_records_user_date",
            "user_id",
            text("record_date DESC"),
            text("id DESC"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    record_date: Mapped[date] = mapped_column(Date)
    type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[int] = mapped_column(Integer)
    income_kind: Mapped[str | None] = mapped_column(String(12), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True
    )
    memo: Mapped[str] = mapped_column(String(200), default="")


class Wish(TimestampMixin, Base):
    __tablename__ = "wishes"
    __table_args__ = (
        CheckConstraint("target_amount > 0", name="ck_wishes_target"),
        CheckConstraint(
            "otoshidama_plan IS NULL OR otoshidama_plan >= 0", name="ck_wishes_otoshidama"
        ),
        CheckConstraint(
            "monthly_plan IS NULL OR monthly_plan >= 0", name="ck_wishes_monthly"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(50))
    target_amount: Mapped[int] = mapped_column(Integer)
    otoshidama_plan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    monthly_plan: Mapped[int | None] = mapped_column(Integer, nullable=True)
