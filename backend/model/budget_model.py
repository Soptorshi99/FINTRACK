from pydantic import BaseModel

class BudgetCreate(BaseModel):
    category: str
    amount: float
    month: str