"""Widget router — public endpoints for the embeddable chat widget."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from db.database import get_db
from models.bot import Bot
from models.banned_ip import BannedIP
from services.chat import rag_chat

router = APIRouter(prefix="/api/widget", tags=["widget"])


class WidgetChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    attachment_url: Optional[str] = None

class WidgetTicketSubmitRequest(BaseModel):
    session_id: str
    product_name: str
    damage_summary: str
    order_number: Optional[str] = None
    image_url: Optional[str] = None


@router.get("/{bot_id}/config")
def get_widget_config(bot_id: int, db: Session = Depends(get_db)):
    """Public endpoint — returns bot display config for the widget."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    # Pasif bot: widget kendini hiç çizmesin
    if bot.is_active is not None and not bot.is_active:
        return {"bot_id": bot.id, "active": False}

    return {
        "active": True,
        "bot_id": bot.id,
        "name": bot.name,
        "description": bot.description or "",
        "language": bot.language,
        "theme_color": bot.theme_color or "#000000",
        "text_color": bot.text_color or "#ffffff",
        "logo_url": bot.logo_url,
        "welcome_message": bot.welcome_message or ("How can I help you?" if bot.language == "en" else "Size nasıl yardımcı olabilirim?"),
        "example_questions": bot.example_questions,
        # Widget appearance & behavior
        "subtitle": bot.subtitle,
        "theme_mode": bot.theme_mode or "dark",
        "show_home_screen": bool(bot.show_home_screen),
        "privacy_url": bot.privacy_url,
        "widget_position": bot.widget_position or "right",
        "auto_open_delay": bot.auto_open_delay or 0,
        "proactive_message": bot.proactive_message,
        "branding_visible": bot.branding_visible if bot.branding_visible is not None else True,
        "sound_enabled": bool(bot.sound_enabled),
        "hero_header": bool(bot.hero_header),
    }


@router.post("/{bot_id}/chat")
def widget_chat(
    bot_id: int,
    req: WidgetChatRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public endpoint — chat with a bot from the embedded widget (no auth required)."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    if bot.is_active is not None and not bot.is_active:
        raise HTTPException(status_code=403, detail="Bot pasif durumda")

    # IP adresini al
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0] if forwarded else request.client.host
    
    # Check if IP is banned
    is_banned = db.query(BannedIP).filter(BannedIP.ip_address == client_ip).first()
    if is_banned:
        return {
            "answer": "Sistem tarafından engellendiniz. Lütfen yönetici ile iletişime geçin.",
            "sources": [],
            "session_id": req.session_id or str(uuid.uuid4())
        }

    session_id = req.session_id or str(uuid.uuid4())
    try:
        result = rag_chat(bot, req.question, session_id, db, attachment_url=req.attachment_url, platform="web", client_ip=client_ip)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "answer": f"Üzgünüm, şu anda sistemde geçici bir sorun yaşanıyor. Lütfen daha sonra tekrar deneyin. (Hata: {str(e)})",
            "sources": [],
            "session_id": session_id
        }


@router.post("/{bot_id}/ticket")
def submit_ticket(
    bot_id: int,
    req: WidgetTicketSubmitRequest,
    db: Session = Depends(get_db)
):
    """Public endpoint."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadi")

    from models.ticket import Ticket
    ticket = Ticket(
        bot_id=bot.id,
        platform="web",
        contact_id=req.session_id,
        order_number=req.order_number,
        product_name=req.product_name,
        damage_summary=req.damage_summary,
        image_url=req.image_url,
        status="open"
    )
    db.add(ticket)
    db.commit()
    return {"status": "success", "ticket_id": ticket.id, "message": "Ticket basariyla olusturuldu"}


class WidgetFeedbackRequest(BaseModel):
    message_id: int
    session_id: str
    liked: bool


@router.post("/{bot_id}/feedback")
def submit_feedback(
    bot_id: int,
    req: WidgetFeedbackRequest,
    db: Session = Depends(get_db),
):
    """Public endpoint — thumbs up/down on a bot answer."""
    from models.chat_history import ChatHistory

    history = (
        db.query(ChatHistory)
        .filter(
            ChatHistory.id == req.message_id,
            ChatHistory.bot_id == bot_id,
            ChatHistory.session_id == req.session_id,
        )
        .first()
    )
    if not history:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    history.is_liked = req.liked
    db.commit()
    return {"status": "success"}
