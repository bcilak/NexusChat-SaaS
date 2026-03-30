"""WhatsApp Webhook Router — Full Integration with Signature Verification, Media & Templates."""
import os
import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, Request, Response, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from db.database import get_db
from models.bot import Bot
from models.inbox import InboxConversation, InboxMessage
from services.whatsapp import send_whatsapp_message, send_whatsapp_template, download_whatsapp_media, mark_message_read
from services.chat import rag_chat
from services.websocket_manager import manager

router = APIRouter(prefix="/api/webhooks/whatsapp", tags=["whatsapp"])

META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", 'my-secret-verify-token')
META_APP_SECRET = os.getenv("META_APP_SECRET", "")
DEFAULT_BOT_ID = 1


# --- Signature Verification ---
def verify_webhook_signature(request_body: bytes, signature_header: str) -> bool:
    """Verify that the webhook request actually came from Meta using X-Hub-Signature-256."""
    if not META_APP_SECRET:
        # If no app secret configured, skip verification (dev mode)
        return True
    
    if not signature_header:
        return False
    
    # Header format: "sha256=<hex_digest>"
    if not signature_header.startswith("sha256="):
        return False
    
    expected_signature = signature_header[7:]  # Remove "sha256=" prefix
    
    computed_signature = hmac.new(
        META_APP_SECRET.encode("utf-8"),
        request_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, expected_signature)


# --- Webhook Verification (GET) ---
@router.get("")
def verify_webhook(request: Request, db: Session = Depends(get_db)):
    """Meta Webhook Verification Endpoint."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe":
            # Check if any bot uses this verify token
            bot = db.query(Bot).filter(Bot.whatsapp_verify_token == token).first()
            if bot:
                return Response(content=challenge, media_type="text/plain")
            # Fallback to general META_VERIFY_TOKEN
            elif token == META_VERIFY_TOKEN:
                return Response(content=challenge, media_type="text/plain")
    return Response(content="Forbidden", status_code=403)


# --- Webhook Receiver (POST) ---
@router.post("")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Handle incoming WhatsApp messages with signature verification."""
    raw_body = await request.body()
    
    # Signature Verification
    signature = request.headers.get("X-Hub-Signature-256", "")
    if META_APP_SECRET and not verify_webhook_signature(raw_body, signature):
        print("⚠️ Webhook signature verification failed!")
        return Response(content="Invalid signature", status_code=403)
    
    body = json.loads(raw_body)
    
    try:
        if body.get("object") == "whatsapp_business_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    phone_number_id = value.get("metadata", {}).get("phone_number_id")
                    
                    # --- Handle Status Updates (read receipts, delivery) ---
                    if "statuses" in value:
                        for status in value["statuses"]:
                            process_status_update(status, phone_number_id, db, background_tasks)
                    
                    # --- Handle Incoming Messages ---
                    if "messages" in value:
                        for msg in value["messages"]:
                            from_number = msg["from"]
                            msg_type = msg.get("type", "text")
                            
                            if msg_type == "text":
                                text = msg["text"]["body"]
                            elif msg_type == "image":
                                media_id = msg["image"]["id"]
                                caption = msg["image"].get("caption", "")
                                text = f"[📷 Resim] {caption}".strip() if caption else "[📷 Resim gönderildi]"
                                # Download media in background for future use
                                background_tasks.add_task(handle_media_message, media_id, msg_type, phone_number_id, db)
                            elif msg_type == "video":
                                caption = msg["video"].get("caption", "")
                                text = f"[🎥 Video] {caption}".strip() if caption else "[🎥 Video gönderildi]"
                            elif msg_type == "audio":
                                text = "[🎵 Sesli mesaj gönderildi]"
                            elif msg_type == "document":
                                filename = msg["document"].get("filename", "belge")
                                text = f"[📄 Belge: {filename}]"
                            elif msg_type == "location":
                                lat = msg["location"].get("latitude", "")
                                lng = msg["location"].get("longitude", "")
                                text = f"[📍 Konum: {lat}, {lng}]"
                            elif msg_type == "contacts":
                                text = "[👤 Kişi kartı gönderildi]"
                            elif msg_type == "sticker":
                                text = "[🏷️ Çıkartma gönderildi]"
                            elif msg_type == "reaction":
                                emoji = msg["reaction"].get("emoji", "")
                                text = f"[Tepki: {emoji}]"
                            elif msg_type == "interactive":
                                # Button replies or list replies
                                interactive = msg.get("interactive", {})
                                if interactive.get("type") == "button_reply":
                                    text = interactive["button_reply"].get("title", "[Buton yanıtı]")
                                elif interactive.get("type") == "list_reply":
                                    text = interactive["list_reply"].get("title", "[Liste yanıtı]")
                                else:
                                    text = "[Etkileşimli yanıt]"
                            else:
                                text = f"[Desteklenmeyen mesaj tipi: {msg_type}]"
                            
                            process_whatsapp_message(
                                from_number, text, phone_number_id, 
                                db, background_tasks, msg_type,
                                msg_id=msg.get("id")
                            )
                            
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook processing error: {e}")
        import traceback
        traceback.print_exc()
        # Always return 200 to Meta so they don't retry endlessly
        return {"status": "error"}


