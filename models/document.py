from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    chunk_count = Column(Integer, default=0)
    is_trained = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bot = relationship("Bot", back_populates="documents")
