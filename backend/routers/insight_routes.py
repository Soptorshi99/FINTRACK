from datetime import date, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from database import (
    accounts_collection,
    investments_collection,
    loans_collection,
    net_worth_snapshots_collection,
    transactions_collection,
)
from dependencies import get_current_user
from model.voice_expense_model import VoiceExpenseRequest

router = APIRouter(tags=["Financial Insights"])


def money(value):
    return round(float(value or 0), 2)


async def calculate_net_worth(user_id):
    account_assets = []
    cash_total = 0.0
    bank_total = 0.0
    other_total = 0.0
    async for account in accounts_collection.find({"user_id": user_id}):
        income = 0.0
        expenses = 0.0
        async for transaction in transactions_collection.find({"user_id": user_id, "account_id": account["_id"]}):
            amount = money(transaction.get("amount"))
            if transaction.get("type") == "income":
                income += amount
            else:
                expenses += amount
        balance = money(account.get("opening_balance")) + income - expenses
        account_assets.append({"name": account["name"], "amount": balance, "account_type": account["account_type"]})
        if account["account_type"] == "Cash":
            cash_total += balance
        elif account["account_type"] == "Bank":
            bank_total += balance
        else:
            other_total += balance

    investment_total = 0.0
    async for investment in investments_collection.find({"user_id": user_id}):
        investment_total += money(investment.get("current_value"))

    loan_total = 0.0
    async for loan in loans_collection.find({"user_id": user_id}):
        loan_total += money(loan.get("remaining_amount"))

    total_assets = cash_total + bank_total + other_total + investment_total
    return {
        "assets": {
            "cash": money(cash_total),
            "bank": money(bank_total),
            "other_accounts": money(other_total),
            "investments": money(investment_total),
            "total": money(total_assets),
        },
        "liabilities": {"loans": money(loan_total), "total": money(loan_total)},
        "net_worth": money(total_assets - loan_total),
        "account_assets": account_assets,
    }


@router.get("/net-worth")
async def get_net_worth(user=Depends(get_current_user)):
    summary = await calculate_net_worth(user["_id"])
    snapshot_date = date.today().isoformat()
    await net_worth_snapshots_collection.update_one(
        {"user_id": user["_id"], "date": snapshot_date},
        {"$set": {
            "net_worth": summary["net_worth"],
            "assets": summary["assets"]["total"],
            "liabilities": summary["liabilities"]["total"],
        }},
        upsert=True,
    )
    history = []
    async for snapshot in net_worth_snapshots_collection.find({"user_id": user["_id"]}).sort("date", 1):
        history.append({
            "date": snapshot["date"],
            "net_worth": snapshot.get("net_worth", 0),
            "assets": snapshot.get("assets", 0),
            "liabilities": snapshot.get("liabilities", 0),
        })
    return {**summary, "history": history}


@router.get("/forecast")
async def get_forecast(user=Depends(get_current_user)):
    today = date.today().replace(day=1)
    monthly = []
    for offset in range(1, 7):
        month = today.month - offset
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        prefix = f"{year}-{month:02d}"
        total = 0.0
        async for transaction in transactions_collection.find({
            "user_id": user["_id"],
            "type": "expense",
            "date": {"$regex": f"^{prefix}"},
        }):
            total += money(transaction.get("amount"))
        monthly.append({"month": prefix, "expense": money(total)})

    values = [item["expense"] for item in monthly if item["expense"] > 0]
    expected = sum(values) / len(values) if values else 0
    if len(values) >= 3:
        mean = expected or 1
        deviation = (sum((value - mean) ** 2 for value in values) / len(values)) ** 0.5
        consistency = max(0, 1 - deviation / mean)
        confidence = min(95, round(70 + consistency * 25))
    else:
        confidence = 45 if values else 0
    next_month = today.month + 1
    next_year = today.year
    if next_month == 13:
        next_month = 1
        next_year += 1
    return {
        "expected_month": f"{next_year}-{next_month:02d}",
        "expected_expense": money(expected),
        "confidence": confidence,
        "history": list(reversed(monthly)),
    }


