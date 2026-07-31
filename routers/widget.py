"""Widget router — public endpoints for the embeddable chat widget."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from db.database import get_db
from models.bot import Bot
from models.banned_ip import BannedIP
from services.chat import rag_chat
from rate_limit import rate_limit  # public endpoint'ler için kredi/DoS koruması

router = APIRouter(prefix="/api/widget", tags=["widget"])


class WidgetChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    attachment_url: Optional[str] = None

class WidgetTicketSubmitRequest(BaseModel):
    session_id: str
    product_name: str
    damage_summary: str
    order_number: Optional[str] = None
    image_url: Optional[str] = None


@router.get("/{bot_id}/config")
def get_widget_config(bot_id: int, db: Session = Depends(get_db)):
    """Public endpoint — returns bot display config for the widget."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    # Pasif bot: widget kendini hiç çizmesin
    if bot.is_active is not None and not bot.is_active:
        return {"bot_id": bot.id, "active": False}

    return {
        "active": True,
        "bot_id": bot.id,
        "name": bot.name,
        "description": bot.description or "",
        "language": bot.language,
        "theme_color": bot.theme_color or "#000000",
        "text_color": bot.text_color or "#ffffff",
        "logo_url": bot.logo_url,
        "welcome_message": bot.welcome_message or ("How can I help you?" if bot.language == "en" else "Size nasıl yardımcı olabilirim?"),
        "example_questions": bot.example_questions,
        # Widget appearance & behavior
        "subtitle": bot.subtitle,
        "theme_mode": bot.theme_mode or "dark",
        "show_home_screen": bool(bot.show_home_screen),
        "privacy_url": bot.privacy_url,
        "widget_position": bot.widget_position or "right",
        "auto_open_delay": bot.auto_open_delay or 0,
        "proactive_message": bot.proactive_message,
        "branding_visible": bot.branding_visible if bot.branding_visible is not None else True,
        "sound_enabled": bool(bot.sound_enabled),
        "hero_header": bool(bot.hero_header),
        # Araç seçici — yalnızca admin açtıysa widget seçiciyi çizer. Kapalıysa
        # (tüm diğer botlar) bu bayrak False döner ve widget hiçbir araç kodunu çalıştırmaz.
        "vehicle_selector": bool(getattr(bot, "vehicle_selector_enabled", False)),
        "vehicle_selector_label": getattr(bot, "vehicle_selector_label", None),
        # Görsel yükleme — varsayılan açık; müşteri kapatırsa widget 📎 butonunu çizmez.
        "image_upload_enabled": bool(getattr(bot, "image_upload_enabled", True)),
        # Ürün öneri kartları — varsayılan açık.
        "product_cards_enabled": bool(getattr(bot, "product_cards_enabled", True)),
        # Paket A — görünüm özelleştirme
        "launcher_icon": getattr(bot, "launcher_icon", None),
        "button_size": getattr(bot, "button_size", None) or "medium",
        "button_shape": getattr(bot, "button_shape", None) or "round",
        "corner_radius": getattr(bot, "corner_radius", None) or "soft",
        "secondary_color": getattr(bot, "secondary_color", None),
        "font_family": getattr(bot, "font_family", None) or "system",
    }


@router.post("/{bot_id}/chat")
@rate_limit("30/minute")
def widget_chat(
    bot_id: int,
    req: WidgetChatRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public endpoint — chat with a bot from the embedded widget (no auth required)."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    if bot.is_active is not None and not bot.is_active:
        raise HTTPException(status_code=403, detail="Bot pasif durumda")

    # IP adresini al
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0] if forwarded else request.client.host
    
    # Check if IP is banned
    is_banned = db.query(BannedIP).filter(BannedIP.ip_address == client_ip).first()
    if is_banned:
        return {
            "answer": "Sistem tarafından engellendiniz. Lütfen yönetici ile iletişime geçin.",
            "sources": [],
            "session_id": req.session_id or str(uuid.uuid4())
        }

    session_id = req.session_id or str(uuid.uuid4())
    try:
        result = rag_chat(bot, req.question, session_id, db, attachment_url=req.attachment_url, platform="web", client_ip=client_ip)
        return result
    except Exception:
        import traceback
        traceback.print_exc()  # Gerçek hata sunucu logunda kalır — kullanıcıya sızmaz
        return {
            "answer": "Üzgünüm, şu anda sistemde geçici bir sorun yaşanıyor. Lütfen daha sonra tekrar deneyin.",
            "sources": [],
            "session_id": session_id
        }


