"""Ürün feed servisi — Google Merchant RSS ve genel/Ticimax XML feed'lerini
indirip parse eder, ürünleri products tablosuna upsert eder.
"""
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional

import requests
from sqlalchemy.orm import Session

from models.bot import Bot
from models.product import Product

G_NS = "{http://base.google.com/ns/1.0}"

# Genel XML'lerde alan adı eşleştirme (küçük harfe çevrilmiş etiket adı → bizim alan)
FIELD_ALIASES = {
    "title": ["title", "name", "urunadi", "urun_adi", "productname", "baslik", "urunismi"],
    "external_id": ["id", "urunkodu", "urun_kodu", "stokkodu", "stok_kodu", "sku", "productcode", "barkod", "code"],
    "description": ["description", "aciklama", "detay", "details", "ozet"],
    "price": ["price", "satisfiyati", "satis_fiyati", "fiyat", "sellingprice", "kdvdahilfiyat", "piyasafiyati"],
    "sale_price": ["sale_price", "saleprice", "indirimlifiyat", "indirimli_fiyat", "kampanyafiyati", "discountedprice"],
    "stock": ["availability", "stok", "stock", "stokadedi", "stok_adedi", "quantity", "miktar"],
    "image_url": ["image_link", "imagelink", "resim", "image", "resimurl", "img", "picture", "image1", "gorsel"],
    "product_url": ["link", "url", "urunlink", "urun_link", "producturl", "urunurl"],
    "category": ["product_type", "producttype", "kategori", "category", "kategoriagaci", "categorytree", "google_product_category"],
    "brand": ["brand", "marka"],
}


def _parse_price(raw: Optional[str]) -> Optional[float]:
    """'4.999,90 TL', '4999.90 TRY', '4999,9' gibi değerleri float'a çevirir."""
    if not raw:
        return None
    s = re.sub(r"[^\d.,]", "", str(raw)).strip()
    if not s:
        return None
    # Hem nokta hem virgül varsa: sondaki ayraç ondalıktır
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        # Tek virgül ve 1-2 basamak ondalık gibi görünüyorsa ondalık say
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) <= 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def _local(tag: str) -> str:
    """Namespace'i at, etiket adını küçük harf döndür."""
    return tag.split("}")[-1].lower().replace("-", "_")


def _elem_to_product_dict(elem: ET.Element) -> dict:
    """Bir ürün düğümünün alt etiketlerini alias tablosuyla alanlara eşle."""
    values: dict = {}
    for child in elem.iter():
        if child is elem or child.text is None:
            continue
        tag = _local(child.tag)
        text = child.text.strip()
        if not text:
            continue
        for field, aliases in FIELD_ALIASES.items():
            if tag in aliases and field not in values:
                values[field] = text
                break
    return values


def _extract_currency(raw_price: Optional[str]) -> Optional[str]:
    if not raw_price:
        return None
    m = re.search(r"\b(TRY|TL|USD|EUR|GBP)\b", str(raw_price).upper())
    if m:
        return "TRY" if m.group(1) == "TL" else m.group(1)
    return None


def parse_feed(xml_bytes: bytes) -> list[dict]:
    """Feed XML'ini parse edip ürün dict listesi döndürür.

    Desteklenen yapılar:
    1. Google Merchant RSS: <rss><channel><item><g:...>
    2. Genel/Ticimax XML: kök altında tekrarlayan ürün düğümleri (Urun, product, item...)
    """
    root = ET.fromstring(xml_bytes)

    # Ürün düğümlerini bul: en sık tekrarlayan element adını ürün say
    candidates = []
    channel = root.find("channel")
    if channel is not None:
        candidates = channel.findall("item")
    if not candidates:
        # Kökten 2 seviye derine kadar tekrarlayan düğüm ara
        from collections import Counter
        counts: Counter = Counter()
        for child in root.iter():
            if child is root:
                continue
            tag = _local(child.tag)
            if list(child):  # alt elemanı olan düğümler
                counts[tag] += 1
        likely = [t for t, c in counts.most_common() if c >= 2 and t not in ("channel",)]
        if likely:
            tag_name = likely[0]
            candidates = [e for e in root.iter() if _local(e.tag) == tag_name]

    products = []
    for item in candidates:
        d = _elem_to_product_dict(item)
        if not d.get("title"):
            continue
        raw_price = d.get("price")
        raw_sale = d.get("sale_price")
        # Açıklamadaki HTML etiketlerini ve fazla boşlukları temizle
        desc = d.get("description") or ""
        desc = re.sub(r"<[^>]+>", " ", desc)
        desc = re.sub(r"&\w+;", " ", desc)
        desc = re.sub(r"\s+", " ", desc).strip()
        d["description"] = desc
        products.append({
            "external_id": d.get("external_id"),
            "title": d.get("title")[:500],
            "description": (d.get("description") or "")[:2000] or None,
            "price": _parse_price(raw_price),
            "sale_price": _parse_price(raw_sale),
            "currency": _extract_currency(raw_price) or _extract_currency(raw_sale) or "TRY",
            "stock": (d.get("stock") or "")[:50] or None,
            "image_url": (d.get("image_url") or "")[:1000] or None,
            "product_url": (d.get("product_url") or "")[:1000] or None,
            "category": (d.get("category") or "")[:500] or None,
            "brand": (d.get("brand") or "")[:200] or None,
        })
    return products


