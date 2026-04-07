from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.bot import Bot
from models.user import User
from routers.auth import get_current_user
from services.vectordb import VectorDBService

router = APIRouter(prefix="/api/bots", tags=["bots"])


# --- Schemas ---
class BotCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    prompt: Optional[str] = None
    model: Optional[str] = "gpt-4o-mini"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024
    language: Optional[str] = "tr"
    show_sources: Optional[bool] = True
    theme_color: Optional[str] = "#000000"
    text_color: Optional[str] = "#FFFFFF"
    logo_url: Optional[str] = None
    welcome_message: Optional[str] = "Merhaba, size nasıl yardımcı olabilirim?"
    example_questions: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_token: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    whatsapp_welcome_message: Optional[str] = None


class BotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    language: Optional[str] = None
    show_sources: Optional[bool] = None
    theme_color: Optional[str] = None
    text_color: Optional[str] = None
    logo_url: Optional[str] = None
    welcome_message: Optional[str] = None
    example_questions: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_token: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    whatsapp_welcome_message: Optional[str] = None


class BotResponse(BaseModel):
    id: int
    name: str
    description: str
    prompt: str
    model: str
    temperature: float
    max_tokens: int
    language: str
    show_sources: bool
    theme_color: str
    text_color: str
    logo_url: Optional[str]
    welcome_message: str
    example_questions: Optional[str]
    whatsapp_phone_id: Optional[str]
    whatsapp_token: Optional[str]
    whatsapp_verify_token: Optional[str]
    whatsapp_welcome_message: Optional[str]
    document_count: int = 0
    created_at: str


# --- Helpers ---
def get_user_bot(bot_id: int, user: User, db: Session) -> Bot:
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")
    return bot


def bot_to_response(bot: Bot) -> BotResponse:
    return BotResponse(
        id=bot.id,
        name=bot.name,
        description=bot.description or "",
        prompt=bot.prompt,
        model=bot.model,
        temperature=bot.temperature,
        max_tokens=bot.max_tokens,
        language=bot.language,
        show_sources=bot.show_sources,
        theme_color=bot.theme_color or "#000000",
        text_color=bot.text_color or "#FFFFFF",
        logo_url=bot.logo_url,
        welcome_message=bot.welcome_message or "Merhaba, size nasıl yardımcı olabilirim?",
        example_questions=bot.example_questions,
        whatsapp_phone_id=bot.whatsapp_phone_id,
        whatsapp_token=bot.whatsapp_token,
        whatsapp_verify_token=bot.whatsapp_verify_token,
        whatsapp_welcome_message=bot.whatsapp_welcome_message,
        document_count=len(bot.documents) if bot.documents else 0,
        created_at=bot.created_at.isoformat() if bot.created_at else "",
    )


# --- Endpoints ---
@router.post("", response_model=BotResponse)
def create_bot(
    req: BotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot_data = req.model_dump(exclude_unset=False)
    if bot_data.get("prompt") is None:
        bot_data.pop("prompt", None)

    bot = Bot(user_id=current_user.id, **bot_data)
    db.add(bot)
    db.commit()
    db.refresh(bot)
    return bot_to_response(bot)


@router.get("", response_model=list[BotResponse])
def list_bots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bots = db.query(Bot).filter(Bot.user_id == current_user.id).order_by(Bot.created_at.desc()).all()
    return [bot_to_response(b) for b in bots]


@router.get("/{bot_id}", response_model=BotResponse)
def get_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    return bot_to_response(bot)


@router.put("/{bot_id}", response_model=BotResponse)
def update_bot(
    bot_id: int,
    req: BotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bot, key, value)
    db.commit()
    db.refresh(bot)
    return bot_to_response(bot)


@router.delete("/{bot_id}")
def delete_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    # Delete vector store collection
    try:
        vectordb = VectorDBService()
        vectordb.delete_collection(str(bot.id))
    except Exception:
        pass  # Collection may not exist yet
    db.delete(bot)
    db.commit()
    return {"detail": "Bot silindi"}

@router.get("/{bot_id}/tickets")
def list_bot_tickets(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.ticket import Ticket
    bot = get_user_bot(bot_id, current_user, db)
    tickets = db.query(Ticket).filter(Ticket.bot_id == bot.id).order_by(Ticket.created_at.desc()).all()
    
    return [
        {
            "id": t.id,
            "contact_id": t.contact_id,
            "order_number": t.order_number,
            "product_name": t.product_name,
            "damage_summary": t.damage_summary,
            "platform": t.platform,
            "image_url": t.image_url,
            "status": t.status,
            "created_at": t.created_at.isoformat() if hasattr(t, 'created_at') and t.created_at else ""
        }
        for t in tickets
    ]
