import os
import secrets
from datetime import datetime, timedelta
from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    Body
)
from fastapi.security import (
    HTTPBearer
)
from jose import jwt, JWTError
from bson import ObjectId

from database import users_collection, transactions_collection, budgets_collection
from models import (
    UserRegister,
    UserLogin,
    TokenRefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    RoleUpdateRequest
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token
)
from dependencies import rate_limit_auth, get_current_user, get_current_admin
from email_utils import send_verification_email, send_password_reset_email

router = APIRouter()

security = HTTPBearer()

EMAIL_VERIFICATION_REQUIRED = os.getenv("EMAIL_VERIFICATION_REQUIRED", "False").lower() in ("true", "1", "yes")

@router.post("/register", dependencies=[Depends(rate_limit_auth)])
async def register(user: UserRegister):
    existing = await users_collection.find_one(
        {"email": user.email}
    )

    if existing:
        raise HTTPException(
            400,
            "Email already exists"
        )

    hashed = hash_password(user.password)
    verification_token = secrets.token_hex(32)

    result = await users_collection.insert_one(
        {
            "name": user.name,
            "email": user.email,
            "password_hash": hashed,
            "role": "user",
            "is_verified": False,
            "verification_token": verification_token,
            "created_at": datetime.utcnow()
        }
    )

    send_verification_email(user.email, verification_token)

    return {
        "message": "User created. Verification email sent.",
        "user_id": str(result.inserted_id)
    }


@router.post("/login", dependencies=[Depends(rate_limit_auth)])
async def login(user: UserLogin):
    db_user = await users_collection.find_one(
        {"email": user.email}
    )

    if not db_user:
        raise HTTPException(
            401,
            "Invalid credentials"
        )

    if not verify_password(
        user.password,
        db_user["password_hash"]
    ):
        raise HTTPException(
            401,
            "Invalid credentials"
        )

    if EMAIL_VERIFICATION_REQUIRED and not db_user.get("is_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Email address must be verified before logging in."
        )

    access_token = create_access_token(
        {
            "sub": str(db_user["_id"]),
            "email": db_user["email"]
        }
    )
    refresh_token = create_refresh_token(
        {
            "sub": str(db_user["_id"]),
            "email": db_user["email"]
        }
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh")
async def refresh(request: TokenRefreshRequest):
    try:
        payload = verify_refresh_token(request.refresh_token)
        user_id = payload.get("sub")
        email = payload.get("email")
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token"
        )

    # Verify the user still exists in the database
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    access_token = create_access_token(
        {
            "sub": user_id,
            "email": email
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/verify-email")
async def verify_email(token: str):
    user = await users_collection.find_one({"verification_token": token})
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token"
        )

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_verified": True},
            "$unset": {"verification_token": ""}
        }
    )
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(request: PasswordResetRequest):
    user = await users_collection.find_one({"email": request.email})
    if not user:
        return {"message": "If this email is registered, a new verification link has been sent"}

    if user.get("is_verified", False):
        return {"message": "Email is already verified"}

    token = user.get("verification_token")
    if not token:
        token = secrets.token_hex(32)
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verification_token": token}}
        )

    send_verification_email(user["email"], token)
    return {"message": "Verification link has been sent"}


@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    user = await users_collection.find_one({"email": request.email})
    if not user:
        return {"message": "If this email is registered, a reset link has been sent"}

    token = secrets.token_hex(32)
    expires = datetime.utcnow() + timedelta(hours=1)

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_token": token,
                "reset_token_expires": expires
            }
        }
    )

    send_password_reset_email(user["email"], token)
    return {"message": "Password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    user = await users_collection.find_one({"reset_token": request.token})
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )

    expires = user.get("reset_token_expires")
    if expires and expires < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Reset token has expired"
        )

    hashed = hash_password(request.new_password)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": hashed},
            "$unset": {
                "reset_token": "",
                "reset_token_expires": ""
            }
        }
    )
    return {"message": "Password has been reset successfully"}


