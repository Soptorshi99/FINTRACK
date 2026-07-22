from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from database import investments_collection
from dependencies import get_current_user, log_audit_action, rate_limit_api
from model.investment_model import InvestmentCreate, InvestmentUpdate

router = APIRouter(prefix="/investments", tags=["Investments"])


def serialize_investment(item):
    item["_id"] = str(item["_id"])
    item["user_id"] = str(item["user_id"])
    item["profit_loss"] = float(item["current_value"]) - float(item["invested_amount"])
    item["return_percent"] = round(
        (item["profit_loss"] / float(item["invested_amount"])) * 100,
        2,
    ) if item["invested_amount"] else 0
    return item


@router.post("", dependencies=[Depends(rate_limit_api)])
async def create_investment(investment: InvestmentCreate, user=Depends(get_current_user)):
    data = investment.model_dump()
    data.update({"user_id": user["_id"], "created_at": datetime.utcnow()})
    result = await investments_collection.insert_one(data)
    await log_audit_action(user["_id"], "create_investment", {"investment_id": str(result.inserted_id), "name": investment.name, "invested_amount": investment.invested_amount})
    return {"message": "Investment added", "id": str(result.inserted_id)}


@router.get("")
async def get_investments(user=Depends(get_current_user)):
    investments = []
    cursor = investments_collection.find({"user_id": user["_id"]}).sort("created_at", -1)
    async for investment in cursor:
        investments.append(serialize_investment(investment))
    return investments


@router.put("/{investment_id}", dependencies=[Depends(rate_limit_api)])
async def update_investment(investment_id: str, investment: InvestmentUpdate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(investment_id):
        raise HTTPException(status_code=400, detail="Invalid investment id")
    result = await investments_collection.update_one(
        {"_id": ObjectId(investment_id), "user_id": user["_id"]},
        {"$set": investment.model_dump()},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Investment not found")
    await log_audit_action(user["_id"], "update_investment", {"investment_id": investment_id})
    return {"message": "Investment updated"}


@router.delete("/{investment_id}", dependencies=[Depends(rate_limit_api)])
async def delete_investment(investment_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(investment_id):
        raise HTTPException(status_code=400, detail="Invalid investment id")
    result = await investments_collection.delete_one({"_id": ObjectId(investment_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investment not found")
    await log_audit_action(user["_id"], "delete_investment", {"investment_id": investment_id})
    return {"message": "Investment deleted"}
