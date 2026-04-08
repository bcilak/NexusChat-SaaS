from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from models.bot import Bot
from models.bot_integration import BotIntegration
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


# ─── Request / Response Modelleri ────────────────────────────────────────────

class IntegrationCreate(BaseModel):
    bot_id: int
    provider: str
    api_url: str
    api_key: str
    api_secret: Optional[str] = None
    meta_data: Optional[str] = None


class IntegrationUpdate(BaseModel):
    provider: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: Optional[bool] = None
    meta_data: Optional[str] = None


class IntegrationResponse(BaseModel):
    id: int
    bot_id: int
    provider: str
    api_url: str
    api_key: str
    api_secret: Optional[str] = None
    is_active: bool
    meta_data: Optional[str] = None


class TestConnectionRequest(BaseModel):
    provider: str
    api_url: str
    api_key: str
    api_secret: Optional[str] = None
    meta_data: Optional[str] = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    store_name: Optional[str] = None
    product_count: Optional[int] = None
    provider: str


# ─── Yardımcı ────────────────────────────────────────────────────────────────

def integration_to_response(intg: BotIntegration) -> IntegrationResponse:
    return IntegrationResponse(
        id=intg.id,
        bot_id=intg.bot_id,
        provider=intg.provider,
        api_url=intg.api_url,
        api_key=intg.api_key,
        api_secret=intg.api_secret,
        is_active=intg.is_active,
        meta_data=intg.meta_data,
    )


# ─── Auth Callback & Setup ────────────────────────────────────────────────────

import requests
import json

