from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class BillReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    due_date: date
    amount: Optional[float] = Field(default=None, gt=0)
    category: str = Field(default="Bills", min_length=1, max_length=60)
    notes: str = Field(default="", max_length=250)


class BillReminderPaidUpdate(BaseModel):
    is_paid: bool
