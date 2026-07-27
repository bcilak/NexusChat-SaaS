"""Araç uyumluluk (fitment) ayrıştırıcı.

Ticimax gibi feed'lerde marka/model/yıl çoğu zaman yapısal alanda DEĞİL, ürün
başlığında serbest metin olarak bulunur. Örn:
    "AUDI A3 HB / SD 2013-2020 Uyumlu Sahler Araca Özel 4.5D Havuzlu Oto Paspas"
Bu modül başlıktan (marka, model, year_from, year_to) çıkarır ve vehicle_fitment
tablosunu doldurur. Yalnızca bot.vehicle_selector_enabled=True olan botlar için çalışır.
"""
import re

from sqlalchemy.orm import Session

from models.product import Product
from models.vehicle_fitment import VehicleFitment

# Türkiye pazarındaki yaygın araç markaları. Uzun adlar (Mercedes-Benz, Land Rover)
# kısa olanlardan ÖNCE denensin diye uzunluğa göre sıralı kullanılır.
CAR_MAKES = [
    "Mercedes-Benz", "Mercedes", "Land Rover", "Alfa Romeo", "Volkswagen", "Chevrolet",
    "Mitsubishi", "Land-Rover", "Maserati", "Bentley", "Porsche", "Peugeot", "Renault",
    "Hyundai", "Citroen", "Citroën", "Toyota", "Nissan", "Subaru", "Suzuki", "Ferrari",
    "Lancia", "Chery", "Isuzu", "Iveco", "Skoda", "Volvo", "Lexus", "Dacia", "Honda",
    "Mazda", "Tesla", "Cupra", "Jaguar", "Audi", "BMW", "Fiat", "Ford", "Opel", "Seat",
    "Mini", "Jeep", "Kia", "VW", "DS", "MG", "Tofaş", "Togg",
]
# Folded (ASCII, küçük) eşleme tablosu: {folded_make: OriginalDisplay}
_TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosucgiosu")


def _fold(text: str) -> str:
    return (text or "").replace("İ", "i").replace("I", "i").lower().translate(_TR_MAP)


_MAKES_SORTED = sorted(CAR_MAKES, key=len, reverse=True)
_MAKE_LOOKUP = [(_fold(m), m) for m in _MAKES_SORTED]

# "2013-2020", "2013 - 2020", "2013/2020" gibi yıl aralıkları
_RANGE_RE = re.compile(r"(19|20)(\d{2})\s*[-/–]\s*(19|20)(\d{2})")
# Tek yıl (aralık yoksa)
_SINGLE_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def parse_title(title: str) -> list[dict]:
    """Ürün başlığından uyumlu araç(lar)ı çıkarır. Genelde 1 kayıt döner.

    Dönüş: [{"make","model","year_from","year_to"}]. Marka bulunamazsa boş liste.
    """
    if not title:
        return []
    folded = _fold(title)

    # 1. Marka: başlıkta EN ERKEN konumda geçen bilinen marka (çift-araçlı başlıkta
    #    ilk araç seçilsin). Marka kelime sınırında olmalı (BMW3 gibi değil).
    make = None
    make_pos = None
    for fmake, display in _MAKE_LOOKUP:
        idx = folded.find(fmake)
        if idx == -1:
            continue
        before_ok = idx == 0 or not folded[idx - 1].isalnum()
        after_i = idx + len(fmake)
        after_ok = after_i >= len(folded) or not folded[after_i].isalnum()
        if before_ok and after_ok and (make_pos is None or idx < make_pos):
            make = display
            make_pos = idx
    if not make:
        return []

    # 2. Yıl aralığı
    year_from = year_to = None
    mrange = _RANGE_RE.search(title)
    if mrange:
        year_from = int(mrange.group(1) + mrange.group(2))
        year_to = int(mrange.group(3) + mrange.group(4))
        year_pos = mrange.start()
    else:
        msingle = _SINGLE_YEAR_RE.search(title)
        if msingle:
            year_from = year_to = int(msingle.group(0))
            year_pos = msingle.start()
        else:
            year_pos = len(title)
    if year_from and year_to and year_from > year_to:
        year_from, year_to = year_to, year_from

    # 3. Model: markadan sonra, yıldan önceki metin
    model = None
    start = (make_pos or 0) + len(make)
    raw_model = title[start:year_pos] if year_pos > start else ""
    # Gürültü kelimelerini at
    raw_model = re.sub(r"\b(uyumlu|için|araca özel|araç|serisi|kasa)\b", " ", raw_model, flags=re.I)
    raw_model = re.sub(r"[^\wçğıöşüÇĞİÖŞÜ /.-]", " ", raw_model)
    raw_model = re.sub(r"\s+", " ", raw_model).strip(" /-.")
    if raw_model:
        model = raw_model[:150]

    return [{"make": make, "model": model or None, "year_from": year_from, "year_to": year_to}]


def rebuild_fitments_for_bot(bot, db: Session) -> dict:
    """Botun tüm ürünlerini yeniden ayrıştırıp vehicle_fitment tablosunu tazeler.
    Feed senkronundan sonra (bot.vehicle_selector_enabled ise) çağrılır.
    """
    # Eski satırları temizle (idempotent yeniden inşa)
    db.query(VehicleFitment).filter(VehicleFitment.bot_id == bot.id).delete()

    products = db.query(Product).filter(Product.bot_id == bot.id).all()
    created = 0
    matched_products = 0
    for p in products:
        fits = parse_title(p.title)
        if fits:
            matched_products += 1
        for f in fits:
            db.add(VehicleFitment(
                bot_id=bot.id,
                product_id=p.id,
                make=f["make"],
                model=f["model"],
                year_from=f["year_from"],
                year_to=f["year_to"],
            ))
            created += 1
    db.commit()
    return {"products": len(products), "matched": matched_products, "fitments": created}
