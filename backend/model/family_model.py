from pydantic import BaseModel, Field
from typing import Optional, List


class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    shared_categories: List[str] = Field(
        default=["Groceries", "Rent", "Utilities", "Transport", "Food", "Entertainment"]
    )


class FamilyJoin(BaseModel):
    invite_code: str = Field(min_length=6, max_length=12)


class SharedBudgetSet(BaseModel):
    category: str = Field(min_length=1, max_length=60)
    amount: float = Field(gt=0)
    month: str  # YYYY-MM
