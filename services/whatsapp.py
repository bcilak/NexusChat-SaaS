import os
import httpx
from dotenv import load_dotenv

load_dotenv()

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")


def send_whatsapp_message(to_phone: str, message: str, token: str, phone_id: str) -> bool:
    """Send a text message via Meta's WhatsApp Cloud API."""
    if not token or not phone_id:
        print("WhatsApp credentials missing for this bot.")
        return False
        
    url = f"https://graph.facebook.com/v17.0/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {
            "body": message
        }
    }
    
    try:
        with httpx.Client() as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return True
    except httpx.HTTPStatusError as e:
        print(f"WhatsApp API Error: {e.response.text}")
        return False
    except Exception as e:
        print(f"Failed to send WhatsApp message: {e}")
        return False
