"""WhatsApp Webhook Router."""
import os
from fastapi import APIRouter, Depends, Request, Response, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime

from db.database import get_db
from models.bot import Bot
from models.inbox import InboxConversation, InboxMessage
from services.whatsapp import send_whatsapp_message
from services.chat import rag_chat
from services.websocket_manager import manager

router = APIRouter(prefix="/api/webhooks/whatsapp", tags=["whatsapp"])

META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", 'my-secret-verify-token')
DEFAULT_BOT_ID = 1  # Standard multi-tenant platforms route based on phone number id, assuming bot 1 for demo purposes.

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
            # Fallback to general META_VERIFY_TOKEN if set
            elif token == META_VERIFY_TOKEN:
                return Response(content=challenge, media_type="text/plain")
    return Response(content="Forbidden", status_code=403)


@router.post("")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Handle incoming WhatsApp messages."""
    body = await request.json()
    
    try:
        # Check if it's a WhatsApp message
        if body.get("object") == "whatsapp_business_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    # Ensure it's a message, not a status update
                    if "messages" in value:
                        for msg in value["messages"]:
                            if msg.get("type") == "text":
                                from_number = msg["from"]
                                text = msg["text"]["body"]
                                phone_number_id = value.get("metadata", {}).get("phone_number_id")
                                
                                # Process the incoming text message
                                process_whatsapp_message(from_number, text, phone_number_id, db, background_tasks)
                                
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook processing error: {e}")
        # Always return 200 to Meta so they don't retry endlessly
        return {"status": "error"}

def process_whatsapp_message(phone_number: str, text: str, phone_number_id: str, db: Session, background_tasks: BackgroundTasks):
    # Lookup Bot to route to.
    if not phone_number_id:
        return
        
    bot = db.query(Bot).filter(Bot.whatsapp_phone_id == phone_number_id).first()
    if not bot:
        # Fallback to default if not found (optional, depending on business rules)
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
        conv = InboxConversation(
            bot_id=bot.id,
            platform="whatsapp",
            contact_id=phone_number,
            is_ai_active=True
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
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
    
    if conv.is_ai_active:
        # RAG Logic
        session_id = f"wa_{phone_number}"
        rag_response = rag_chat(bot, text, session_id, db)
        answer = rag_response.get("answer", "Üzgünüm, yanıt veremiyorum.")
        
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
        
        # Transmit back to WhatsApp using specific bot credentials
        send_whatsapp_message(phone_number, answer, bot.whatsapp_token, bot.whatsapp_phone_id)
