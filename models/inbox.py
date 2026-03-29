from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from db.database import Base


class InboxConversation(Base):
    __tablename__ = "inbox_conversations"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    
    # Platform could be "web", "whatsapp", "instagram"
    platform = Column(String(50), nullable=False, default="web")
    
    # External ID representing the user (e.g. WhatsApp phone number or Session Cookie ID)
    contact_id = Column(String(255), nullable=False, index=True)
    
    # If True -> RAG AI processes messages. If False -> Admin has taken over manually.
    is_ai_active = Column(Boolean, default=True)
    
    # Track the last time a message was sent in this conversation for sorting
    last_message_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    bot = relationship("Bot", back_populates="inbox_conversations")
    messages = relationship("InboxMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="InboxMessage.created_at")


class InboxMessage(Base):
    __tablename__ = "inbox_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("inbox_conversations.id"), nullable=False, index=True)
    
    # 'user' (from customer), 'ai' (bot response), 'human' (admin takeover response)
    sender_type = Column(String(50), nullable=False)
    
    content = Column(Text, nullable=False)
    
    # If the message is from AI, we could store the sources JSON string here just like ChatHistory
    sources = Column(Text, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("InboxConversation", back_populates="messages")
