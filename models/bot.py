from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base


class Bot(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    prompt = Column(
        Text,
        default=(
            "Sen yardımcı bir asistansın. Sadece sana verilen bilgilere göre cevap ver. "
            "Eğer bilgi yoksa 'Bu konuda bilgim yok' de."
        ),
    )
    model = Column(String(50), default="gpt-4o-mini")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1024)
    language = Column(String(10), default="tr")
    show_sources = Column(Boolean, default=True)
    
    # Customization & Settings
    theme_color = Column(String(20), default="#000000")
    text_color = Column(String(20), default="#FFFFFF")
    logo_url = Column(String(500), nullable=True)
    welcome_message = Column(Text, default="Merhaba, size nasıl yardımcı olabilirim?")
    example_questions = Column(Text, nullable=True)  # JSON String
    
    # WhatsApp Integration
    whatsapp_phone_id = Column(String(100), nullable=True, index=True)
    whatsapp_token = Column(String(500), nullable=True)
    whatsapp_verify_token = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="bots")
    documents = relationship("Document", back_populates="bot", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="bot", cascade="all, delete-orphan")
    crawled_pages = relationship("CrawledPage", back_populates="bot", cascade="all, delete-orphan")
    integrations = relationship("BotIntegration", back_populates="bot", cascade="all, delete-orphan")
    inbox_conversations = relationship("InboxConversation", back_populates="bot", cascade="all, delete-orphan")
