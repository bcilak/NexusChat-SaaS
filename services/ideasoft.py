"""
IdeaSoft OAuth2 Entegrasyon Servisi
-------------------------------------
IdeaSoft REST API v2 ile tam entegrasyon:
  - OAuth 2.0 token alma (client_credentials)
  - Token önbellekleme (basit in-memory cache)
  - Ürün arama (products)
  - Sipariş sorgulama (orders)
  - Kategori listesi (categories)
  - Stok kontrol
  - Bağlantı testi

Referans: https://dev.ideasoft.biz/
"""
from __future__ import annotations

import time
import json
import logging
from typing import Optional, Dict, Any, List
import requests

logger = logging.getLogger(__name__)

# ─── In-memory token cache ───────────────────────────────────────────────────
# { (api_url, client_id): {"access_token": str, "expires_at": float} }
_TOKEN_CACHE: Dict[tuple, Dict] = {}

IDEASOFT_TOKEN_ENDPOINT = "/oauth/v2/token"
IDEASOFT_API_BASE = "/api/v2"


class IdeaSoftError(Exception):
    """IdeaSoft API hatası."""
    pass


# ─── Token Yönetimi ──────────────────────────────────────────────────────────

def _cache_key(api_url: str, client_id: str) -> tuple:
    return (api_url.rstrip("/"), client_id)


def _is_token_valid(cache_entry: Dict) -> bool:
    """Token'ın süresi dolmamışsa True döner (30 sn güvenlik payı)."""
    return time.time() < cache_entry.get("expires_at", 0) - 30


def get_access_token(api_url: str, client_id: str, client_secret: str, meta_data_str: str = None, force_refresh: bool = False) -> str:
    """
    IdeaSoft OAuth2.
    Token önbellekte geçerliyse yeni istek atmaz.
    Öncelikle veritabanı meta_data'daki token'a bakar.
    """
    meta = {}
    if meta_data_str:
        try:
            meta = json.loads(meta_data_str)
            if not force_refresh and "ideasoft_access_token" in meta:
                # Still checking cache
                key = _cache_key(api_url, client_id)
                cached = _TOKEN_CACHE.get(key)
                if cached and _is_token_valid(cached):
                    return cached["access_token"]
                return meta["ideasoft_access_token"]
        except Exception:
            pass

    key = _cache_key(api_url, client_id)

    # Önbellekte geçerli token varsa
    cached = _TOKEN_CACHE.get(key)
    if cached and _is_token_valid(cached) and not force_refresh:
        return cached["access_token"]

    # Yeni token al
    token_url = api_url.rstrip("/") + IDEASOFT_TOKEN_ENDPOINT
    
    current_refresh_token = meta.get("ideasoft_refresh_token")
    if current_refresh_token:
        payload = {
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": current_refresh_token,
        }
    else:
        raise IdeaSoftError("IdeaSoft entegrasyonu izin gerektirir. Lütfen 'Entegrasyonu Kaydet' butonuna basarak IdeaSoft üzerinden onay verin.")

    try:
        resp = requests.post(token_url, data=payload, timeout=10)
    except requests.exceptions.ConnectionError:
        raise IdeaSoftError("IdeaSoft sunucusuna bağlanılamadı. Mağaza URL'sini kontrol edin.")
    except requests.exceptions.Timeout:
        raise IdeaSoftError("IdeaSoft token isteği zaman aşımına uğradı.")

    if resp.status_code != 200:
        try:
            err = resp.json().get("error_description", resp.text[:300])
        except Exception:
            err = resp.text[:300]
        raise IdeaSoftError(f"Token alınamadı (HTTP {resp.status_code}): {err}")

    data = resp.json()
    access_token = data.get("access_token")
    expires_in = int(data.get("expires_in", 3600))

    if not access_token:
        raise IdeaSoftError("IdeaSoft'tan geçersiz token yanıtı alındı.")

    _TOKEN_CACHE[key] = {
        "access_token": access_token,
        "expires_at": time.time() + expires_in,
    }
    return access_token


