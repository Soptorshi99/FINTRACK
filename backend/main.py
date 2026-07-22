from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from bson.errors import InvalidId
from routers.auth_routes import router
from routers.transaction_routes import router as transaction_router
from routers import (
    ai_routes,
    bill_reminder_routes,
    budget_routes,
    goal_routes,
    recurring_transaction_routes,
    investment_routes,
    loan_routes,
    account_routes,
    insight_routes,
    challenge_routes,
    family_routes,
)

app = FastAPI(
    title="Finance Platform API"
)

@app.exception_handler(InvalidId)
async def invalid_id_exception_handler(request: Request, exc: InvalidId):
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid hexadecimal representation of an ObjectId"}
    )

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'"
    )
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=()"
    )
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    router,
    prefix="/auth",
    tags=["Authentication"]
)
app.include_router(
    transaction_router,
    tags=["Transactions"]
)
app.include_router(
    budget_routes.router
)
app.include_router(
    goal_routes.router
)
app.include_router(
    ai_routes.router
)
app.include_router(
    recurring_transaction_routes.router
)
app.include_router(
    bill_reminder_routes.router
)
app.include_router(
    investment_routes.router
)
app.include_router(
    loan_routes.router
)
app.include_router(
    account_routes.router
)
app.include_router(
    insight_routes.router
)
app.include_router(
    challenge_routes.router
)
app.include_router(
    family_routes.router
)
