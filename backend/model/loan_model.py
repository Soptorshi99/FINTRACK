from typing import Optional

from pydantic import BaseModel, Field


class LoanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    principal_amount: float = Field(gt=0)
    remaining_amount: float = Field(ge=0)
    emi_amount: float = Field(gt=0)
    interest_rate: Optional[float] = Field(default=None, ge=0)
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    notes: str = Field(default="", max_length=250)


class LoanUpdate(LoanCreate):
    pass
