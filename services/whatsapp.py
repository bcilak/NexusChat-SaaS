"""WhatsApp Cloud API Service — Send messages, templates, media download & read receipts."""
import os
import httpx
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


def _get_headers(token: str) -> dict:
    """Build authorization headers for Meta Graph API."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def send_whatsapp_message(to_phone: str, message: str, token: str, phone_id: str) -> bool:
    """Send a text message via Meta's WhatsApp Cloud API."""
    if not token or not phone_id:
        print("WhatsApp credentials missing for this bot.")
        return False
        
    url = f"{GRAPH_API_BASE}/{phone_id}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {
            "preview_url": True,
            "body": message
        }
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, headers=_get_headers(token), json=payload)
            response.raise_for_status()
            return True
    except httpx.HTTPStatusError as e:
        print(f"WhatsApp API Error: {e.response.status_code} — {e.response.text}")
        return False
    except Exception as e:
        print(f"Failed to send WhatsApp message: {e}")
        return False


def send_whatsapp_template(
    to_phone: str,
    template_name: str,
    language_code: str,
    token: str,
    phone_id: str,
    components: Optional[list] = None,
) -> bool:
    """
    Send a WhatsApp template message.
    
    Required when the 24-hour customer service window has expired.
    Templates must be pre-approved in Meta Business Manager.
    
    Example components for a template with header image and body variables:
    [
        {"type": "header", "parameters": [{"type": "image", "image": {"link": "https://..."}}]},
        {"type": "body", "parameters": [{"type": "text", "text": "Ahmet"}]}
    ]
    """
    if not token or not phone_id:
        print("WhatsApp credentials missing for template send.")
        return False
    
    url = f"{GRAPH_API_BASE}/{phone_id}/messages"
    
    template_obj = {
        "name": template_name,
        "language": {"code": language_code},
    }
    
    if components:
        template_obj["components"] = components
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": template_obj,
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, headers=_get_headers(token), json=payload)
            response.raise_for_status()
            print(f"✅ Template '{template_name}' sent to {to_phone}")
            return True
    except httpx.HTTPStatusError as e:
        print(f"WhatsApp Template API Error: {e.response.status_code} — {e.response.text}")
        return False
    except Exception as e:
        print(f"Failed to send WhatsApp template: {e}")
        return False


def mark_message_read(message_id: str, token: str, phone_id: str) -> bool:
    """
    Send a read receipt to WhatsApp so the user sees blue checkmarks.
    Called automatically when a message is received and processed.
    """
    if not token or not phone_id or not message_id:
        return False
    
    url = f"{GRAPH_API_BASE}/{phone_id}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=_get_headers(token), json=payload)
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Failed to mark message as read: {e}")
        return False


def download_whatsapp_media(media_id: str, token: str, return_mime: bool = False):
    """
    Download media from WhatsApp Cloud API.
    
    Two-step process:
    1. GET media URL from media_id
    2. Download the actual file bytes
    
    Returns raw bytes of the media file, or None on failure. If return_mime is True, returns (bytes, mime_type).
    """
    if not token or not media_id:
        return (None, None) if return_mime else None
        
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        with httpx.Client(timeout=30.0) as client:
            # Step 1: Get the media URL
            media_info_url = f"{GRAPH_API_BASE}/{media_id}"
            info_response = client.get(media_info_url, headers=headers)
            info_response.raise_for_status()
            media_json = info_response.json()
            media_url = media_json.get("url")
            mime_type = media_json.get("mime_type")

            if not media_url:
                print(f"No URL found for media_id: {media_id}")
                return (None, None) if return_mime else None

            # Step 2: Download the actual file
            file_response = client.get(media_url, headers=headers)
            file_response.raise_for_status()
            
            return (file_response.content, mime_type) if return_mime else file_response.content

    except httpx.HTTPStatusError as e:
        print(f"WhatsApp Media API Error: {e.response.status_code} — {e.response.text}")
        return (None, None) if return_mime else None
    except Exception as e:
        print(f"Failed to download WhatsApp media: {e}")
        return (None, None) if return_mime else None


def send_whatsapp_image(
    to_phone: str, image_url: str, caption: str,
    token: str, phone_id: str
) -> bool:
    """Send an image message via WhatsApp Cloud API."""
    if not token or not phone_id:
        return False
    
    url = f"{GRAPH_API_BASE}/{phone_id}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "image",
        "image": {
            "link": image_url,
            "caption": caption,
        }
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, headers=_get_headers(token), json=payload)
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Failed to send WhatsApp image: {e}")
        return False


def send_whatsapp_document(
    to_phone: str, document_url: str, filename: str, caption: str,
    token: str, phone_id: str
) -> bool:
    """Send a document message via WhatsApp Cloud API."""
    if not token or not phone_id:
        return False
    
    url = f"{GRAPH_API_BASE}/{phone_id}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "document",
        "document": {
            "link": document_url,
            "filename": filename,
            "caption": caption,
        }
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, headers=_get_headers(token), json=payload)
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Failed to send WhatsApp document: {e}")
        return False
