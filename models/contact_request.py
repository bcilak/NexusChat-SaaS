from sqlalchemy import Column, String, Text, Boolean, DateTime
from db.database import Base
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    company = Column(String(100), nullable=True)
    message = Column(Text, nullable=True)
    request_type = Column(String(50), default="demo") # demo, kurumsal vs.
    status = Column(String(50), default="bekliyor") # beklemede, dönüş_yapıldı
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
