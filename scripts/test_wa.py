import os
import httpx
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.bot import Bot

# Load env
load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
Session = sessionmaker(bind=engine)
db = Session()

def test_wa():
    bot = db.query(Bot).first()
    if not bot or not bot.whatsapp_token:
        print("Bot veya WhatsApp Token bulunamadı!")
        return

    print(f"Token (ilk 15): {bot.whatsapp_token[:15]}...")
    print(f"Phone ID: {bot.whatsapp_phone_id}")
    
    url = f"https://graph.facebook.com/v21.0/{bot.whatsapp_phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {bot.whatsapp_token}",
        "Content-Type": "application/json"
    }
    
    # Kendi numaranızı hedef olarak koyduk
    payload = {
        "messaging_product": "whatsapp",
        "to": "905350537426",  # Ekran görüntüsündeki numaranız
        "type": "text",
        "text": {"body": "Bu bir API Test mesajıdır."}
    }
    
    print("Meta API'ye istek gönderiliyor...")
    resp = httpx.post(url, headers=headers, json=payload)
    
    print("\n--- SONUÇ ---")
    print(f"HTTP Status: {resp.status_code}")
    print(f"Gelen Yanıt (Error Details): {resp.text}")

if __name__ == "__main__":
    test_wa()
