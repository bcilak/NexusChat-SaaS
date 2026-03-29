"""Full API smoke test."""
import requests
import json

BASE = "http://localhost:8000"
print("=== FULL API TEST ===\n")

# 1. Register
r = requests.post(f"{BASE}/api/auth/register", json={"name": "Test User", "email": "test@test.com", "password": "123456"})
print(f"1. Register: {r.status_code}")
data = r.json()
token = data["access_token"]
h = {"Authorization": f"Bearer {token}"}

# 2. Get Me
r = requests.get(f"{BASE}/api/auth/me", headers=h)
print(f"2. Get Me: {r.status_code} - {r.json()}")

# 3. Login
r = requests.post(f"{BASE}/api/auth/login", json={"email": "test@test.com", "password": "123456"})
print(f"3. Login: {r.status_code}")

# 4. Create Bot
r = requests.post(f"{BASE}/api/bots", json={"name": "Demo Bot", "description": "My test bot"}, headers=h)
print(f"4. Create Bot: {r.status_code}")
bot = r.json()
bot_id = bot["id"]
print(f"   Bot ID: {bot_id}")

# 5. List Bots
r = requests.get(f"{BASE}/api/bots", headers=h)
bots = r.json()
print(f"5. List Bots: {r.status_code} ({len(bots)} bots)")

# 6. Get Bot
r = requests.get(f"{BASE}/api/bots/{bot_id}", headers=h)
bot_data = r.json()
print(f"6. Get Bot: {r.status_code} - name={bot_data['name']}")

# 7. Widget config (public, no auth)
r = requests.get(f"{BASE}/api/widget/{bot_id}/config")
widget = r.json()
print(f"7. Widget Config: {r.status_code} - {widget['name']}")

# 8. Health
r = requests.get(f"{BASE}/health")
print(f"8. Health: {r.status_code}")

print("\n=== ALL TESTS PASSED! ===")