def invalidate_token(api_url: str, client_id: str) -> None:
    """Önbellekten token'ı sil (401 sonrası yeniden deneme için)."""
    key = _cache_key(api_url, client_id)
    _TOKEN_CACHE.pop(key, None)


# ─── Yardımcı Request ────────────────────────────────────────────────────────

def _api_request(
    api_url: str,
    client_id: str,
    client_secret: str,
    endpoint: str,
    params: Optional[Dict] = None,
    method: str = "GET",
    body: Optional[Dict] = None,
    _retry: bool = True,
    meta_data_str: str = None,
) -> Any:
    """
    Authenticated IdeaSoft API isteği yapar.
    401 alırsa token'ı yeniler ve bir kez yeniden dener.
    """
    token = get_access_token(api_url, client_id, client_secret, meta_data_str=meta_data_str, force_refresh=(not _retry))
    url = api_url.rstrip("/") + IDEASOFT_API_BASE + endpoint
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    try:
        if method.upper() == "POST":
            resp = requests.post(url, json=body or {}, headers=headers, params=params, timeout=10)
        else:
            resp = requests.get(url, headers=headers, params=params, timeout=10)
    except requests.exceptions.ConnectionError:
        raise IdeaSoftError("IdeaSoft API'sine bağlanılamadı.")
    except requests.exceptions.Timeout:
        raise IdeaSoftError("IdeaSoft API isteği zaman aşımına uğradı.")

    if resp.status_code == 401 and _retry:
        # Token geçersiz, yenile ve tekrar dene
        invalidate_token(api_url, client_id)
        return _api_request(api_url, client_id, client_secret, endpoint, params, method, body, _retry=False, meta_data_str=meta_data_str)

    if not resp.ok:
        raise IdeaSoftError(f"IdeaSoft API hatası (HTTP {resp.status_code}): {resp.text[:300]}")

    try:
        return resp.json()
    except Exception:
        return resp.text


# ─── Ürün İşlemleri ──────────────────────────────────────────────────────────

def search_products(
    api_url: str,
    client_id: str,
    client_secret: str,
    query: str,
    limit: int = 5,
    meta_data_str: str = None,
) -> List[Dict]:
    """
    Ürün adına göre arama yapar.
    Dönen liste: [{"name", "price", "stock", "sku", "url", "category"}]        
    """
    params = {
        "name": query,
        "limit": limit,
        "status": 1,  # Aktif ürünler
    }
    try:
        data = _api_request(api_url, client_id, client_secret, "/products", params=params, meta_data_str=meta_data_str)
    except IdeaSoftError:
        raise

    products = data if isinstance(data, list) else data.get("data", data.get("products", []))

    results = []
    for p in products[:limit]:
        stock_qty = p.get("stockAmount", p.get("stock_amount", 0))
        price = p.get("price1", p.get("price", 0))
        try:
            price = float(price)
        except (TypeError, ValueError):
            price = 0.0

        results.append({
            "name": p.get("name", "Bilinmiyor"),
            "price": f"{price:.2f} TL",
            "stock": "Stokta Var" if stock_qty and int(stock_qty) > 0 else "Stokta Yok",
            "stock_qty": stock_qty,
            "sku": p.get("sku", p.get("stockCode", "")),
            "category": _extract_category(p),
            "url": _build_product_url(api_url, p),
        })

    return results


def get_product_by_sku(
    api_url: str,
    client_id: str,
    client_secret: str,
    sku: str,
    meta_data_str: str = None,
) -> Optional[Dict]:
    """SKU / stok koduna göre tek ürün getirir."""
    params = {"sku": sku, "limit": 1}
    try:
        data = _api_request(api_url, client_id, client_secret, "/products", params=params, meta_data_str=meta_data_str)
        products = data if isinstance(data, list) else data.get("data", [])
        if products:
            p = products[0]
            return {
                "name": p.get("name", ""),
                "price": p.get("price1", p.get("price", 0)),
                "stock": p.get("stockAmount", 0),
                "sku": p.get("sku", sku),
            }
    except IdeaSoftError:
        return None
    return None