def process_whatsapp_message(
    phone_number: str, text: str, phone_number_id: str, 
    db: Session, background_tasks: BackgroundTasks,
    msg_type: str = "text", msg_id: str = None
):
    """Process an incoming WhatsApp message: save, RAG respond, and relay back."""
    if not phone_number_id:
        return
        
    bot = db.query(Bot).filter(Bot.whatsapp_phone_id == phone_number_id).first()
    if not bot:
        bot = db.query(Bot).filter(Bot.id == DEFAULT_BOT_ID).first()
        if not bot:
            return
        
    # Get or Create Conversation
    conv = db.query(InboxConversation).filter(
        InboxConversation.bot_id == bot.id, 
        InboxConversation.platform == "whatsapp", 
        InboxConversation.contact_id == phone_number
    ).first()
    
    if not conv:
        is_new_conversation = True
        conv = InboxConversation(
            bot_id=bot.id,
            platform="whatsapp",
            contact_id=phone_number,
            is_ai_active=True
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
        # Send auto-welcome message for first-time contacts
        if bot.whatsapp_welcome_message and bot.whatsapp_token and bot.whatsapp_phone_id:
            welcome_msg = InboxMessage(
                conversation_id=conv.id,
                sender_type="ai",
                content=bot.whatsapp_welcome_message,
                created_at=datetime.utcnow()
            )
            db.add(welcome_msg)
            db.commit()
            db.refresh(welcome_msg)
            
            background_tasks.add_task(manager.broadcast_to_bot, bot.id, {
                "event": "new_message",
                "conversation_id": conv.id,
                "message": {
                    "id": welcome_msg.id,
                    "sender_type": welcome_msg.sender_type,
                    "content": welcome_msg.content,
                    "created_at": welcome_msg.created_at.isoformat()
                }
            })
            
            send_whatsapp_message(phone_number, bot.whatsapp_welcome_message, bot.whatsapp_token, bot.whatsapp_phone_id)
        
    # Save User message
    user_msg = InboxMessage(
        conversation_id=conv.id,
        sender_type="user",
        content=text,
        created_at=datetime.utcnow()
    )
    conv.last_message_at = datetime.utcnow()
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)
    
    # Mark as read (send read receipt to WhatsApp)
    if msg_id and bot.whatsapp_token and bot.whatsapp_phone_id:
        background_tasks.add_task(
            mark_message_read, msg_id, bot.whatsapp_token, bot.whatsapp_phone_id
        )
    
    # Broadcast to WebSocket
    background_tasks.add_task(manager.broadcast_to_bot, bot.id, {
        "event": "new_message",
        "conversation_id": conv.id,
        "message": {
            "id": user_msg.id,
            "sender_type": user_msg.sender_type,
            "content": user_msg.content,
            "created_at": user_msg.created_at.isoformat()
        }
    })
    
    # Only process AI response for text-type messages when AI is active
    if conv.is_ai_active and msg_type == "text":
        session_id = f"wa_{phone_number}"
        rag_response = rag_chat(bot, text, session_id, db)
        answer = rag_response.get("answer", "Üzgünüm, yanıt veremiyorum.")
        
        # Check 24-hour window: if the conversation's last user message is older than 24h,
        # we need to use a template instead of a regular message.
        # Since we JUST received a message, the 24h window is open — send regular.
        
        # Save AI Answer
        ai_msg = InboxMessage(
            conversation_id=conv.id,
            sender_type="ai",
            content=answer,
            created_at=datetime.utcnow()
        )
        conv.last_message_at = datetime.utcnow()
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)
        
        background_tasks.add_task(manager.broadcast_to_bot, bot.id, {
            "event": "new_message",
            "conversation_id": conv.id,
            "message": {
                "id": ai_msg.id,
                "sender_type": ai_msg.sender_type,
                "content": ai_msg.content,
                "created_at": ai_msg.created_at.isoformat()
            }
        })
        
        # Send back to WhatsApp
        send_whatsapp_message(phone_number, answer, bot.whatsapp_token, bot.whatsapp_phone_id)
    
    elif conv.is_ai_active and msg_type != "text":
        # Non-text message received while AI is active — send a helpful response
        fallback_msg = "Bu tür mesajları henüz işleyemiyorum. Lütfen metin olarak yazın veya daha sonra tekrar deneyin."
        
        ai_msg = InboxMessage(
            conversation_id=conv.id,
            sender_type="ai",
            content=fallback_msg,
            created_at=datetime.utcnow()
        )
        conv.last_message_at = datetime.utcnow()
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)
        
        background_tasks.add_task(manager.broadcast_to_bot, bot.id, {
            "event": "new_message",
            "conversation_id": conv.id,
            "message": {
                "id": ai_msg.id,
                "sender_type": ai_msg.sender_type,
                "content": ai_msg.content,
                "created_at": ai_msg.created_at.isoformat()
            }
        })
        
        send_whatsapp_message(phone_number, fallback_msg, bot.whatsapp_token, bot.whatsapp_phone_id)