@router.get("/me")
async def me(
    current_user=Depends(get_current_user)
):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("role", "user"),
        "is_verified": current_user.get("is_verified", False)
    }


# Admin management endpoints
@router.get("/admin/users", dependencies=[Depends(get_current_admin)])
async def admin_get_users():
    users = []
    async for user in users_collection.find():
        users.append({
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "is_verified": user.get("is_verified", False)
        })
    return users


@router.put("/admin/users/{user_id}/role", dependencies=[Depends(get_current_admin)])
async def admin_update_user_role(user_id: str, request: RoleUpdateRequest):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid user id"
        )

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": request.role}}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {"message": f"User role updated to {request.role}"}


@router.get("/admin/stats", dependencies=[Depends(get_current_admin)])
async def admin_stats():
    """Platform-wide analytics for the admin dashboard."""
    total_users = await users_collection.count_documents({})
    total_transactions = await transactions_collection.count_documents({})

    total_income = 0.0
    total_expense = 0.0
    category_freq = {}
    top_spenders = {}

    async for tx in transactions_collection.find():
        amt = float(tx.get("amount", 0))
        uid = str(tx.get("user_id", ""))
        if tx.get("type") == "income":
            total_income += amt
        else:
            total_expense += amt
            cat = tx.get("category", "Other")
            category_freq[cat] = category_freq.get(cat, 0) + 1
            top_spenders[uid] = top_spenders.get(uid, 0) + amt

    # Top 5 categories
    popular_categories = sorted(category_freq.items(), key=lambda x: x[1], reverse=True)[:5]

    # Per-user summary for user table
    user_table = []
    async for user in users_collection.find():
        uid = str(user["_id"])
        tx_count = await transactions_collection.count_documents({"user_id": user["_id"]})
        total_spent = top_spenders.get(uid, 0.0)
        user_table.append({
            "id": uid,
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "is_verified": user.get("is_verified", False),
            "transaction_count": tx_count,
            "total_spent": round(total_spent, 2),
            "joined": user.get("created_at", "").isoformat() if user.get("created_at") else "",
        })

    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "popular_categories": [{"category": c, "count": n} for c, n in popular_categories],
        "users": user_table,
    }


@router.delete("/admin/users/{user_id}", dependencies=[Depends(get_current_admin)])
async def admin_delete_user(
    user_id: str,
    confirm_email: str = Body(..., embed=True),
    current_admin=Depends(get_current_admin)
):
    """
    Hard-delete a user and ALL their data.
    Requires the admin to supply the target user's exact email as confirmation.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    target = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Friction gate — email must match exactly
    if target.get("email", "").lower() != confirm_email.strip().lower():
        raise HTTPException(
            status_code=422,
            detail="Confirmation email does not match. Deletion aborted."
        )

    # Prevent admin from deleting themselves
    if str(target["_id"]) == str(current_admin["_id"]):
        raise HTTPException(status_code=403, detail="You cannot delete your own account.")

    target_oid = target["_id"]

    # Delete all user data
    from database import (
        transactions_collection, budgets_collection, goals_collection,
        recurring_transactions_collection, bill_reminders_collection,
        investments_collection, loans_collection, accounts_collection,
        net_worth_snapshots_collection, audit_logs_collection,
        user_challenges_collection
    )
    for col in [
        transactions_collection, budgets_collection, goals_collection,
        recurring_transactions_collection, bill_reminders_collection,
        investments_collection, loans_collection, accounts_collection,
        net_worth_snapshots_collection, user_challenges_collection,
    ]:
        await col.delete_many({"user_id": target_oid})

    await audit_logs_collection.delete_many({"user_id": target_oid})
    await users_collection.delete_one({"_id": target_oid})

    from dependencies import log_audit_action
    await log_audit_action(current_admin["_id"], "admin_delete_user", {
        "deleted_user_id": str(target_oid),
        "deleted_email": target.get("email"),
    })

    return {"message": f"User {target.get('email')} and all their data have been permanently deleted."}