@router.get("/ideasoft/auth-url")
def get_ideasoft_auth_url(
    bot_id: int,
    api_url: str,
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ideasoft yetkilendirme URL'sini oluşturup döner.
    Front-end'in buraya yönlendirmesi için kullanılır.
    State olarak bot_id kullanılır ve metadata'ya kaydedilir.
    """
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")

    from services.ideasoft import build_authorization_url

    # Mevcut entegrasyonu bul (varsa mevcut metadata'yı koru)
    existing = db.query(BotIntegration).filter(
        BotIntegration.bot_id == bot_id,
        BotIntegration.provider == "ideasoft"
    ).first()
    meta_data_str = existing.meta_data if existing else None

    # State olarak bot_id kullan; build_authorization_url bunu meta'ya da kaydeder
    auth_res = build_authorization_url(
        api_url=api_url,
        client_id=client_id,
        redirect_uri="",  # Frontend kendi redirect_uri'sini kullanacak; backend endpoint'i burada sadece URL üretir
        meta_data_str=meta_data_str,
        state=str(bot_id),
    )

    # State'i (bot_id) DB'deki metadata'ya kaydet ki callback-exchange doğrulayabilsin
    updated_meta = auth_res["updated_meta_data_str"]
    if existing:
        existing.meta_data = updated_meta
        db.commit()
    else:
        # Henüz entegrasyon yok; sadece state'i tutmak için geçici kayıt oluştur
        integration = BotIntegration(
            bot_id=bot_id,
            provider="ideasoft",
            api_url=api_url,
            api_key=client_id,
            api_secret="",
            meta_data=updated_meta,
        )
        db.add(integration)
        db.commit()

    return {"url": auth_res["authorization_url"], "updated_meta_data_str": updated_meta}


@router.post("/ideasoft/callback-exchange")
def ideasoft_callback_exchange(
    req: dict,  # Beklenen: { code, bot_id, api_url, client_id, client_secret, redirect_uri, state? }
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ideasoft'tan dönen kodu (authorization_code) alıp access token'a çevirir,
    sonrasında sisteme entegrasyonu kaydeder.
    Frontend doğrudan window.location ile yönlendirildiğinden state = bot_id olarak gelir.
    """
    from services.ideasoft import exchange_code_for_token, IdeaSoftError

    bot_id = req.get("bot_id")
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")

    shop_url = req.get("api_url", "")
    redirect_uri = req.get("redirect_uri", "")
    returned_state = req.get("state", str(bot_id))

    # DB'deki mevcut entegrasyon kaydını bul
    existing = db.query(BotIntegration).filter(
        BotIntegration.bot_id == bot_id,
        BotIntegration.provider == "ideasoft"
    ).first()

    # Meta'yı hazırla: DB'de kayıtlı state varsa onu kullan, yoksa returned_state ile doldur
    meta = json.loads(existing.meta_data) if existing and existing.meta_data else {}
    if not meta.get("ideasoft_state"):
        # auth-url endpoint'i çağrılmadıysa (frontend doğrudan yönlendiriyorsa)
        # state = bot_id olarak güvenle kabul et
        meta["ideasoft_state"] = str(bot_id)

    try:
        token_res = exchange_code_for_token(
            api_url=shop_url,
            client_id=req.get("client_id"),
            client_secret=req.get("client_secret"),
            redirect_uri=redirect_uri,
            code=req.get("code"),
            returned_state=returned_state,
            meta_data_str=json.dumps(meta),
        )

        updated_meta_data_str = token_res["updated_meta_data_str"]

        if existing:
            existing.api_url = shop_url
            existing.api_key = req.get("client_id")
            existing.api_secret = req.get("client_secret")
            existing.meta_data = updated_meta_data_str
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return integration_to_response(existing)
        else:
            integration = BotIntegration(
                bot_id=bot_id,
                provider="ideasoft",
                api_url=shop_url,
                api_key=req.get("client_id"),
                api_secret=req.get("client_secret"),
                meta_data=updated_meta_data_str,
                is_active=True,
            )
            db.add(integration)
            db.commit()
            db.refresh(integration)
            return integration_to_response(integration)

    except IdeaSoftError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sistem hatası: {str(e)}")


# ─── CRUD Endpoint'leri ───────────────────────────────────────────────────────

@router.post("", response_model=IntegrationResponse)
def create_integration(
    req: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = db.query(Bot).filter(Bot.id == req.bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=403, detail="Bot bulunamadı veya yetkisiz erişim")

    existing = db.query(BotIntegration).filter(
        BotIntegration.bot_id == req.bot_id,
        BotIntegration.provider == req.provider
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Bot için zaten {req.provider} entegrasyonu mevcut.")

    integration = BotIntegration(**req.model_dump())
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration_to_response(integration)


@router.get("/bot/{bot_id}", response_model=List[IntegrationResponse])
def get_bot_integrations(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")

    integrations = db.query(BotIntegration).filter(BotIntegration.bot_id == bot_id).all()
    return [integration_to_response(i) for i in integrations]


@router.put("/{integration_id}", response_model=IntegrationResponse)
def update_integration(
    integration_id: int,
    req: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    integration = db.query(BotIntegration).join(Bot).filter(
        BotIntegration.id == integration_id,
        Bot.user_id == current_user.id
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")

    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(integration, k, v)

    db.commit()
    db.refresh(integration)
    return integration_to_response(integration)


@router.delete("/{integration_id}")
def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    integration = db.query(BotIntegration).join(Bot).filter(
        BotIntegration.id == integration_id,
        Bot.user_id == current_user.id
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")

    db.delete(integration)
    db.commit()
    return {"detail": "Entegrasyon silindi"}


# ─── Bağlantı Test Endpoint'i ─────────────────────────────────────────────────

@router.post("/test-connection", response_model=TestConnectionResponse)
def test_connection(
    req: TestConnectionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Entegrasyon kaydetmeden önce bağlantıyı test eder.
    Her sağlayıcıya özel yöntem kullanılır.
    """
    import requests as http_req

    provider = req.provider.lower().strip()

    # ── IdeaSoft ─────────────────────────────────────────────────────────────
    if provider == "ideasoft":
        from services.ideasoft import test_connection as ideasoft_test
        result = ideasoft_test(
            api_url=req.api_url,
            client_id=req.api_key,
            client_secret=req.api_secret or "",
            meta_data_str=req.meta_data,
        )
        return TestConnectionResponse(
            success=result["success"],
            message=result["message"],
            store_name=result.get("store_name", ""),
            product_count=result.get("product_count", 0),
            provider="ideasoft",
        )

    # ── WooCommerce ───────────────────────────────────────────────────────────
    elif provider == "woocommerce":
        try:
            endpoint = f"{req.api_url.rstrip('/')}/wp-json/wc/v3/products"
            params = {
                "consumer_key": req.api_key,
                "consumer_secret": req.api_secret or "",
                "per_page": 1,
            }
            resp = http_req.get(endpoint, params=params, timeout=10)
            if resp.ok:
                total = int(resp.headers.get("X-WP-Total", 0))
                return TestConnectionResponse(
                    success=True,
                    message="WooCommerce bağlantısı başarılı!",
                    store_name=req.api_url,
                    product_count=total,
                    provider="woocommerce",
                )
            return TestConnectionResponse(
                success=False,
                message=f"WooCommerce bağlantısı başarısız (HTTP {resp.status_code}). "
                        "API key/secret ve URL'yi kontrol edin.",
                provider="woocommerce",
            )
        except Exception as e:
            return TestConnectionResponse(
                success=False,
                message=f"WooCommerce bağlantı hatası: {str(e)}",
                provider="woocommerce",
            )

    # ── Ticimax ───────────────────────────────────────────────────────────────
    elif provider == "ticimax":
        try:
            endpoint = f"{req.api_url.rstrip('/')}/api/Product/GetProducts"
            headers = {"Authorization": f"Bearer {req.api_key}"}
            resp = http_req.get(endpoint, headers=headers, params={"pageSize": 1}, timeout=10)
            if resp.ok:
                return TestConnectionResponse(
                    success=True,
                    message="Ticimax bağlantısı başarılı!",
                    store_name=req.api_url,
                    provider="ticimax",
                )
            return TestConnectionResponse(
                success=False,
                message=f"Ticimax bağlantısı başarısız (HTTP {resp.status_code}). "
                        "API anahtarını kontrol edin.",
                provider="ticimax",
            )
        except Exception as e:
            return TestConnectionResponse(
                success=False,
                message=f"Ticimax bağlantı hatası: {str(e)}",
                provider="ticimax",
            )

    # ── Shopify ───────────────────────────────────────────────────────────────
    elif provider == "shopify":
        try:
            shop = req.api_url.rstrip("/")
            endpoint = f"{shop}/admin/api/2024-01/products.json"
            headers = {"X-Shopify-Access-Token": req.api_key}
            resp = http_req.get(endpoint, headers=headers, params={"limit": 1}, timeout=10)
            if resp.ok:
                return TestConnectionResponse(
                    success=True,
                    message="Shopify bağlantısı başarılı!",
                    store_name=shop,
                    provider="shopify",
                )
            return TestConnectionResponse(
                success=False,
                message=f"Shopify bağlantısı başarısız (HTTP {resp.status_code}). "
                        "Access token ve mağaza URL'sini kontrol edin.",
                provider="shopify",
            )
        except Exception as e:
            return TestConnectionResponse(
                success=False,
                message=f"Shopify bağlantı hatası: {str(e)}",
                provider="shopify",
            )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"'{provider}' sağlayıcısı desteklenmiyor. "
                   "Desteklenenler: ideasoft, woocommerce, ticimax, shopify",
        )
