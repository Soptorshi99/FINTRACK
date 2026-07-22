from typing import Literal

from pydantic import BaseModel, Field


class InvestmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    asset_type: Literal["Stocks", "Mutual Funds", "Gold", "FD", "Other"]
    invested_amount: float = Field(gt=0)
    current_value: float = Field(ge=0)
    notes: str = Field(default="", max_length=250)


class InvestmentUpdate(InvestmentCreate):
    pass
