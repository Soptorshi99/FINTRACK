from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGO_URI"))

db = client[os.getenv("DATABASE_NAME")]

users_collection = db["users"]

transactions_collection = db["transactions"]

budgets_collection = db["budgets"]

goals_collection = db["goals"]