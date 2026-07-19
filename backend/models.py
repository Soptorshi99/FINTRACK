from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr

from datetime import date
from pydantic import BaseModel


class TransactionCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: str
    date: date

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[date] = None # type: ignore