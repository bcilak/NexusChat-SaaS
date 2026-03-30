"""Chat router — RAG question answering and history endpoints."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from db.database import get_db
from models.bot import Bot
from models.chat_history import ChatHistory
from models.user import User
from routers.auth import get_current_user
from routers.bot import get_user_bot
from services.chat import rag_chat

router = APIRouter(prefix="/api/bots/{bot_id}/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    attachment_url: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: list
    session_id: str


class HistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    sources: list
    created_at: str


class FeedbackRequest(BaseModel):
    is_liked: bool


@router.post("", response_model=ChatResponse)
def chat(
    bot_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    session_id = req.session_id or str(uuid.uuid4())

    result = rag_chat(bot, req.question, session_id, db, attachment_url=req.attachment_url)
    return ChatResponse(**result)


@router.get("/history", response_model=list[HistoryItem])
def get_history(
    bot_id: int,
    session_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    query = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id)
    if session_id:
        query = query.filter(ChatHistory.session_id == session_id)
    records = query.order_by(ChatHistory.created_at.desc()).limit(limit).all()
    return [
        HistoryItem(
            id=r.id,
            question=r.question,
            answer=r.answer,
            sources=json.loads(r.sources) if r.sources else [],
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]


@router.post("/history/{history_id}/feedback")
def submit_feedback(
    bot_id: int,
    history_id: int,
    req: FeedbackRequest,
    db: Session = Depends(get_db)
):
    history = db.query(ChatHistory).filter(ChatHistory.id == history_id, ChatHistory.bot_id == bot_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Sohbet kaydı bulunamadı")
    
    history.is_liked = req.is_liked
    db.commit()
    return {"detail": "Geri bildirim kaydedildi"}
