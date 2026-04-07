"""Widget router — public endpoints for the embeddable chat widget."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from db.database import get_db
from models.bot import Bot
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

    return {
        "bot_id": bot.id,
        "name": bot.name,
        "description": bot.description or "",
        "language": bot.language,
        "theme_color": bot.theme_color or "#000000",
        "text_color": bot.text_color or "#ffffff",
        "logo_url": bot.logo_url,
        "welcome_message": bot.welcome_message or ("How can I help you?" if bot.language == "en" else "Size nasıl yardımcı olabilirim?"),
        "example_questions": bot.example_questions,
    }


@router.post("/{bot_id}/chat")
def widget_chat(
    bot_id: int,
    req: WidgetChatRequest,
    db: Session = Depends(get_db),
):
    """Public endpoint — chat with a bot from the embedded widget (no auth required)."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    session_id = req.session_id or str(uuid.uuid4())
    result = rag_chat(bot, req.question, session_id, db, attachment_url=req.attachment_url, platform="web")
    return result


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
