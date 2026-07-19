from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException
from models import TransactionCreate
from database import transactions_collection
from dependencies import get_current_user
from models import (
    TransactionCreate,
    TransactionUpdate
)
router = APIRouter()
@router.post("/transactions")
async def add_transaction(
    transaction: TransactionCreate,
    current_user=Depends(get_current_user)
):

    transaction_data = {
        "user_id": ObjectId(current_user["_id"]),

        "type": transaction.type,

        "category": transaction.category,

        "amount": transaction.amount,

        "description": transaction.description,

        "date": transaction.date.isoformat(),

        "created_at": datetime.utcnow()
    }

    result = await transactions_collection.insert_one(
        transaction_data
    )

    return {
        "message": "Transaction added successfully",

        "transaction_id": str(result.inserted_id)
    }
@router.get("/transactions")
async def get_transactions(
    current_user=Depends(get_current_user)
):

    transactions = []

    cursor = transactions_collection.find(
        {
            "user_id": current_user["_id"]
        }
    )

    async for transaction in cursor:

        transaction["_id"] = str(
            transaction["_id"]
        )

        transaction["user_id"] = str(
            transaction["user_id"]
        )

        transactions.append(
            transaction
        )

    return transactions
@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user)
):

    transaction = await transactions_collection.find_one(
        {
            "_id": ObjectId(transaction_id)
        }
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if transaction["user_id"] != current_user["_id"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized"
        )

    transaction["_id"] = str(transaction["_id"])
    transaction["user_id"] = str(transaction["user_id"])

    return transaction
@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    transaction: TransactionUpdate,
    current_user=Depends(get_current_user)
):

    existing_transaction = await transactions_collection.find_one(
        {
            "_id": ObjectId(transaction_id)
        }
    )

    if not existing_transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if existing_transaction["user_id"] != current_user["_id"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized"
        )

    update_data = transaction.dict(
        exclude_unset=True
    )

    if "date" in update_data:
        update_data["date"] = (
            update_data["date"].isoformat()
        )

    await transactions_collection.update_one(
        {
            "_id": ObjectId(transaction_id)
        },
        {
            "$set": update_data
        }
    )

    return {
        "message": "Transaction updated successfully"
    }
@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user)
):

    transaction = await transactions_collection.find_one(
        {
            "_id": ObjectId(transaction_id)
        }
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if transaction["user_id"] != current_user["_id"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized"
        )

    await transactions_collection.delete_one(
        {
            "_id": ObjectId(transaction_id)
        }
    )

    return {
        "message": "Transaction deleted successfully"
    }