# Ürün aramasında elenmesi gereken soru kalıpları
_STOPWORDS = {
    "var", "yok", "kaç", "kaça", "kaçtır", "fiyat", "fiyatı", "fiyati", "fiyatlar", "fiyatları",
    "nedir", "kadar", "için", "icin", "acaba", "merhaba", "selam", "lütfen", "lutfen", "rica",
    "ürün", "urun", "ürünü", "ürünler", "stok", "stokta", "stokda", "satıyor", "satiyor",
    "musunuz", "misiniz", "mısınız", "alabilir", "almak", "istiyorum", "isterim", "bana",
    "sizde", "sizin", "hangi", "nasıl", "nasil", "gönderim", "kargo", "indirim", "indirimli",
    "the", "and", "for", "with",
}


def _tokenize_query(text: str) -> list[str]:
    tokens = re.findall(r"[\wçğıöşüÇĞİÖŞÜ]+", text.lower())
    return [t for t in tokens if len(t) >= 3 and t not in _STOPWORDS and not t.isdigit()]


def search_products(bot_id: int, query: str, db: Session, k: int = 4) -> list[Product]:
    """Soru metnindeki anahtar kelimelerle ürün tablosunda arama yapar.

    Başlıkta eşleşen kelime sayısına göre puanlar; stokta olanları öne alır.
    Anlamlı kelime yoksa (selamlama vb.) boş döner.
    """
    tokens = _tokenize_query(query)
    if not tokens:
        return []

    from sqlalchemy import or_
    conditions = []
    for t in tokens:
        like = f"%{t}%"
        conditions.append(Product.title.ilike(like))
        conditions.append(Product.category.ilike(like))
        conditions.append(Product.brand.ilike(like))
    candidates = (
        db.query(Product)
        .filter(Product.bot_id == bot_id)
        .filter(or_(*conditions))
        .limit(200)
        .all()
    )
    if not candidates:
        return []

    def score(p: Product) -> tuple:
        title = (p.title or "").lower()
        cat = (p.category or "").lower()
        brand = (p.brand or "").lower()
        title_hits = sum(1 for t in tokens if t in title)
        other_hits = sum(1 for t in tokens if t in cat or t in brand)
        out_of_stock = 1 if (p.stock or "").strip() in ("0", "out of stock", "outofstock") else 0
        return (-title_hits, -other_hits, out_of_stock, len(title))

    candidates.sort(key=score)
    best = candidates[0]
    # En az bir başlık eşleşmesi şartı — tamamen alakasız sonuç dönmesin
    if not any(t in (best.title or "").lower() for t in tokens):
        return []
    return candidates[:k]


def sync_feed(bot: Bot, db: Session, feed_url: Optional[str] = None) -> dict:
    """Feed'i indir, parse et, ürünleri upsert et. Sonuç istatistiği döner."""
    url = feed_url or bot.feed_url
    if not url:
        raise ValueError("Feed URL tanımlı değil.")

    resp = requests.get(
        url,
        timeout=60,
        headers={"User-Agent": "Mozilla/5.0 (compatible; ChatGeniusBot/1.0; +https://chatbot.altikodtech.com.tr)"},
    )
    resp.raise_for_status()

    items = parse_feed(resp.content)
    if not items:
        raise ValueError("Feed'de ürün bulunamadı — format desteklenmiyor olabilir.")

    existing = {p.external_id: p for p in db.query(Product).filter(Product.bot_id == bot.id).all() if p.external_id}
    existing_by_url = {p.product_url: p for p in db.query(Product).filter(Product.bot_id == bot.id).all() if p.product_url}

    created = updated = 0
    seen_ids = set()
    for item in items:
        key = item.get("external_id")
        row = existing.get(key) if key else None
        if row is None and item.get("product_url"):
            row = existing_by_url.get(item["product_url"])
        if row:
            for k, v in item.items():
                setattr(row, k, v)
            row.updated_at = datetime.utcnow()
            updated += 1
        else:
            row = Product(bot_id=bot.id, **item)
            db.add(row)
            created += 1
        if key:
            seen_ids.add(key)

    # Feed'den kalkan ürünleri sil (external_id'si olup artık feed'de olmayanlar)
    removed = 0
    for ext_id, row in existing.items():
        if ext_id not in seen_ids:
            db.delete(row)
            removed += 1

    if feed_url:
        bot.feed_url = feed_url
    bot.feed_last_sync = datetime.utcnow()
    db.commit()

    return {"total": len(items), "created": created, "updated": updated, "removed": removed}
