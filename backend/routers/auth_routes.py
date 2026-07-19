from fastapi import (
    APIRouter,
    HTTPException,
    Depends
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from jose import jwt, JWTError
from bson import ObjectId
import os

from database import users_collection
from models import (
    UserRegister,
    UserLogin
)

from auth import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter()

security = HTTPBearer()
@router.post("/register")
async def register(user: UserRegister):

    existing = await users_collection.find_one(
        {"email": user.email}
    )

    if existing:
        raise HTTPException(
            400,
            "Email already exists"
        )

    hashed = hash_password(user.password)

    result = await users_collection.insert_one(
        {
            "name": user.name,
            "email": user.email,
            "password_hash": hashed
        }
    )

    return {
        "message": "User created",
        "user_id": str(result.inserted_id)
    }
@router.post("/login")
async def login(user: UserLogin):

    db_user = await users_collection.find_one(
        {"email": user.email}
    )

    if not db_user:
        raise HTTPException(
            401,
            "Invalid credentials"
        )

    if not verify_password(
        user.password,
        db_user["password_hash"]
    ):
        raise HTTPException(
            401,
            "Invalid credentials"
        )

    token = create_access_token(
        {
            "sub": str(db_user["_id"]),
            "email": db_user["email"]
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
from dependencies import get_current_user
@router.get("/me")
async def me(
    current_user=Depends(get_current_user)
):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"]
    }
