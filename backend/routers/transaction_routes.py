from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException
from database import accounts_collection, transactions_collection
from dependencies import get_current_user, log_audit_action
from models import (
    TransactionCreate,
    TransactionUpdate
)
router = APIRouter()


async def resolve_account(account_id, user_id):
    if not account_id:
        return None
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account id")
    account = await accounts_collection.find_one({"_id": ObjectId(account_id), "user_id": user_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account["_id"]


def serialize_transaction(transaction):
    for key, value in transaction.items():
        if isinstance(value, ObjectId):
            transaction[key] = str(value)
    return transaction


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

    account_id = await resolve_account(transaction.account_id, current_user["_id"])
    if account_id:
        transaction_data["account_id"] = account_id

    result = await transactions_collection.insert_one(
        transaction_data
    )

    await log_audit_action(current_user["_id"], "add_transaction", {"transaction_id": str(result.inserted_id), "amount": transaction.amount, "type": transaction.type})

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

        serialize_transaction(transaction)

        transactions.append(
            transaction
        )

    return transactions


@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid transaction id"
        )

    # Filter by both _id AND user_id in one query so unauthorized callers
    # receive 404 (not 403), preventing transaction ID enumeration.
    transaction = await transactions_collection.find_one(
        {
            "_id": ObjectId(transaction_id),
            "user_id": current_user["_id"]
        }
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    serialize_transaction(transaction)

    return transaction


@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    transaction: TransactionUpdate,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid transaction id"
        )

    existing_transaction = await transactions_collection.find_one(
        {
            "_id": ObjectId(transaction_id),
            "user_id": current_user["_id"]
        }
    )

    if not existing_transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    update_data = transaction.dict(
        exclude_unset=True
    )

    if "date" in update_data:
        update_data["date"] = (
            update_data["date"].isoformat()
        )

    if "account_id" in update_data:
        update_data["account_id"] = await resolve_account(
            update_data["account_id"],
            current_user["_id"]
        )

    await transactions_collection.update_one(
        {
            "_id": ObjectId(transaction_id),
            "user_id": current_user["_id"]
        },
        {
            "$set": update_data
        }
    )

    await log_audit_action(current_user["_id"], "update_transaction", {"transaction_id": transaction_id})

    return {
        "message": "Transaction updated successfully"
    }


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user)
):

    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid transaction id"
        )

    transaction = await transactions_collection.find_one(
        {
            "_id": ObjectId(transaction_id),
            "user_id": current_user["_id"]
        }
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    await transactions_collection.delete_one(
        {
            "_id": ObjectId(transaction_id),
            "user_id": current_user["_id"]
        }
    )

    await log_audit_action(current_user["_id"], "delete_transaction", {"transaction_id": transaction_id})

    return {
        "message": "Transaction deleted successfully"
    }
