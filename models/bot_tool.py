"""BotTool model — kullanıcının bota bağladığı harici API araçları."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from db.database import Base


class BotTool(Base):
    __tablename__ = "bot_tools"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False)

    # Araç kimliği ve açıklaması
    name = Column(String(100), nullable=False)           # LLM'in kullandığı teknik isim (ör: weather_api)
    display_name = Column(String(200), nullable=False)   # Kullanıcıya gösterilen isim (ör: Hava Durumu)
    description = Column(Text, nullable=False)           # LLM bu metni okur — ne zaman kullanılacağını anlar

    # API yapılandırması
    api_url = Column(String(1000), nullable=False)       # {query} placeholder destekler
    method = Column(String(10), default="GET")           # GET veya POST
    headers = Column(Text, default="{}")                 # JSON string — Authorization: Bearer xxx gibi
    query_params = Column(Text, default="{}")            # JSON string — {query} placeholder destekler
    body_template = Column(Text, default="")             # POST için JSON body — {query} placeholder

    # Yanıt işleme
    response_path = Column(Text, default="")            # Virgülle ayrılmış dot-notation alanlar: "main.temp,weather.0.description"
    response_template = Column(String(500), default="") # "Sıcaklık: {main.temp}°C, Durum: {weather.0.description}"

    # Durum
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bot = relationship("Bot", back_populates="tools")
