from fastapi import Depends, HTTPException
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from jose import jwt, JWTError
from bson import ObjectId
import os

from database import users_collection

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM")]
        )

        user_id = payload["sub"]

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = await users_collection.find_one(
        {
            "_id": ObjectId(user_id)
        }
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


import time
from collections import defaultdict
from fastapi import Request

class SimpleRateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history = defaultdict(list)

    def is_rate_limited(self, identifier: str) -> bool:
        now = time.time()
        timestamps = self.history[identifier]
        
        # filter out timestamps older than the window
        timestamps = [t for t in timestamps if now - t < self.window_seconds]
        self.history[identifier] = timestamps
        
        if len(timestamps) >= self.requests_limit:
            return True
            
        self.history[identifier].append(now)
        return False

login_limiter = SimpleRateLimiter(requests_limit=10, window_seconds=60)
ai_limiter = SimpleRateLimiter(requests_limit=15, window_seconds=60)

async def rate_limit_auth(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if login_limiter.is_rate_limited(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again in a minute."
        )

async def rate_limit_ai(request: Request, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    if ai_limiter.is_rate_limited(user_id):
        raise HTTPException(
            status_code=429,
            detail="AI assistant rate limit exceeded. Please wait a minute."
        )


# General rate limiter for financial write endpoints — 60 requests/minute per user
api_limiter = SimpleRateLimiter(requests_limit=60, window_seconds=60)

async def rate_limit_api(request: Request, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    if api_limiter.is_rate_limited(user_id):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down and try again in a minute."
        )


async def get_current_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    return current_user


from database import audit_logs_collection

async def log_audit_action(user_id, action: str, details: dict):
    from datetime import datetime
    try:
        await audit_logs_collection.insert_one({
            "user_id": ObjectId(user_id) if user_id else None,
            "action": action,
            "details": details,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Audit log insertion failed: {str(e)}")