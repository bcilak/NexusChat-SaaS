from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from db.database import Base


class BotIntegration(Base):
    __tablename__ = "bot_integrations"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False)
    
    provider = Column(String(50), nullable=False, index=True)  # e.g., 'woocommerce', 'shopify'
    api_url = Column(String(500), nullable=False)
    api_key = Column(String(500), nullable=False)
    api_secret = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    meta_data = Column(Text, nullable=True)  # JSON for any extra configuration
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bot = relationship("Bot", back_populates="integrations")
