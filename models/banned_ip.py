from sqlalchemy import Column, Integer, String, DateTime
import datetime
from db.database import Base

class BannedIP(Base):
    __tablename__ = "banned_ips"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True, index=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