def _extract_category(product: Dict) -> str:
    cats = product.get("categories", product.get("category", []))
    if isinstance(cats, list) and cats:
        first = cats[0]
        if isinstance(first, dict):
            return first.get("name", "")
        return str(first)
    if isinstance(cats, dict):
        return cats.get("name", "")
    return ""


def _build_product_url(api_url: str, product: Dict) -> str:
    slug = product.get("slug", product.get("url", ""))
    if slug and not slug.startswith("http"):
        base = api_url.rstrip("/").replace("/api/v2", "")
        return f"{base}/{slug}"
    return slug or ""


# ─── Sipariş İşlemleri ───────────────────────────────────────────────────────

_ORDER_STATUS_MAP = {
    0: "Beklemede",
    1: "Onaylandı",
    2: "Hazırlanıyor",
    3: "Kargoya Verildi",
    4: "Teslim Edildi",
    5: "İptal Edildi",
    6: "İade Edildi",
}


def get_recent_orders(
    api_url: str,
    client_id: str,
    client_secret: str,
    limit: int = 5,
    customer_email: Optional[str] = None,
    meta_data_str: str = None,
) -> List[Dict]:
    """Son siparişleri listeler, isteğe bağlı müşteri e-postasına göre filtreler."""
    params: Dict = {"limit": limit, "sort": "id", "direction": "DESC"}
    if customer_email:
        params["email"] = customer_email

    try:
        data = _api_request(api_url, client_id, client_secret, "/orders", params=params, meta_data_str=meta_data_str)
    except IdeaSoftError:
        raise

    orders = data if isinstance(data, list) else data.get("data", data.get("orders", []))

    results = []
    for o in orders[:limit]:
        status_code = o.get("status", o.get("orderStatus", 0))
        try:
            status_code = int(status_code)
        except (TypeError, ValueError):
            status_code = 0

        results.append({
            "order_no": o.get("orderNumber", o.get("id", "?")),
            "date": o.get("createdAt", o.get("created_at", ""))[:10] if o.get("createdAt") or o.get("created_at") else "",
            "status": _ORDER_STATUS_MAP.get(status_code, f"Durum:{status_code}"),
            "total": f"{float(o.get('totalPrice', o.get('total', 0))):.2f} TL",
            "customer": o.get("customerName", o.get("customer", {}).get("fullName", "")) if isinstance(o.get("customer"), dict) else o.get("customerName", ""),
            "cargo": o.get("cargoTrackingNumber", o.get("trackingNumber", "")),
        })

    return results


def get_order_by_number(
    api_url: str,
    client_id: str,
    client_secret: str,
    order_number: str,
    meta_data_str: str = None,
) -> Optional[Dict]:
    """Sipariş numarasına göre tek sipariş getirir."""
    try:
        data = _api_request(api_url, client_id, client_secret, f"/orders/{order_number}", meta_data_str=meta_data_str)
        if isinstance(data, dict):
            status_code = int(data.get("status", data.get("orderStatus", 0)))
            return {
                "order_no": data.get("orderNumber", order_number),
                "date": data.get("createdAt", "")[:10],
                "status": _ORDER_STATUS_MAP.get(status_code, f"Durum:{status_code}"),
                "total": f"{float(data.get('totalPrice', 0)):.2f} TL",
                "cargo": data.get("cargoTrackingNumber", ""),
                "items": [
                    {
                        "name": item.get("name", ""),
                        "qty": item.get("quantity", item.get("qty", 1)),
                        "price": item.get("price", 0),
                    }
                    for item in data.get("orderItems", data.get("items", []))
                ],
            }
    except Exception:
        return None
    return None


# ─── Kategori İşlemleri ──────────────────────────────────────────────────────

def list_categories(
    api_url: str,
    client_id: str,
    client_secret: str,
) -> List[Dict]:
    """Tüm aktif kategorileri listeler."""
    try:
        data = _api_request(api_url, client_id, client_secret, "/categories", params={"status": 1, "limit": 50})
        cats = data if isinstance(data, list) else data.get("data", [])
        return [
            {"id": c.get("id"), "name": c.get("name", ""), "slug": c.get("slug", "")}
            for c in cats
        ]
    except IdeaSoftError:
        return []


