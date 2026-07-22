from pydantic import BaseModel, Field

class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=60)
    amount: float = Field(gt=0)
    month: str = Field(pattern=r"^\d{4}-\d{2}$")