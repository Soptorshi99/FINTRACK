from typing import Literal, Optional

from pydantic import BaseModel, Field


class RecurringTransactionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=60)
    amount: float = Field(gt=0)
    day_of_month: int = Field(ge=1, le=31)
    description: str = Field(default="", max_length=250)
    account_id: Optional[str] = None


class RecurringTransactionUpdate(RecurringTransactionCreate):
    active: bool = True
