from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base


class Product(Base):
    """Ürün feed'inden (Google Merchant / Ticimax / İdeasoft XML) senkronize edilen ürünler."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    external_id = Column(String(200), nullable=True, index=True)  # Feed'deki ürün ID/SKU
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    sale_price = Column(Float, nullable=True)  # İndirimli fiyat (varsa)
    currency = Column(String(10), default="TRY")
    stock = Column(String(50), nullable=True)  # "in stock" / "out of stock" / adet
    image_url = Column(String(1000), nullable=True)
    product_url = Column(String(1000), nullable=True)
    category = Column(String(500), nullable=True)
    brand = Column(String(200), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bot = relationship("Bot", back_populates="products")
