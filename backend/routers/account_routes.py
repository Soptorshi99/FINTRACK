from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import accounts_collection, transactions_collection
from dependencies import get_current_user, log_audit_action
from model.account_model import AccountCreate, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["Accounts"])


async def find_account(account_id: str, user_id):
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account id")
    account = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": user_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


async def account_balance(account, user_id):
    income = 0.0
    expenses = 0.0
    cursor = transactions_collection.find({"user_id": user_id, "account_id": account["_id"]})
    async for transaction in cursor:
        amount = float(transaction.get("amount", 0))
        if transaction.get("type") == "income":
            income += amount
        else:
            expenses += amount
    return float(account.get("opening_balance", 0)) + income - expenses


def serialize_account(account, balance):
    return {
        "_id": str(account["_id"]),
        "user_id": str(account["user_id"]),
        "name": account["name"],
        "account_type": account["account_type"],
        "opening_balance": account.get("opening_balance", 0),
        "balance": round(balance, 2),
    }


@router.post("")
async def create_account(account: AccountCreate, user=Depends(get_current_user)):
    data = account.model_dump()
    data.update({"user_id": user["_id"], "created_at": datetime.utcnow()})
    result = await accounts_collection.insert_one(data)
    await log_audit_action(user["_id"], "create_account", {"account_id": str(result.inserted_id), "name": account.name})
    return {"message": "Account created", "id": str(result.inserted_id)}


@router.get("")
async def get_accounts(user=Depends(get_current_user)):
    accounts = []
    async for account in accounts_collection.find({"user_id": user["_id"]}).sort("created_at", 1):
        accounts.append(serialize_account(account, await account_balance(account, user["_id"])))
    return accounts


@router.put("/{account_id}")
async def update_account(account_id: str, account: AccountUpdate, user=Depends(get_current_user)):
    await find_account(account_id, user["_id"])
    await accounts_collection.update_one(
        {"_id": ObjectId(account_id), "user_id": user["_id"]},
        {"$set": account.model_dump()},
    )
    await log_audit_action(user["_id"], "update_account", {"account_id": account_id, "name": account.name})
    return {"message": "Account updated"}


@router.delete("/{account_id}")
async def delete_account(account_id: str, user=Depends(get_current_user)):
    await find_account(account_id, user["_id"])
    linked = await transactions_collection.count_documents({"user_id": user["_id"], "account_id": ObjectId(account_id)})
    if linked:
        raise HTTPException(status_code=409, detail="Move or remove linked transactions before deleting this account")
    await accounts_collection.delete_one({"_id": ObjectId(account_id), "user_id": user["_id"]})
    await log_audit_action(user["_id"], "delete_account", {"account_id": account_id})
    return {"message": "Account deleted"}
