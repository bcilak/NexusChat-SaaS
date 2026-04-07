from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class Ticket(Base):
    __tablename__ = 'tickets'

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey('bots.id'), nullable=False, index=True)
    platform = Column(String(50), nullable=False) # 'web' or 'whatsapp'
    contact_id = Column(String(255), nullable=False) # user identifier

    order_number = Column(String(100), nullable=True)
    product_name = Column(String(255), nullable=True)
    damage_summary = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)

    status = Column(String(50), default='open') # open, resolved
    created_at = Column(DateTime, default=datetime.utcnow)

    bot = relationship('Bot')
