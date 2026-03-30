"""Inbox Router — Omnichannel conversation management with Human Handoff."""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from db.database import get_db
from models.bot import Bot
from models.inbox import InboxConversation, InboxMessage
from models.user import User
from routers.auth import get_current_user
from routers.bot import get_user_bot
from services.whatsapp import send_whatsapp_message
from services.websocket_manager import manager

router = APIRouter(prefix="/api/bots/{bot_id}/inbox", tags=["inbox"])


# --- WebSocket ---
@router.websocket("/ws")
async def websocket_inbox_endpoint(websocket: WebSocket, bot_id: int):
    await manager.connect(bot_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(bot_id, websocket)


# --- Schemas ---
class ToggleAIRequest(BaseModel):
    is_ai_active: bool

class SendMessageRequest(BaseModel):
    content: str


# --- Conversations ---
@router.get("/conversations")
def list_conversations(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    convs = (
        db.query(InboxConversation)
        .filter(InboxConversation.bot_id == bot_id)
        .order_by(InboxConversation.last_message_at.desc())
        .all()
    )
    
    result = []
    for c in convs:
        # Get last message preview
        last_msg = (
            db.query(InboxMessage)
            .filter(InboxMessage.conversation_id == c.id)
            .order_by(InboxMessage.created_at.desc())
            .first()
        )
        
        # Get unread count (user messages after last human/ai message)
        last_outgoing = (
            db.query(InboxMessage)
            .filter(
                InboxMessage.conversation_id == c.id,
                InboxMessage.sender_type.in_(["ai", "human"])
            )
            .order_by(InboxMessage.created_at.desc())
            .first()
        )
        
        if last_outgoing:
            unread_count = (
                db.query(InboxMessage)
                .filter(
                    InboxMessage.conversation_id == c.id,
                    InboxMessage.sender_type == "user",
                    InboxMessage.created_at > last_outgoing.created_at
                )
                .count()
            )
        else:
            unread_count = (
                db.query(InboxMessage)
                .filter(
                    InboxMessage.conversation_id == c.id,
                    InboxMessage.sender_type == "user"
                )
                .count()
            )
        
        result.append({
            "id": c.id,
            "platform": c.platform,
            "contact_id": c.contact_id,
            "is_ai_active": c.is_ai_active,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else "",
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "last_message_preview": (last_msg.content[:80] + "..." if len(last_msg.content) > 80 else last_msg.content) if last_msg else "",
            "last_message_sender": last_msg.sender_type if last_msg else "",
            "unread_count": unread_count,
        })
    
    return result


# --- Messages ---
@router.get("/conversations/{conv_id}/messages")
def get_conversation_messages(
    bot_id: int,
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    conv = db.query(InboxConversation).filter(InboxConversation.id == conv_id, InboxConversation.bot_id == bot_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = db.query(InboxMessage).filter(InboxMessage.conversation_id == conv_id).order_by(InboxMessage.created_at.asc()).all()
    
    return [
        {
            "id": m.id,
            "sender_type": m.sender_type,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]


# --- AI Toggle (Human Handoff) ---
@router.post("/conversations/{conv_id}/toggle-ai")
def toggle_ai(
    bot_id: int,
    conv_id: int,
    req: ToggleAIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    conv = db.query(InboxConversation).filter(InboxConversation.id == conv_id, InboxConversation.bot_id == bot_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    conv.is_ai_active = req.is_ai_active
    db.commit()
    return {"detail": "AI status updated", "is_ai_active": conv.is_ai_active}


# --- Human Send Message ---
@router.post("/conversations/{conv_id}/send")
def human_send_message(
    bot_id: int,
    conv_id: int,
    req: SendMessageRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    conv = db.query(InboxConversation).filter(InboxConversation.id == conv_id, InboxConversation.bot_id == bot_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    msg = InboxMessage(
        conversation_id=conv_id,
        sender_type="human",
        content=req.content,
        created_at=datetime.utcnow()
    )
    conv.last_message_at = datetime.utcnow()
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Send to WhatsApp if platform is whatsapp
    if conv.platform == 'whatsapp' and bot.whatsapp_token and bot.whatsapp_phone_id:
        # Check 24-hour messaging window
        last_user_msg = (
            db.query(InboxMessage)
            .filter(
                InboxMessage.conversation_id == conv_id,
                InboxMessage.sender_type == "user"
            )
            .order_by(InboxMessage.created_at.desc())
            .first()
        )
        
        window_open = True
        if last_user_msg and last_user_msg.created_at:
            time_since = datetime.utcnow() - last_user_msg.created_at
            if time_since > timedelta(hours=24):
                window_open = False
        
        if window_open:
            send_whatsapp_message(
                conv.contact_id, req.content,
                bot.whatsapp_token, bot.whatsapp_phone_id
            )
        else:
            # 24h window expired — message saved but can't be sent as regular message
            # Frontend should be notified to use template instead
            print(f"⚠️ 24h window expired for {conv.contact_id}. Regular message not sent.")
    
    response_data = {
        "id": msg.id,
        "sender_type": msg.sender_type,
        "content": msg.content,
        "created_at": msg.created_at.isoformat()
    }
    
    background_tasks.add_task(manager.broadcast_to_bot, bot_id, {
        "event": "new_message",
        "conversation_id": conv_id,
        "message": response_data
    })
    
    return response_data
