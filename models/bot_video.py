"""BotVideo — belirli soru gruplarına (anahtar kelime) kısa video ile cevap kuralları.

Her kayıt bir bota ait bir 'kural'dır: kullanıcının sorusu `keywords` içindeki
herhangi bir ifadeyi içeriyorsa, cevaba `video_url` iliştirilir. Kapalı (is_active=False)
kurallar hiç değerlendirilmez. Kural yoksa hiçbir bot bu koddan etkilenmez (izolasyon).
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from db.database import Base


class BotVideo(Base):
    __tablename__ = "bot_videos"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    title = Column(String(200), nullable=True)          # yönetim panelinde tanımak için
    # Virgülle ayrılmış tetikleyici ifadeler (ör: "kurulum, nasıl takılır, montaj").
    keywords = Column(Text, nullable=False, default="")
    video_url = Column(String(500), nullable=False)     # /uploads/xxx.mp4 veya tam URL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
