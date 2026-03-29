from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    plan = Column(String(50), default="free")
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

    bots = relationship("Bot", back_populates="owner", cascade="all, delete-orphan")
