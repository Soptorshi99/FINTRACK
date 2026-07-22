from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal
from datetime import date
import re


def validate_password_strength(password: str) -> str:
    """Enforce password complexity rules."""
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", password):
        raise ValueError("Password must contain at least one special character (!@#$%^&* etc.)")
    return password


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(max_length=72)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str = "user"
    is_verified: bool = False


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)



class RoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=60)
    amount: float = Field(gt=0)
    description: str = Field(max_length=250)
    date: date
    account_id: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=60)
    amount: Optional[float] = Field(default=None, gt=0)
    description: Optional[str] = Field(default=None, max_length=250)
    date: Optional[date] = None # type: ignore
    account_id: Optional[str] = None
