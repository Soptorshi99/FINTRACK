"""
Financial Challenges Router
Predefined challenge templates with real-time progress calculated from user transactions.
"""
import secrets
from datetime import datetime, timedelta, date

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import (
    transactions_collection,
    user_challenges_collection,
    users_collection,
)
from dependencies import get_current_user, log_audit_action

router = APIRouter(prefix="/challenges", tags=["Challenges"])

# ── Predefined challenge templates ─────────────────────────────────────────────
CHALLENGE_TEMPLATES = [
    {
        "id": "no_food_delivery_7",
        "title": "No Food Delivery",
        "description": "Avoid food delivery apps for 7 days. Cook at home!",
        "icon": "🍳",
        "category": "badge",
        "duration_days": 7,
        "track_type": "avoid",           # avoid spending in tracked_category
        "tracked_category": "Food Delivery",
        "target_amount": None,
        "reward": "Home Chef Badge",
    },
    {
        "id": "save_5000_month",
        "title": "Save ₹5,000 This Month",
        "description": "Make sure your income exceeds expenses by ₹5,000 this month.",
        "icon": "💰",
        "category": "savings",
        "duration_days": 30,
        "track_type": "net_save",
        "tracked_category": None,
        "target_amount": 5000,
        "reward": "Saver Badge",
    },
    {
        "id": "no_entertainment_14",
        "title": "Entertainment Detox",
        "description": "Zero spending on Entertainment for 14 days.",
        "icon": "📵",
        "category": "badge",
        "duration_days": 14,
        "track_type": "avoid",
        "tracked_category": "Entertainment",
        "target_amount": None,
        "reward": "Monk Mode Badge",
    },
    {
        "id": "grocery_budget_30",
        "title": "Grocery Budget Master",
        "description": "Keep Grocery spending under ₹3,000 for 30 days.",
        "icon": "🛒",
        "category": "budget",
        "duration_days": 30,
        "track_type": "under_budget",
        "tracked_category": "Groceries",
        "target_amount": 3000,
        "reward": "Frugal Shopper Badge",
    },
    {
        "id": "transport_cut_7",
        "title": "Walk or Cycle Week",
        "description": "Cut Transport spending by 50% for 7 days.",
        "icon": "🚲",
        "category": "badge",
        "duration_days": 7,
        "track_type": "reduce_50pct",
        "tracked_category": "Transport",
        "target_amount": None,
        "reward": "Green Commuter Badge",
    },
    {
        "id": "no_shopping_21",
        "title": "No Impulse Shopping",
        "description": "Zero shopping expenses for 21 days.",
        "icon": "🛍️",
        "category": "badge",
        "duration_days": 21,
        "track_type": "avoid",
        "tracked_category": "Shopping",
        "target_amount": None,
        "reward": "Minimalist Badge",
    },
    {
        "id": "invest_1000",
        "title": "₹1,000 Investment Push",
        "description": "Log at least ₹1,000 in Investment Returns income this month.",
        "icon": "📈",
        "category": "investment",
        "duration_days": 30,
        "track_type": "earn_category",
        "tracked_category": "Investment Returns",
        "target_amount": 1000,
        "reward": "Investor Badge",
    },
]


def _get_template(challenge_id: str):
    for t in CHALLENGE_TEMPLATES:
        if t["id"] == challenge_id:
            return t
    return None


