from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db.database import Base


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False)
    session_id = Column(String(100), index=True, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sources = Column(Text, default="[]")  # JSON array of source references
    platform = Column(String(50), nullable=False, default="web")
    
    # Analytics & Feedback
    is_liked = Column(Boolean, nullable=True)
    is_fallback = Column(Boolean, default=False)
    
    # Security
    is_spam = Column(Boolean, default=False)
    ip_address = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    bot = relationship("Bot", back_populates="chat_history")
