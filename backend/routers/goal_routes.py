from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId

from database import goals_collection
from dependencies import get_current_user
from model.goal_model import GoalCreate, GoalUpdate

router = APIRouter(
    prefix="/goals",
    tags=["Goals"]
)

@router.post("")
async def create_goal(
    goal: GoalCreate,
    user=Depends(get_current_user)
):
    goal_data = {
        "user_id": user["_id"],
        "title": goal.title,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "deadline": goal.deadline,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d")
    }

    result = await goals_collection.insert_one(goal_data)

    return {
        "message": "Goal created successfully",
        "id": str(result.inserted_id)
    }

@router.get("")
async def get_goals(
    user=Depends(get_current_user)
):
    goals = []

    async for goal in goals_collection.find({"user_id": user["_id"]}):
        goal["_id"] = str(goal["_id"])
        goal["user_id"] = str(goal["user_id"])
        goals.append(goal)

    return goals

@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    goal: GoalUpdate,
    user=Depends(get_current_user)
):
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid goal id"
        )

    existing_goal = await goals_collection.find_one({
        "_id": ObjectId(goal_id),
        "user_id": user["_id"]
    })

    if not existing_goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found"
        )

    update_data = goal.dict(exclude_unset=True)
    if not update_data:
        return {"message": "No changes made"}

    await goals_collection.update_one(
        {"_id": ObjectId(goal_id)},
        {"$set": update_data}
    )

    return {"message": "Goal updated successfully"}

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    user=Depends(get_current_user)
):
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid goal id"
        )

    result = await goals_collection.delete_one({
        "_id": ObjectId(goal_id),
        "user_id": user["_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Goal not found"
        )

    return {"message": "Goal deleted successfully"}
