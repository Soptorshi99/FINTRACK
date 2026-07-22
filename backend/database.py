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

recurring_transactions_collection = db["recurring_transactions"]

bill_reminders_collection = db["bill_reminders"]

investments_collection = db["investments"]

loans_collection = db["loans"]

accounts_collection = db["accounts"]

net_worth_snapshots_collection = db["net_worth_snapshots"]

audit_logs_collection = db["audit_logs"]

challenges_collection = db["challenges"]

user_challenges_collection = db["user_challenges"]

families_collection = db["families"]

