from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from database import bill_reminders_collection
from dependencies import get_current_user, log_audit_action, rate_limit_api
from model.bill_reminder_model import BillReminderCreate, BillReminderPaidUpdate

router = APIRouter(prefix="/bill-reminders", tags=["Bill Reminders"])


def serialize_bill(item):
    item["_id"] = str(item["_id"])
    item["user_id"] = str(item["user_id"])
    return item


@router.post("", dependencies=[Depends(rate_limit_api)])
async def create_bill_reminder(bill: BillReminderCreate, user=Depends(get_current_user)):
    data = bill.model_dump()
    data["due_date"] = data["due_date"].isoformat()
    data.update({
        "user_id": user["_id"],
        "is_paid": False,
        "created_at": datetime.utcnow(),
    })
    result = await bill_reminders_collection.insert_one(data)
    await log_audit_action(user["_id"], "create_bill_reminder", {"bill_id": str(result.inserted_id), "title": bill.title, "amount": bill.amount})
    return {"message": "Bill reminder created", "id": str(result.inserted_id)}


@router.get("")
async def get_bill_reminders(user=Depends(get_current_user)):
    bills = []
    cursor = bill_reminders_collection.find({"user_id": user["_id"]}).sort("due_date", 1)
    async for bill in cursor:
        bills.append(serialize_bill(bill))
    return bills


@router.patch("/{bill_id}/paid", dependencies=[Depends(rate_limit_api)])
async def update_bill_paid_status(
    bill_id: str,
    update: BillReminderPaidUpdate,
    user=Depends(get_current_user),
):
    if not ObjectId.is_valid(bill_id):
        raise HTTPException(status_code=400, detail="Invalid bill reminder id")

    result = await bill_reminders_collection.update_one(
        {"_id": ObjectId(bill_id), "user_id": user["_id"]},
        {"$set": {"is_paid": update.is_paid, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill reminder not found")
    await log_audit_action(user["_id"], "update_bill_paid_status", {"bill_id": bill_id, "is_paid": update.is_paid})
    return {"message": "Bill reminder updated"}


@router.delete("/{bill_id}", dependencies=[Depends(rate_limit_api)])
async def delete_bill_reminder(bill_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(bill_id):
        raise HTTPException(status_code=400, detail="Invalid bill reminder id")

    result = await bill_reminders_collection.delete_one({
        "_id": ObjectId(bill_id),
        "user_id": user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill reminder not found")
    await log_audit_action(user["_id"], "delete_bill_reminder", {"bill_id": bill_id})
    return {"message": "Bill reminder deleted"}
