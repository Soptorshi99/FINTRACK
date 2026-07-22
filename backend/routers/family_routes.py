"""
Shared Family Budget Router
Users create or join a family group via an invite code.
Shared-category transactions from all members are pooled for visibility.
"""
import secrets
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import (
    families_collection,
    transactions_collection,
    users_collection,
    budgets_collection,
)
from dependencies import get_current_user, log_audit_action
from model.family_model import FamilyCreate, FamilyJoin, SharedBudgetSet

router = APIRouter(prefix="/family", tags=["Family Budget"])


async def _get_user_family(user_id):
    """Return the family document the user belongs to, or None."""
    return await families_collection.find_one({
        "members": user_id
    })


def _serialize_family(family, members_info):
    return {
        "_id": str(family["_id"]),
        "name": family["name"],
        "invite_code": family["invite_code"],
        "created_by": str(family["created_by"]),
        "shared_categories": family.get("shared_categories", []),
        "shared_budgets": family.get("shared_budgets", []),
        "members": members_info,
        "created_at": family.get("created_at", "").isoformat() if family.get("created_at") else None,
    }


@router.post("/create")
async def create_family(body: FamilyCreate, current_user=Depends(get_current_user)):
    user_id = current_user["_id"]

    # User can only be in one family
    existing = await _get_user_family(user_id)
    if existing:
        raise HTTPException(status_code=409, detail="You are already in a family group. Leave it first.")

    invite_code = secrets.token_hex(4).upper()  # 8-char code e.g. "A3F2B9C1"

    result = await families_collection.insert_one({
        "name": body.name,
        "invite_code": invite_code,
        "created_by": user_id,
        "members": [user_id],
        "shared_categories": body.shared_categories,
        "shared_budgets": [],
        "created_at": datetime.utcnow(),
    })
    await log_audit_action(user_id, "create_family", {"family_id": str(result.inserted_id), "name": body.name})
    return {
        "message": "Family group created",
        "family_id": str(result.inserted_id),
        "invite_code": invite_code,
    }


@router.post("/join")
async def join_family(body: FamilyJoin, current_user=Depends(get_current_user)):
    user_id = current_user["_id"]

    existing = await _get_user_family(user_id)
    if existing:
        raise HTTPException(status_code=409, detail="You are already in a family group.")

    family = await families_collection.find_one({"invite_code": body.invite_code.upper()})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code. Please check and try again.")

    await families_collection.update_one(
        {"_id": family["_id"]},
        {"$addToSet": {"members": user_id}}
    )
    await log_audit_action(user_id, "join_family", {"family_id": str(family["_id"])})
    return {"message": f"Joined family: {family['name']}"}


@router.get("")
async def get_family(current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    family = await _get_user_family(user_id)
    if not family:
        return None

    # Hydrate member info
    members_info = []
    for mid in family["members"]:
        user = await users_collection.find_one({"_id": mid})
        if user:
            members_info.append({
                "id": str(mid),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "is_creator": mid == family["created_by"],
            })

    return _serialize_family(family, members_info)


@router.get("/shared-transactions")
async def get_shared_transactions(current_user=Depends(get_current_user)):
    """Pool shared-category expenses from all family members."""
    user_id = current_user["_id"]
    family = await _get_user_family(user_id)
    if not family:
        raise HTTPException(status_code=404, detail="You are not in a family group.")

    shared_cats = [c.lower() for c in family.get("shared_categories", [])]
    member_ids = family["members"]

    # Aggregate by member
    member_map = {}
    for mid in member_ids:
        user = await users_collection.find_one({"_id": mid})
        member_map[str(mid)] = user.get("name", "Unknown") if user else "Unknown"

    result = []
    async for tx in transactions_collection.find({
        "user_id": {"$in": member_ids},
        "type": "expense",
        "$expr": {"$in": [{"$toLower": "$category"}, shared_cats]},
    }).sort("date", -1).limit(200):
        tx["_id"] = str(tx["_id"])
        tx["user_id"] = str(tx["user_id"])
        tx["member_name"] = member_map.get(tx["user_id"], "Unknown")
        result.append(tx)

    # Member contribution summary
    contributions = {str(mid): {"name": member_map[str(mid)], "total": 0.0} for mid in member_ids}
    for tx in result:
        contributions[tx["user_id"]]["total"] += float(tx.get("amount", 0))

    return {
        "transactions": result,
        "contributions": list(contributions.values()),
        "shared_categories": family["shared_categories"],
    }


@router.post("/shared-budget")
async def set_shared_budget(body: SharedBudgetSet, current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    family = await _get_user_family(user_id)
    if not family:
        raise HTTPException(status_code=404, detail="You are not in a family group.")

    if family["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Only the family creator can set shared budgets.")

    # Upsert budget entry for this category+month
    budgets = family.get("shared_budgets", [])
    updated = False
    for b in budgets:
        if b["category"] == body.category and b["month"] == body.month:
            b["amount"] = body.amount
            updated = True
            break
    if not updated:
        budgets.append({"category": body.category, "month": body.month, "amount": body.amount})

    await families_collection.update_one(
        {"_id": family["_id"]},
        {"$set": {"shared_budgets": budgets}}
    )
    await log_audit_action(user_id, "set_shared_budget", {"category": body.category, "amount": body.amount})
    return {"message": "Shared budget updated"}


@router.delete("/leave")
async def leave_family(current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    family = await _get_user_family(user_id)
    if not family:
        raise HTTPException(status_code=404, detail="You are not in a family group.")

    if family["created_by"] == user_id and len(family["members"]) > 1:
        raise HTTPException(
            status_code=409,
            detail="Transfer ownership or remove all members before leaving as creator."
        )

    await families_collection.update_one(
        {"_id": family["_id"]},
        {"$pull": {"members": user_id}}
    )
    # Delete family if empty
    updated = await families_collection.find_one({"_id": family["_id"]})
    if updated and len(updated.get("members", [])) == 0:
        await families_collection.delete_one({"_id": family["_id"]})

    await log_audit_action(user_id, "leave_family", {"family_id": str(family["_id"])})
    return {"message": "Left family group"}