async def _compute_progress(challenge_doc: dict, user_id, template: dict) -> dict:
    """Calculate real-time progress for a joined challenge."""
    start = challenge_doc["started_at"]
    end = start + timedelta(days=template["duration_days"])
    today = datetime.utcnow()

    days_elapsed = (today - start).days
    days_total = template["duration_days"]
    time_progress = min(round((days_elapsed / days_total) * 100), 100)

    # Determine date range for transaction lookup
    start_date = start.date().isoformat()
    end_date = min(end.date(), date.today()).isoformat()

    track_type = template["track_type"]
    cat = template.get("tracked_category")

    achieved = False
    task_progress = 0
    detail = ""

    if track_type == "avoid":
        # Success if NO transactions in tracked_category during window
        count = await transactions_collection.count_documents({
            "user_id": user_id,
            "type": "expense",
            "category": cat,
            "date": {"$gte": start_date, "$lte": end_date},
        })
        spent = 0.0
        async for tx in transactions_collection.find({
            "user_id": user_id,
            "type": "expense",
            "category": cat,
            "date": {"$gte": start_date, "$lte": end_date},
        }):
            spent += float(tx.get("amount", 0))
        achieved = (count == 0) and (today >= end)
        task_progress = 100 if count == 0 else max(0, 100 - round((spent / 500) * 100))
        detail = f"₹{spent:,.0f} spent on {cat}" if spent > 0 else f"Clean! No {cat} spending."

    elif track_type == "net_save":
        income = 0.0
        expense = 0.0
        async for tx in transactions_collection.find({
            "user_id": user_id,
            "date": {"$gte": start_date, "$lte": end_date},
        }):
            amt = float(tx.get("amount", 0))
            if tx.get("type") == "income":
                income += amt
            else:
                expense += amt
        net = income - expense
        target = template["target_amount"]
        task_progress = min(round((net / target) * 100), 100) if target else 0
        achieved = net >= target and today >= end
        detail = f"Net savings: ₹{net:,.0f} / ₹{target:,.0f}"

    elif track_type == "under_budget":
        spent = 0.0
        async for tx in transactions_collection.find({
            "user_id": user_id,
            "type": "expense",
            "category": cat,
            "date": {"$gte": start_date, "$lte": end_date},
        }):
            spent += float(tx.get("amount", 0))
        target = template["target_amount"]
        task_progress = max(0, round((1 - spent / target) * 100)) if target else 0
        achieved = spent <= target and today >= end
        detail = f"Spent ₹{spent:,.0f} / limit ₹{target:,.0f}"

    elif track_type == "reduce_50pct":
        # Compare to previous period of same length
        prev_start = (start - timedelta(days=days_total)).date().isoformat()
        prev_end = start.date().isoformat()
        prev_spent = 0.0
        curr_spent = 0.0
        async for tx in transactions_collection.find({
            "user_id": user_id, "type": "expense", "category": cat,
            "date": {"$gte": prev_start, "$lt": prev_end},
        }):
            prev_spent += float(tx.get("amount", 0))
        async for tx in transactions_collection.find({
            "user_id": user_id, "type": "expense", "category": cat,
            "date": {"$gte": start_date, "$lte": end_date},
        }):
            curr_spent += float(tx.get("amount", 0))
        target_spend = prev_spent * 0.5 if prev_spent > 0 else 1
        task_progress = max(0, round((1 - curr_spent / target_spend) * 100)) if prev_spent > 0 else time_progress
        achieved = curr_spent <= target_spend and today >= end
        detail = f"Current: ₹{curr_spent:,.0f}, Target ≤ ₹{target_spend:,.0f}"

    elif track_type == "earn_category":
        earned = 0.0
        async for tx in transactions_collection.find({
            "user_id": user_id, "type": "income", "category": cat,
            "date": {"$gte": start_date, "$lte": end_date},
        }):
            earned += float(tx.get("amount", 0))
        target = template["target_amount"]
        task_progress = min(round((earned / target) * 100), 100) if target else 0
        achieved = earned >= target
        detail = f"Earned ₹{earned:,.0f} / ₹{target:,.0f}"

    is_expired = today > end and not achieved
    overall_progress = task_progress if not is_expired else 0

    return {
        "challenge_id": template["id"],
        "title": template["title"],
        "description": template["description"],
        "icon": template["icon"],
        "reward": template["reward"],
        "duration_days": template["duration_days"],
        "started_at": start.isoformat(),
        "ends_at": end.isoformat(),
        "days_elapsed": min(days_elapsed, days_total),
        "progress": overall_progress,
        "achieved": achieved,
        "expired": is_expired,
        "detail": detail,
        "status": "completed" if achieved else ("expired" if is_expired else "active"),
        "_join_id": str(challenge_doc["_id"]),
    }


@router.get("/templates")
async def list_templates(current_user=Depends(get_current_user)):
    """Return all challenge templates with join status for the current user."""
    user_id = current_user["_id"]
    joined_ids = set()
    async for uc in user_challenges_collection.find({"user_id": user_id}):
        joined_ids.add(uc["challenge_id"])

    result = []
    for t in CHALLENGE_TEMPLATES:
        result.append({**t, "joined": t["id"] in joined_ids})
    return result


@router.post("/{challenge_id}/join")
async def join_challenge(challenge_id: str, current_user=Depends(get_current_user)):
    template = _get_template(challenge_id)
    if not template:
        raise HTTPException(status_code=404, detail="Challenge not found")

    user_id = current_user["_id"]
    existing = await user_challenges_collection.find_one({
        "user_id": user_id,
        "challenge_id": challenge_id,
        "status": {"$in": ["active", "completed"]},
    })
    if existing:
        raise HTTPException(status_code=409, detail="Already joined this challenge")

    result = await user_challenges_collection.insert_one({
        "user_id": user_id,
        "challenge_id": challenge_id,
        "started_at": datetime.utcnow(),
        "status": "active",
    })
    await log_audit_action(user_id, "join_challenge", {"challenge_id": challenge_id})
    return {"message": f"Joined challenge: {template['title']}", "id": str(result.inserted_id)}


@router.get("/my")
async def my_challenges(current_user=Depends(get_current_user)):
    """Return the user's active and completed challenges with live progress."""
    user_id = current_user["_id"]
    result = []
    async for uc in user_challenges_collection.find({"user_id": user_id}):
        template = _get_template(uc["challenge_id"])
        if not template:
            continue
        progress = await _compute_progress(uc, user_id, template)
        result.append(progress)
    return result


@router.delete("/{challenge_id}/leave")
async def leave_challenge(challenge_id: str, current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    res = await user_challenges_collection.delete_one({
        "user_id": user_id,
        "challenge_id": challenge_id,
    })
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not joined to this challenge")
    return {"message": "Left challenge"}
