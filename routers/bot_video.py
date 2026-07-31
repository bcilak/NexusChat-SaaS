"""Bot Video Rules router — belirli soru gruplarına video ile cevap kuralları CRUD.

Kurallar bota özeldir; sahibi (Bot.user_id) yönetir. Anahtar kelime eşleşmesi
`services/chat.py` içinde yapılır; burası yalnızca kuralların yönetimidir.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.bot import Bot
from models.bot_video import BotVideo
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/bots", tags=["bot-videos"])


# ──────────────────────────── Schemas ────────────────────────────

class VideoRuleCreate(BaseModel):
    title: Optional[str] = None
    keywords: str = ""            # virgülle ayrılmış tetikleyiciler
    video_url: str
    is_active: bool = True


class VideoRuleUpdate(BaseModel):
    title: Optional[str] = None
    keywords: Optional[str] = None
    video_url: Optional[str] = None
    is_active: Optional[bool] = None


class VideoRuleResponse(BaseModel):
    id: int
    bot_id: int
    title: Optional[str] = None
    keywords: str
    video_url: str
    is_active: bool

    class Config:
        from_attributes = True


# ──────────────────────────── Helpers ────────────────────────────

def _get_bot_or_404(bot_id: int, db: Session, user: User) -> Bot:
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı.")
    return bot


def _get_rule_or_404(bot_id: int, video_id: int, db: Session) -> BotVideo:
    rule = db.query(BotVideo).filter(BotVideo.id == video_id, BotVideo.bot_id == bot_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Video kuralı bulunamadı.")
    return rule


# ──────────────────────────── Endpoints ────────────────────────────

@router.get("/{bot_id}/videos", response_model=list[VideoRuleResponse])
def list_videos(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    return db.query(BotVideo).filter(BotVideo.bot_id == bot_id).order_by(BotVideo.id.desc()).all()


@router.post("/{bot_id}/videos", response_model=VideoRuleResponse)
def create_video(bot_id: int, payload: VideoRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    if not payload.video_url.strip():
        raise HTTPException(status_code=400, detail="video_url zorunludur.")
    rule = BotVideo(
        bot_id=bot_id,
        title=(payload.title or "").strip() or None,
        keywords=payload.keywords.strip(),
        video_url=payload.video_url.strip(),
        is_active=payload.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/{bot_id}/videos/{video_id}", response_model=VideoRuleResponse)
def update_video(bot_id: int, video_id: int, payload: VideoRuleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    rule = _get_rule_or_404(bot_id, video_id, db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{bot_id}/videos/{video_id}")
def delete_video(bot_id: int, video_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    rule = _get_rule_or_404(bot_id, video_id, db)
    db.delete(rule)
    db.commit()
    return {"ok": True}
