from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth_routes import router
from routers.transaction_routes import router as transaction_router
from routers import budget_routes, goal_routes, ai_routes
app = FastAPI(
    title="Finance Platform API"
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
    budget_routes.router
)
app.include_router(
    goal_routes.router
)
app.include_router(
    ai_routes.router
)