# ─── Bağlantı Testi ──────────────────────────────────────────────────────────

def test_connection(
    api_url: str,
    client_id: str,
    client_secret: str,
    meta_data_str: str = None,
) -> Dict[str, Any]:
    """
    Bağlantıyı doğrular. Token alır ve basit bir endpoint çağırır.
    Döner: {"success": bool, "message": str, "store_name": str, "product_count": int}
    """
    if not meta_data_str:
        return {
            "success": True,
            "message": "IdeaSoft OAuth yetkisi gerekiyor. Lütfen 'Entegrasyonu Kaydet' butonuna basarak IdeaSoft üzerinden onay verin.",
            "store_name": "",
            "product_count": 0,
        }
        
    try:
        # 1. Token al
        token = get_access_token(api_url, client_id, client_secret, meta_data_str=meta_data_str)

        # 2. Mağaza bilgisi çek (/settings veya /products ile sayım)
        store_name = ""
        product_count = 0

        try:
            settings = _api_request(api_url, client_id, client_secret, "/settings", meta_data_str=meta_data_str)
            if isinstance(settings, dict):
                store_name = (
                    settings.get("storeName")
                    or settings.get("name")
                    or settings.get("title", "")
                )
        except Exception:
            pass

        try:
            prod_data = _api_request(
                api_url, client_id, client_secret, "/products", params={"limit": 1}
            )
            # Bazı API'ler top-level liste, bazıları {"data": [...], "total": N}
            if isinstance(prod_data, list):
                product_count = len(prod_data)
            else:
                product_count = prod_data.get("total", prod_data.get("count", 0))
        except Exception:
            pass

        return {
            "success": True,
            "message": "Bağlantı başarılı! IdeaSoft mağazanıza erişim sağlandı.",
            "store_name": store_name or "IdeaSoft Mağaza",
            "product_count": product_count,
        }

    except IdeaSoftError as e:
        return {
            "success": False,
            "message": str(e),
            "store_name": "",
            "product_count": 0,
        }
    except Exception as e:
        logger.error(f"IdeaSoft test_connection unexpected error: {e}")
        return {
            "success": False,
            "message": f"Beklenmedik hata: {str(e)}",
            "store_name": "",
            "product_count": 0,
        }


# ─── Formatlama Yardımcıları ─────────────────────────────────────────────────

def format_products_for_chat(products: List[Dict]) -> str:
    """Ürün listesini chatbot için okunabilir metne çevirir."""
    if not products:
        return "Aradığınız kriterlere uygun ürün bulunamadı."

    lines = ["**Bulunan Ürünler:**\n"]
    for p in products:
        lines.append(f"- **{p['name']}**")
        lines.append(f"  - 💰 Fiyat: {p['price']}")
        lines.append(f"  - 📦 Stok: {p['stock']}")
        if p.get("sku"):
            lines.append(f"  - 🏷️ SKU: {p['sku']}")
        if p.get("category"):
            lines.append(f"  - 📂 Kategori: {p['category']}")
        if p.get("url"):
            lines.append(f"  - 🔗 [Ürün Sayfası]({p['url']})")
        lines.append("")

    return "\n".join(lines)


def format_orders_for_chat(orders: List[Dict]) -> str:
    """Sipariş listesini chatbot için okunabilir metne çevirir."""
    if not orders:
        return "Belirtilen kriterlere uygun sipariş bulunamadı."

    lines = ["**Siparişler:**\n"]
    for o in orders:
        lines.append(f"- **Sipariş #{o['order_no']}**")
        if o.get("date"):
            lines.append(f"  - 📅 Tarih: {o['date']}")
        lines.append(f"  - 🔄 Durum: {o['status']}")
        lines.append(f"  - 💰 Toplam: {o['total']}")
        if o.get("customer"):
            lines.append(f"  - 👤 Müşteri: {o['customer']}")
        if o.get("cargo"):
            lines.append(f"  - 🚚 Kargo Takip: {o['cargo']}")
        lines.append("")

    return "\n".join(lines)
