from pydantic import BaseModel
from typing import Optional

class GoalCreate(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[str] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None
