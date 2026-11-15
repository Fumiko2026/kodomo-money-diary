from datetime import date
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.palette import ColorKey

# 金額の上限は、DB の int(約21億)に収まる値にしておく
Money = Annotated[int, Field(ge=0, le=99_999_999)]
Nickname = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
Password = Annotated[str, StringConstraints(min_length=4, max_length=72)]


class RegisterIn(BaseModel):
    nickname: Nickname
    password: Password
    initial_wallet: Money = 0
    initial_savings: Money = 0


class LoginIn(BaseModel):
    nickname: str
    password: str


class MeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nickname: str
    initial_wallet: int
    initial_savings: int


class MeUpdate(BaseModel):
    initial_wallet: Money | None = None
    initial_savings: Money | None = None


class BalanceOut(BaseModel):
    wallet: int
    savings: int


RecordType = Literal["income", "expense", "deposit", "withdraw"]
IncomeKind = Literal["allowance", "otoshidama"]


class RecordIn(BaseModel):
    record_date: date
    type: RecordType
    amount: Annotated[int, Field(ge=1, le=99_999_999)]
    income_kind: IncomeKind | None = None
    category_id: int | None = None
    memo: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] = ""

    @model_validator(mode="after")
    def check_fields_for_type(self) -> Self:
        if self.type == "income" and self.income_kind is None:
            raise ValueError("おこづかいか お年玉を えらんでね")
        if self.type != "income" and self.income_kind is not None:
            raise ValueError("income_kind は、もらったのときだけ使えます")
        if self.type == "expense" and self.category_id is None:
            raise ValueError("しゅるいを えらんでね")
        if self.type != "expense" and self.category_id is not None:
            raise ValueError("category_id は、つかったのときだけ使えます")
        return self


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    record_date: date
    type: RecordType
    amount: int
    income_kind: IncomeKind | None
    category_id: int | None
    category_name: str | None = None
    category_color: str | None = None
    memo: str


CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10)]


class CategoryIn(BaseModel):
    name: CategoryName
    color: ColorKey


class CategoryUpdate(BaseModel):
    name: CategoryName | None = None
    color: ColorKey | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    is_default: bool


class CategoryUsage(BaseModel):
    record_count: int


class SummaryIncome(BaseModel):
    total: int
    allowance: int
    otoshidama: int


class SummaryCategory(BaseModel):
    category_id: int
    name: str
    color: str
    amount: int


class SummaryExpense(BaseModel):
    total: int
    by_category: list[SummaryCategory]


class SummaryOut(BaseModel):
    month: str
    income: SummaryIncome
    expense: SummaryExpense
    deposit: int
    withdraw: int
    diff: int


WishName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
TargetAmount = Annotated[int, Field(ge=1, le=99_999_999)]


class WishIn(BaseModel):
    name: WishName
    target_amount: TargetAmount
    otoshidama_plan: Money | None = None
    monthly_plan: Money | None = None


class WishUpdate(BaseModel):
    """送った項目だけを直す。計画は null を送ると、空にできる。"""

    name: WishName | None = None
    target_amount: TargetAmount | None = None
    otoshidama_plan: Money | None = None
    monthly_plan: Money | None = None

    @model_validator(mode="after")
    def required_fields_are_not_null(self) -> Self:
        for field in ("name", "target_amount"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} は、空にできません")
        return self


class WishOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    target_amount: int
    otoshidama_plan: int | None
    monthly_plan: int | None
    saved: int = 0
    months_left: int | None = None