@router.post("/{bot_id}/ticket")
@rate_limit("10/minute")
def submit_ticket(
    bot_id: int,
    req: WidgetTicketSubmitRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Public endpoint."""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadi")

    from models.ticket import Ticket
    ticket = Ticket(
        bot_id=bot.id,
        platform="web",
        contact_id=req.session_id,
        order_number=req.order_number,
        product_name=req.product_name,
        damage_summary=req.damage_summary,
        image_url=req.image_url,
        status="open"
    )
    db.add(ticket)
    db.commit()
    return {"status": "success", "ticket_id": ticket.id, "message": "Ticket basariyla olusturuldu"}


class WidgetFeedbackRequest(BaseModel):
    message_id: int
    session_id: str
    liked: bool


@router.post("/{bot_id}/feedback")
def submit_feedback(
    bot_id: int,
    req: WidgetFeedbackRequest,
    db: Session = Depends(get_db),
):
    """Public endpoint — thumbs up/down on a bot answer."""
    from models.chat_history import ChatHistory

    history = (
        db.query(ChatHistory)
        .filter(
            ChatHistory.id == req.message_id,
            ChatHistory.bot_id == bot_id,
            ChatHistory.session_id == req.session_id,
        )
        .first()
    )
    if not history:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    history.is_liked = req.liked
    db.commit()
    return {"status": "success"}


# ---------------------------------------------------------------------------
# Araç seçici (otomotiv parçaları) — yalnızca vehicle_selector_enabled botlar için.
# Diğer tüm botlarda bu endpoint'ler 404 döner; widget config'te vehicle_selector=False
# geldiği için widget bunları hiç çağırmaz. Böylece mevcut botlar hiç etkilenmez.
# ---------------------------------------------------------------------------

def _require_vehicle_bot(bot_id: int, db: Session) -> Bot:
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")
    if not getattr(bot, "vehicle_selector_enabled", False):
        raise HTTPException(status_code=404, detail="Bu bot için araç seçici etkin değil")
    return bot


def _serialize_product(p) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "price": p.price,
        "sale_price": p.sale_price,
        "currency": p.currency or "TRY",
        "stock": p.stock,
        "image_url": p.image_url,
        "product_url": p.product_url,
        "brand": p.brand,
    }


@router.get("/{bot_id}/vehicle-options")
@rate_limit("60/minute")
def vehicle_options(
    bot_id: int,
    request: Request,
    make: Optional[str] = None,
    model: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Kademeli seçici verisi: marka → model → yıl.

    - make yok → mevcut markalar
    - make var, model yok → o markanın modelleri
    - make + model → o araç için yıl seçenekleri (aralıklar tekil yıllara açılır)
    """
    from models.vehicle_fitment import VehicleFitment

    _require_vehicle_bot(bot_id, db)
    q = db.query(VehicleFitment).filter(VehicleFitment.bot_id == bot_id)

    if not make:
        rows = q.with_entities(VehicleFitment.make).distinct().all()
        makes = sorted({r[0] for r in rows if r[0]})
        return {"level": "make", "options": makes}

    q = q.filter(VehicleFitment.make == make)
    if not model:
        rows = q.with_entities(VehicleFitment.model).distinct().all()
        models = sorted({r[0] for r in rows if r[0]})
        return {"level": "model", "options": models}

    q = q.filter(VehicleFitment.model == model)
    years: set[int] = set()
    for yf, yt in q.with_entities(VehicleFitment.year_from, VehicleFitment.year_to).all():
        if yf is None and yt is None:
            continue
        lo = yf if yf is not None else yt
        hi = yt if yt is not None else yf
        if lo is None or hi is None:
            continue
        if lo > hi:
            lo, hi = hi, lo
        # Aşırı geniş/hatalı aralıkları makul sınırla (feed gürültüsüne karşı)
        if hi - lo > 60:
            continue
        years.update(range(lo, hi + 1))
    return {"level": "year", "options": sorted(years, reverse=True)}


@router.get("/{bot_id}/vehicle-products")
@rate_limit("60/minute")
def vehicle_products(
    bot_id: int,
    request: Request,
    make: str,
    model: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Seçilen marka/model/yıla uyan ürünleri döndürür (en fazla 60)."""
    from models.vehicle_fitment import VehicleFitment
    from models.product import Product

    _require_vehicle_bot(bot_id, db)

    q = (
        db.query(Product)
        .join(VehicleFitment, VehicleFitment.product_id == Product.id)
        .filter(VehicleFitment.bot_id == bot_id, VehicleFitment.make == make)
    )
    if model:
        q = q.filter(VehicleFitment.model == model)
    if year is not None:
        # Yıl aralığına düşen kayıtlar; sınır alanı NULL ise o yönden serbest.
        q = q.filter(
            (VehicleFitment.year_from == None) | (VehicleFitment.year_from <= year),  # noqa: E711
            (VehicleFitment.year_to == None) | (VehicleFitment.year_to >= year),  # noqa: E711
        )

    products = q.distinct().limit(60).all()
    return {"count": len(products), "products": [_serialize_product(p) for p in products]}
