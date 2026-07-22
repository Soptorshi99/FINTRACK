from pydantic import BaseModel, Field
from typing import Optional

class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    deadline: Optional[str] = Field(default=None, max_length=20)

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    deadline: Optional[str] = Field(default=None, max_length=20)
