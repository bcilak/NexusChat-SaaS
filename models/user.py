from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
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
    credits = Column(Integer, default=500)
    can_use_api_tools = Column(Boolean, default=False)
    can_remove_branding = Column(Boolean, default=False)
    # Sub-user (alt kullanıcı) sistemi
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    can_create_users = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bots = relationship("Bot", back_populates="owner", cascade="all, delete-orphan")
    # Alt kullanıcılar
    sub_users = relationship("User", foreign_keys=[parent_id], backref="parent", lazy="dynamic")
