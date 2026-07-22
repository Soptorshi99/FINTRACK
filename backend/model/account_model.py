from typing import Literal

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    account_type: Literal["Bank", "Cash", "Wallet", "Other"]
    opening_balance: float = Field(default=0, ge=0)


class AccountUpdate(AccountCreate):
    pass
