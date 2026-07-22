from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId

from database import budgets_collection, transactions_collection
from dependencies import get_current_user, log_audit_action
from model.budget_model import BudgetCreate

router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"]
)

@router.post("")
async def create_budget(
    budget: BudgetCreate,
    user=Depends(get_current_user)
):

    data = {
        "user_id": user["_id"],
        "category": budget.category,
        "amount": budget.amount,
        "month": budget.month,
        "created_at": datetime.utcnow()
    }

    result = await budgets_collection.update_one(
        {
            "user_id": user["_id"],
            "category": budget.category,
            "month": budget.month
        },
        {
            "$set": data
        },
        upsert=True
    )

    budget_id = (
        result.upserted_id
        if result.upserted_id
        else (
            await budgets_collection.find_one(
                {
                    "user_id": user["_id"],
                    "category": budget.category,
                    "month": budget.month
                }
            )
        )["_id"]
    )

    await log_audit_action(user["_id"], "save_budget", {"category": budget.category, "amount": budget.amount, "month": budget.month})

    return {
        "message": "Budget saved",
        "id": str(budget_id)
    }


@router.get("")
async def get_budgets(
    user=Depends(get_current_user)
):

    budgets = []

    async for budget in budgets_collection.find(
        {
            "user_id":
            user["_id"]
        }
    ):

        spent = 0

        async for transaction in transactions_collection.find(
            {
                "user_id": user["_id"],
                "type": "expense",
                "category": budget["category"],
                "date": {
                    "$regex": f"^{budget['month']}"
                }
            }
        ):
            spent += float(
                transaction.get("amount", 0)
            )

        amount = float(
            budget.get("amount", 0)
        )

        remaining = amount - spent

        progress = (
            min(
                round((spent / amount) * 100, 2),
                100
            )
            if amount > 0
            else 0
        )

        budget["_id"] = str(budget["_id"])
        budget["user_id"] = str(budget["user_id"])
        budget["spent"] = spent
        budget["remaining"] = remaining
        budget["progress"] = progress

        budgets.append(
            budget
        )

    return budgets


@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: str,
    user=Depends(get_current_user)
):
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid budget id"
        )

    result = await budgets_collection.delete_one(
        {
            "_id":
            ObjectId(budget_id),

            "user_id":
            user["_id"]
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    await log_audit_action(user["_id"], "delete_budget", {"budget_id": budget_id})

    return {
        "message":
        "Budget deleted"
    }
