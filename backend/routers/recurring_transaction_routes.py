from calendar import monthrange
from datetime import date, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from database import accounts_collection, recurring_transactions_collection, transactions_collection
from dependencies import get_current_user, log_audit_action, rate_limit_api
from model.recurring_transaction_model import (
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
)

router = APIRouter(
    prefix="/recurring-transactions",
    tags=["Recurring Transactions"],
)


def serialize_recurring_transaction(item):
    item["_id"] = str(item["_id"])
    item["user_id"] = str(item["user_id"])
    if item.get("account_id"):
        item["account_id"] = str(item["account_id"])
    return item


@router.post("", dependencies=[Depends(rate_limit_api)])
async def create_recurring_transaction(
    recurring: RecurringTransactionCreate,
    user=Depends(get_current_user),
):
    data = recurring.model_dump()
    if data.get("account_id"):
        if not ObjectId.is_valid(data["account_id"]) or not await accounts_collection.find_one({"_id": ObjectId(data["account_id"]), "user_id": user["_id"]}):
            raise HTTPException(status_code=404, detail="Account not found")
        data["account_id"] = ObjectId(data["account_id"])
    data.update({
        "user_id": user["_id"],
        "active": True,
        "created_at": datetime.utcnow(),
    })
    result = await recurring_transactions_collection.insert_one(data)
    await log_audit_action(user["_id"], "create_recurring_transaction", {"recurring_id": str(result.inserted_id), "title": recurring.title, "amount": recurring.amount})
    return {"message": "Recurring transaction created", "id": str(result.inserted_id)}


@router.get("")
async def get_recurring_transactions(user=Depends(get_current_user)):
    items = []
    cursor = recurring_transactions_collection.find({"user_id": user["_id"]}).sort("created_at", -1)
    async for item in cursor:
        items.append(serialize_recurring_transaction(item))
    return items


@router.post("/process")
async def process_recurring_transactions(user=Depends(get_current_user)):
    today = date.today()
    month_key = today.strftime("%Y-%m")
    created = 0

    cursor = recurring_transactions_collection.find({
        "user_id": user["_id"],
        "active": True,
    })
    async for recurring in cursor:
        scheduled_day = min(
            recurring["day_of_month"],
            monthrange(today.year, today.month)[1],
        )
        if today.day < scheduled_day:
            continue

        exists = await transactions_collection.find_one({
            "user_id": user["_id"],
            "recurring_transaction_id": recurring["_id"],
            "recurring_month": month_key,
        })
        if exists:
            continue

        scheduled_date = date(today.year, today.month, scheduled_day)
        transaction_data = {
            "user_id": user["_id"],
            "type": recurring["type"],
            "category": recurring["category"],
            "amount": recurring["amount"],
            "description": recurring.get("description") or recurring["title"],
            "date": scheduled_date.isoformat(),
            "recurring_transaction_id": recurring["_id"],
            "recurring_month": month_key,
            "created_at": datetime.utcnow(),
        }
        if recurring.get("account_id"):
            transaction_data["account_id"] = recurring["account_id"]
        await transactions_collection.insert_one(transaction_data)
        created += 1

    return {"message": "Recurring transactions processed", "created": created}


@router.put("/{recurring_id}", dependencies=[Depends(rate_limit_api)])
async def update_recurring_transaction(
    recurring_id: str,
    recurring: RecurringTransactionUpdate,
    user=Depends(get_current_user),
):
    if not ObjectId.is_valid(recurring_id):
        raise HTTPException(status_code=400, detail="Invalid recurring transaction id")

    update_data = recurring.model_dump()
    if update_data.get("account_id"):
        if not ObjectId.is_valid(update_data["account_id"]) or not await accounts_collection.find_one({"_id": ObjectId(update_data["account_id"]), "user_id": user["_id"]}):
            raise HTTPException(status_code=404, detail="Account not found")
        update_data["account_id"] = ObjectId(update_data["account_id"])

    result = await recurring_transactions_collection.update_one(
        {"_id": ObjectId(recurring_id), "user_id": user["_id"]},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    await log_audit_action(user["_id"], "update_recurring_transaction", {"recurring_id": recurring_id})
    return {"message": "Recurring transaction updated"}


@router.delete("/{recurring_id}", dependencies=[Depends(rate_limit_api)])
async def delete_recurring_transaction(recurring_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(recurring_id):
        raise HTTPException(status_code=400, detail="Invalid recurring transaction id")

    result = await recurring_transactions_collection.delete_one({
        "_id": ObjectId(recurring_id),
        "user_id": user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    await log_audit_action(user["_id"], "delete_recurring_transaction", {"recurring_id": recurring_id})
    return {"message": "Recurring transaction deleted"}