def parse_voice_expense(transcript):
    import re

    amount_match = re.search(
        r"(?:₹|rs\.?|inr\s*)\s*([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr)\b",
        transcript.lower(),
    )
    if not amount_match:
        raise HTTPException(status_code=422, detail="Could not find an amount in the voice entry")
    amount = float((amount_match.group(1) or amount_match.group(2)).replace(",", ""))
    text = re.sub(r"(?:i\s+)?(?:spent|paid)\s+", "", transcript, flags=re.IGNORECASE)
    text = re.sub(
        r"(?:₹|rs\.?|inr\s*)\s*[\d,]+(?:\.\d+)?|\b[\d,]+(?:\.\d+)?\s*(?:rupees?|rs\.?|inr)\b",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+(?:on|for)\s+", " ", text, flags=re.IGNORECASE).strip(" .")
    description = text or "Voice expense"
    category = "Food" if any(word in description.lower() for word in ["lunch", "dinner", "breakfast", "food", "restaurant", "meal"]) else "Other"
    return amount, category, description


@router.post("/voice-expenses")
async def create_voice_expense(request: VoiceExpenseRequest, user=Depends(get_current_user)):
    amount, category, description = parse_voice_expense(request.transcript)
    account_id = None
    if request.account_id:
        if not ObjectId.is_valid(request.account_id) or not await accounts_collection.find_one({"_id": ObjectId(request.account_id), "user_id": user["_id"]}):
            raise HTTPException(status_code=404, detail="Account not found")
        account_id = ObjectId(request.account_id)
    transaction = {
        "user_id": user["_id"],
        "type": "expense",
        "category": category,
        "amount": amount,
        "description": description,
        "date": date.today().isoformat(),
        "created_at": datetime.utcnow(),
    }
    if account_id:
        transaction["account_id"] = account_id
    result = await transactions_collection.insert_one(transaction)
    return {
        "message": "Voice expense added",
        "transaction_id": str(result.inserted_id),
        "amount": amount,
        "category": category,
        "description": description,
    }


@router.post("/receipts/scan")
async def scan_receipt(request: Request, user=Depends(get_current_user)):
    payload = await request.json()
    content_type = payload.get("content_type", "")
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image receipt")

    import base64
    from io import BytesIO
    from PIL import Image

    image_data = payload.get("data", "")
    if not image_data:
        raise HTTPException(status_code=400, detail="Missing receipt image data")

    try:
        base64_str = image_data.split(",", 1)[-1]
        decoded_image = base64.b64decode(base64_str)
    except Exception as err:
        raise HTTPException(status_code=400, detail="Invalid image base64 encoding") from err

    try:
        image = Image.open(BytesIO(decoded_image))
    except Exception as err:
        raise HTTPException(status_code=400, detail="Invalid image file or format") from err

    try:
        import pytesseract
        text = pytesseract.image_to_string(image)
    except Exception as error:
        raise HTTPException(status_code=503, detail="OCR is unavailable. Install Tesseract OCR and pytesseract on the backend.") from error

    import re

    amount_match = re.search(
        r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr)\b",
        text,
        flags=re.IGNORECASE,
    )
    date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b", text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    merchant = lines[0][:100] if lines else "Receipt purchase"
    amount = float((amount_match.group(1) or amount_match.group(2)).replace(",", "")) if amount_match else None
    parsed_date = date.today().isoformat()
    if date_match:
        raw = date_match.group(1).replace("/", "-")
        parts = raw.split("-")
        if len(parts[0]) == 4:
            parsed_date = raw
        else:
            year = parts[2] if len(parts[2]) == 4 else f"20{parts[2]}"
            parsed_date = f"{year}-{int(parts[1]):02d}-{int(parts[0]):02d}"
    return {
        "merchant": merchant,
        "amount": amount,
        "date": parsed_date,
        "category": "Food",
        "raw_text": text[:2000],
    }
