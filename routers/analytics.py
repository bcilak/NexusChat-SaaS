from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from db.database import get_db
from models.chat_history import ChatHistory
from models.bot import Bot
from models.user import User
from routers.auth import get_current_user
from typing import Optional, List
from pydantic import BaseModel
import os
import datetime

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

@router.get("/bot/{bot_id}/history")
def get_chat_history(
    bot_id: int, 
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı veya yetkisiz erişim")
    
    query = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id)
    
    if start_date:
        # Expected format YYYY-MM-DD
        try:
            start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(ChatHistory.created_at >= start_dt)
        except:
            pass
            
    if end_date:
        try:
            # Add 1 day to include the end date fully if they pass just YYYY-MM-DD
            end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(ChatHistory.created_at < end_dt)
        except:
            pass
            
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                ChatHistory.question.ilike(search_fmt),
                ChatHistory.answer.ilike(search_fmt),
                ChatHistory.session_id.ilike(search_fmt)
            )
        )
        
    records = query.order_by(ChatHistory.created_at.desc()).limit(1000).all()
    
    return [
        {
            "id": r.id, 
            "session_id": r.session_id,
            "question": r.question, 
            "answer": r.answer,
            "is_fallback": r.is_fallback,
            "created_at": r.created_at.isoformat() if r.created_at else ""
        } 
        for r in records
    ]


class AnalyzeRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    search: Optional[str] = None

@router.post("/bot/{bot_id}/analyze")
def analyze_chat_history(
    bot_id: int, 
    req: AnalyzeRequest,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı veya yetkisiz erişim")
    
    query = db.query(ChatHistory).filter(ChatHistory.bot_id == bot_id)
    
    if req.start_date:
        try:
            start_dt = datetime.datetime.strptime(req.start_date, "%Y-%m-%d")
            query = query.filter(ChatHistory.created_at >= start_dt)
        except:
            pass
            
    if req.end_date:
        try:
            end_dt = datetime.datetime.strptime(req.end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(ChatHistory.created_at < end_dt)
        except:
            pass
            
    if req.search:
        search_fmt = f"%{req.search}%"
        query = query.filter(
            or_(
                ChatHistory.question.ilike(search_fmt),
                ChatHistory.answer.ilike(search_fmt),
                ChatHistory.session_id.ilike(search_fmt)
            )
        )
        
    # Limit logic to protect tokens (e.g. 150 interactions max)
    records = query.order_by(ChatHistory.created_at.desc()).limit(150).all()
    
    if not records:
        return {"report": "Bu filtrelere uygun incelenecek sohbet geçmişi bulunamadı."}
        
    # Build prompt content
    history_text = ""
    for r in records:
        history_text += f"---\nTarih: {r.created_at}\nMüşteri: {r.question}\nBot: {r.answer}\nZorlandı/Bilemedi: {'Evet' if r.is_fallback else 'Hayır'}\n"
        
    system_prompt = (
        "Sen deneyimli bir müşteri ilişkileri ve veri analizi uzmanısın. Kullanıcı sana bir AI chatbot'un müşteri diyalog loglarını verecek. "
        "Senden beklentimiz bu konuşma loglarını analiz edip Türkçe ve kapsamlı, markdown formatında profesyonel bir rapor oluşturman:\n\n"
        "1. Genel Durum ve Memnuniyet: Sohbetlerin genel gidişatı nasıl?\n"
        "2. Sık Sorulan Sorular: Müşteriler en çok neyi merak ediyor?\n"
        "3. Gelişim Alanları (Zorlanılan Sorular): Bot nelerde yetersiz kalmış, bilgi bankasına (knowledge base) ne gibi dökümanlar eklenmeli?\n"
        "4. Kapanış Önerileri: Bu botun daha iyi performans göstermesi için 3 kısa öneri.\n\n"
        "Raporu başlıklar, markdown özellikleri (kalın yazılar, listeler, emojiler vb) kullanarak görsel açıdan çok zengin ve net oluştur."
    )
    
    user_prompt = f"İşte son sohbet geçmişi:\n{history_text}\nLütfen sadece markdown formatında yukarıdaki kurallara uyan raporunu bana sun."
    
    from langchain_core.messages import SystemMessage, HumanMessage
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    # Init LLM based on user's preference or default to gpt-4o-mini
    model_name = bot.model or "gpt-4o-mini"
    answer = ""
    
    try:
        if "gemini" in model_name:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                temperature=0.3,
                max_output_tokens=2048,
                google_api_key=os.getenv("GOOGLE_API_KEY", ""),
            )
            resp = llm.invoke(messages)
            answer = resp.content
        elif "claude" in model_name:
            from langchain_anthropic import ChatAnthropic
            llm = ChatAnthropic(
                model_name=model_name,
                temperature=0.3,
                max_tokens=2048,
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            )
            resp = llm.invoke(messages)
            answer = resp.content
        else:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=model_name,
                temperature=0.3,
                max_tokens=2048,
                openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            )
            resp = llm.invoke(messages)
            answer = resp.content
    except Exception as e:
        answer = f"Yapay zeka raporu oluşturulurken bir hata ile karşılaşıldı: {str(e)}"
        
    return {"report": answer}