def process_status_update(status: dict, phone_number_id: str, db: Session, background_tasks: BackgroundTasks):
    """Process delivery and read status updates from WhatsApp."""
    status_type = status.get("status")  # "sent", "delivered", "read", "failed"
    recipient_id = status.get("recipient_id")
    
    if not phone_number_id or not recipient_id:
        return
    
    bot = db.query(Bot).filter(Bot.whatsapp_phone_id == phone_number_id).first()
    if not bot:
        return
    
    conv = db.query(InboxConversation).filter(
        InboxConversation.bot_id == bot.id,
        InboxConversation.platform == "whatsapp",
        InboxConversation.contact_id == recipient_id,
    ).first()
    
    if conv:
        # Broadcast status update via WebSocket
        background_tasks.add_task(manager.broadcast_to_bot, bot.id, {
            "event": "message_status",
            "conversation_id": conv.id,
            "status": status_type,
            "recipient_id": recipient_id,
            "timestamp": status.get("timestamp", ""),
        })


async def handle_media_message(media_id: str, media_type: str, phone_number_id: str, db: Session):
    """Download and store media from WhatsApp (for potential future processing)."""
    bot = db.query(Bot).filter(Bot.whatsapp_phone_id == phone_number_id).first()
    if not bot or not bot.whatsapp_token:
        return
    
    try:
        media_data = download_whatsapp_media(media_id, bot.whatsapp_token)
        if media_data:
            # For now, just log that we received media. 
            # Future: store in uploads/ and potentially process with OCR or vision models
            print(f"📥 Received {media_type} media (id: {media_id}), size: {len(media_data)} bytes")
    except Exception as e:
        print(f"Failed to download media {media_id}: {e}")


# --- Template Message API ---
class TemplateRequest(BaseModel):
    phone_number: str
    template_name: str
    language_code: str = "tr"
    components: Optional[list] = None


@router.post("/send-template/{bot_id}")
def send_template_message(
    bot_id: int,
    req: TemplateRequest,
    db: Session = Depends(get_db),
):
    """Send a WhatsApp template message (for re-engaging after 24h window)."""
    from routers.auth import get_current_user
    # Note: Auth would need to be added here in production
    
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")
    
    if not bot.whatsapp_token or not bot.whatsapp_phone_id:
        raise HTTPException(status_code=400, detail="WhatsApp bilgileri eksik")
    
    success = send_whatsapp_template(
        to_phone=req.phone_number,
        template_name=req.template_name,
        language_code=req.language_code,
        components=req.components,
        token=bot.whatsapp_token,
        phone_id=bot.whatsapp_phone_id,
    )
    
    if success:
        return {"detail": "Template mesajı gönderildi"}
    else:
        raise HTTPException(status_code=500, detail="Template mesajı gönderilemedi")
