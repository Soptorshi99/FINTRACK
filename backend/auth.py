from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

import logging
logger = logging.getLogger("uvicorn.error")
if not SECRET_KEY:
    logger.warning("WARNING: SECRET_KEY environment variable is not set!")
elif SECRET_KEY == "supersecretkey" or len(SECRET_KEY) < 32:
    logger.warning("WARNING: Using a weak or default SECRET_KEY. Please set a strong SECRET_KEY in your .env file!")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(
    plain_password,
    hashed_password
):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=60
    )

    to_encode.update({"exp": expire, "type": "access"})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def verify_refresh_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )
    if payload.get("type") != "refresh":
        raise jwt.JWTError("Not a refresh token")
    return payload