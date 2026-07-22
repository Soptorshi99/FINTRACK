from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from database import loans_collection
from dependencies import get_current_user, log_audit_action, rate_limit_api
from model.loan_model import LoanCreate, LoanUpdate

router = APIRouter(prefix="/loans", tags=["Loans"])


def serialize_loan(item):
    item["_id"] = str(item["_id"])
    item["user_id"] = str(item["user_id"])
    principal = float(item["principal_amount"])
    remaining = float(item["remaining_amount"])
    item["paid_amount"] = max(principal - remaining, 0)
    item["paid_percent"] = round((item["paid_amount"] / principal) * 100, 2) if principal else 0
    return item


@router.post("", dependencies=[Depends(rate_limit_api)])
async def create_loan(loan: LoanCreate, user=Depends(get_current_user)):
    if loan.remaining_amount > loan.principal_amount:
        raise HTTPException(status_code=422, detail="Remaining amount cannot exceed principal")
    data = loan.model_dump()
    data.update({"user_id": user["_id"], "created_at": datetime.utcnow()})
    result = await loans_collection.insert_one(data)
    await log_audit_action(user["_id"], "create_loan", {"loan_id": str(result.inserted_id), "name": loan.name, "principal_amount": loan.principal_amount})
    return {"message": "Loan added", "id": str(result.inserted_id)}


@router.get("")
async def get_loans(user=Depends(get_current_user)):
    loans = []
    cursor = loans_collection.find({"user_id": user["_id"]}).sort("created_at", -1)
    async for loan in cursor:
        loans.append(serialize_loan(loan))
    return loans


@router.put("/{loan_id}", dependencies=[Depends(rate_limit_api)])
async def update_loan(loan_id: str, loan: LoanUpdate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(loan_id):
        raise HTTPException(status_code=400, detail="Invalid loan id")
    if loan.remaining_amount > loan.principal_amount:
        raise HTTPException(status_code=422, detail="Remaining amount cannot exceed principal")
    result = await loans_collection.update_one(
        {"_id": ObjectId(loan_id), "user_id": user["_id"]},
        {"$set": loan.model_dump()},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Loan not found")
    await log_audit_action(user["_id"], "update_loan", {"loan_id": loan_id})
    return {"message": "Loan updated"}


@router.delete("/{loan_id}", dependencies=[Depends(rate_limit_api)])
async def delete_loan(loan_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(loan_id):
        raise HTTPException(status_code=400, detail="Invalid loan id")
    result = await loans_collection.delete_one({"_id": ObjectId(loan_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loan not found")
    await log_audit_action(user["_id"], "delete_loan", {"loan_id": loan_id})
    return {"message": "Loan deleted"}
