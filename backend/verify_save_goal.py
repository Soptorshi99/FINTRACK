import asyncio
import httpx
from bson import ObjectId

async def test_flow():
    async with httpx.AsyncClient() as client:
        # 1. Register a test user
        register_url = "http://localhost:8000/auth/register"
        email = f"test_goal_{ObjectId()}@example.com"
        reg_payload = {
            "name": "Goal Tester",
            "email": email,
            "password": "password123"
        }
        r_reg = await client.post(register_url, json=reg_payload)
        print("Register Status:", r_reg.status_code)
        print("Register Response:", r_reg.json())
        assert r_reg.status_code == 200

        # 2. Login
        login_url = "http://localhost:8000/auth/login"
        login_payload = {
            "email": email,
            "password": "password123"
        }
        r_login = await client.post(login_url, json=login_payload)
        print("Login Status:", r_login.status_code)
        print("Login Response:", r_login.json())
        assert r_login.status_code == 200
        token = r_login.json()["access_token"]

        # 3. Create Goal
        goals_url = "http://localhost:8000/goals"
        headers = {"Authorization": f"Bearer {token}"}
        goal_payload = {
            "title": "💻 Test Laptop",
            "target_amount": 80000.0,
            "current_amount": 15000.0,
            "deadline": "2027-03-31"
        }
        r_goal = await client.post(goals_url, json=goal_payload, headers=headers)
        print("Create Goal Status:", r_goal.status_code)
        print("Create Goal Response:", r_goal.json())
        assert r_goal.status_code == 200

        # 4. Get Goals
        r_get = await client.get(goals_url, headers=headers)
        print("Get Goals Status:", r_get.status_code)
        print("Get Goals Response:", r_get.json())
        assert r_get.status_code == 200
        assert len(r_get.json()) == 1
        print("--- FLOW TEST SUCCESSFUL ---")

if __name__ == "__main__":
    asyncio.run(test_flow())
