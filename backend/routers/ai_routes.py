import os
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from database import transactions_collection, budgets_collection, goals_collection
from dependencies import get_current_user

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

def get_month_prefix_and_name(query_lower: str):
    # Local baseline date is 2026-07-17
    year = 2026
    month = 7
    
    months_map = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }
    
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    
    if "last month" in query_lower:
        month = 6
    elif "this month" in query_lower:
        month = 7
    else:
        for m_name, m_num in months_map.items():
            if m_name in query_lower:
                month = m_num
                break
                
    prefix = f"{year}-{month:02d}"
    name = f"{month_names[month - 1]} {year}"
    return prefix, name

@router.post("/ai/chat")
async def ai_chat(
    request: ChatRequest,
    current_user=Depends(get_current_user)
):
    query = request.message.strip()
    user_id = current_user["_id"]
    user_name = current_user.get("name", "User")

    # Fetch user transactions, budgets, goals
    transactions = []
    cursor = transactions_collection.find({"user_id": user_id})
    async for tx in cursor:
        transactions.append(tx)

    goals = []
    cursor = goals_collection.find({"user_id": user_id})
    async for goal in cursor:
        goals.append(goal)

    budgets = []
    cursor = budgets_collection.find({"user_id": user_id})
    async for b in cursor:
        budgets.append(b)

    # Compile financial summary for prompt context
    profile_summary = "Current Date: 2026-07-17\n\nUSER FINANCIAL DATA SUMMARY:\n\nActive Budgets:\n"
    if budgets:
        for b in budgets:
            category = b.get("category", "")
            month = b.get("month", "")
            amount = float(b.get("amount") or 0.0)
            
            # calculate spent for this category and month using local transactions
            spent = 0.0
            for t in transactions:
                if (t.get("type") == "expense" and 
                    t.get("category", "").lower() == category.lower() and 
                    t.get("date", "").startswith(month)):
                    spent += float(t.get("amount") or 0.0)
            
            profile_summary += f"- Category: {category}, Limit: ₹{amount:,.2f}, Spent: ₹{spent:,.2f}\n"
    else:
        profile_summary += "- No active budgets.\n"

    profile_summary += "\nActive Savings Goals:\n"
    if goals:
        for g in goals:
            curr = float(g.get("current_amount") or 0.0)
            targ = float(g.get("target_amount") or 1.0)
            pct = (curr / targ) * 100 if targ > 0 else 0
            profile_summary += f"- {g.get('title')}: Target ₹{targ:,.2f}, Current Saved: ₹{curr:,.2f} ({pct:.1f}% saved), Deadline: {g.get('deadline', 'N/A')}\n"
    else:
        profile_summary += "- No active savings goals.\n"

    # Aggregating Transactions
    july_income = 0.0
    july_expense = 0.0
    july_by_cat = {}
    june_income = 0.0
    june_expense = 0.0
    june_by_cat = {}

    for t in transactions:
        date_str = t.get("date", "")
        amount = t.get("amount", 0.0)
        category = t.get("category", "Other")
        tx_type = t.get("type", "")
        
        if date_str.startswith("2026-07"):
            if tx_type == "income":
                july_income += amount
            elif tx_type == "expense":
                july_expense += amount
                july_by_cat[category] = july_by_cat.get(category, 0.0) + amount
        elif date_str.startswith("2026-06"):
            if tx_type == "income":
                june_income += amount
            elif tx_type == "expense":
                june_expense += amount
                june_by_cat[category] = june_by_cat.get(category, 0.0) + amount

    profile_summary += f"\nTransactions Summary:\n"
    profile_summary += f"July 2026 (This Month):\n"
    profile_summary += f"- Total Income: ₹{july_income:,.2f}\n"
    profile_summary += f"- Total Expenses: ₹{july_expense:,.2f}\n"
    profile_summary += f"- Expenses by Category:\n"
    for cat, amt in july_by_cat.items():
        profile_summary += f"  - {cat.capitalize()}: ₹{amt:,.2f}\n"

    profile_summary += f"\nJune 2026 (Last Month):\n"
    profile_summary += f"- Total Income: ₹{june_income:,.2f}\n"
    profile_summary += f"- Total Expenses: ₹{june_expense:,.2f}\n"
    profile_summary += f"- Expenses by Category:\n"
    for cat, amt in june_by_cat.items():
        profile_summary += f"  - {cat.capitalize()}: ₹{amt:,.2f}\n"

    recent_txs = sorted(transactions, key=lambda x: x.get("date", ""), reverse=True)[:10]
    profile_summary += "\nRecent Transactions:\n"
    for t in recent_txs:
        profile_summary += f"- {t.get('date')}: {t.get('type').capitalize()} of ₹{t.get('amount'):,.2f} in {t.get('category')} ({t.get('description', '')})\n"

    system_prompt = f"""You are FinTrack AI Assistant, a helpful and premium personal finance advisor.
You are helping user {user_name} manage their personal finances.
You have access to the user's financial profile summary below.
Always reply in a professional, concise, and helpful tone.
Use the Indian Rupee symbol (₹) for money values.
Format your numbers with thousands separators (e.g. ₹4,350 or ₹1,200).
Keep responses short, clear, and relevant (typically 1-3 sentences). Do not repeat the prompt.

Here is the user's financial context:
{profile_summary}

Style guidelines for responses:
1. When asked about spending on a category for a specific month, state the amount and month directly. Example: "You spent ₹4,350 on Food in June."
2. When asked how to save more, identify the highest spending categories and propose a realistic reduction (like 15%) and tell them how much that would save them. Example: "Reducing dining expenses by 15% would increase your monthly savings by approximately ₹1,200."
3. If they ask about savings goals, tell them their progress directly.
"""

    load_dotenv(override=True)
    OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY")
    OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "https://ollama.com/api").rstrip("/")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

    # API key check
    if not OLLAMA_API_KEY and "ollama.com" in OLLAMA_API_URL:
        return {
            "reply": "Ollama Cloud API Key is missing. Please set OLLAMA_API_KEY in your backend `.env` file to enable the AI assistant."
        }

    chat_url = f"{OLLAMA_API_URL}/chat" if OLLAMA_API_URL.endswith("/api") else f"{OLLAMA_API_URL}/api/chat"
    
    headers = {"Content-Type": "application/json"}
    if OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(chat_url, json=payload, headers=headers)
            if response.status_code == 200:
                result = response.json()
                reply = result.get("message", {}).get("content", "").strip()
                if reply:
                    return {"reply": reply}
            
            # Handle other response codes
            error_msg = f"Ollama API returned status {response.status_code}"
            if response.text:
                error_msg += f": {response.text[:200]}"
            raise Exception(error_msg)
            
    except Exception as e:
        print(f"Ollama Cloud API error: {str(e)}")
        # Graceful fallback to a user-friendly error message
        return {
            "reply": "I am having trouble connecting to the Ollama Cloud service right now. Please verify your OLLAMA_API_KEY and network connection."
        }

