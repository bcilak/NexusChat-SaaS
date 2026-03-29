from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.database import get_db
from models.chat_history import ChatHistory
from models.bot import Bot
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/bot/{bot_id}/stats")
def get_bot_stats(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı veya yetkisiz erişim")
        
    total_messages = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id).count()
    fallbacks = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id, ChatHistory.is_fallback == True).count()
    likes = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id, ChatHistory.is_liked == True).count()
    dislikes = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id, ChatHistory.is_liked == False).count()
    
    return {
        "total_messages": total_messages,
        "fallbacks": fallbacks,
        "likes": likes,
        "dislikes": dislikes
    }

@router.get("/bot/{bot_id}/fallbacks")
def get_fallback_questions(bot_id: int, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Yetkisiz erişim")
        
    records = db.query(ChatHistory).filter(
        ChatHistory.bot_id == bot_id, 
        ChatHistory.is_fallback == True
    ).order_by(ChatHistory.created_at.desc()).limit(limit).all()
    
    return [{"id": r.id, "question": r.question, "created_at": r.created_at.isoformat() if r.created_at else ""} for r in records]
