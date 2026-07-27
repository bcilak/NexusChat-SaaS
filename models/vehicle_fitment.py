from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base


class VehicleFitment(Base):
    """Bir ürünün (araç parçası/aksesuarı) uyumlu olduğu araç(lar).

    Bir parça birden çok araç/yıl aralığına uyabildiği için ürünle çoktan-çoğa:
    her uyumlu araç aralığı = bir satır. Araç seçici (marka→model→yıl) bu tablodan beslenir.
    Yalnızca bot.vehicle_selector_enabled=True olan botlar için doldurulur.
    """
    __tablename__ = "vehicle_fitment"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)

    make = Column(String(100), nullable=False, index=True)   # Araç markası (Audi)
    model = Column(String(150), nullable=True, index=True)    # Model (A3 HB / SD)
    year_from = Column(Integer, nullable=True)                # 2013
    year_to = Column(Integer, nullable=True)                  # 2020 (tek yılsa from=to)

    product = relationship("Product", back_populates="fitments")
