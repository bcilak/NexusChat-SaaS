"""
IdeaSoft OAuth2 + REST API Entegrasyon Servisi
----------------------------------------------
Bu modül IdeaSoft / IdeaShop için:
- Authorization URL oluşturur
- Callback'ten gelen authorization code ile token alır
- Refresh token ile access token yeniler
- Tokenları meta_data JSON içinde yönetir
- Ürün, sipariş, kategori ve bağlantı testi için yardımcı metodlar sağlar

Beklenen meta_data JSON yapısı örneği:
{
  "ideasoft_state": "...",
  "ideasoft_access_token": "...",
  "ideasoft_refresh_token": "...",
  "ideasoft_access_token_expires_at": 1712570000
}
"""

from __future__ import annotations

import json
import logging
import secrets
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

IDEASOFT_AUTH_ENDPOINT = "/panel/auth"
IDEASOFT_TOKEN_ENDPOINT = "/oauth/v2/token"
IDEASOFT_API_BASE = "/api"

REQUEST_TIMEOUT = 15
TOKEN_SAFETY_MARGIN_SECONDS = 30


class IdeaSoftError(Exception):
    """IdeaSoft API / OAuth genel hata sınıfı."""
    pass


class IdeaSoftAuthRequired(IdeaSoftError):
    """Kullanıcıdan yeniden OAuth yetkisi alınması gerektiğinde kullanılır."""
    pass


# Basit process içi cache
# key: (api_url, client_id)
# value: {"access_token": str, "expires_at": float}
_TOKEN_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}


# ─────────────────────────────────────────────────────────────
# Genel yardımcılar
# ─────────────────────────────────────────────────────────────

def _normalize_api_url(api_url: str) -> str:
    if not api_url:
        raise IdeaSoftError("IdeaSoft mağaza URL'si boş olamaz.")
    return api_url.rstrip("/")


def _cache_key(api_url: str, client_id: str) -> Tuple[str, str]:
    return (_normalize_api_url(api_url), client_id)


def _now() -> int:
    return int(time.time())


def _is_expired(expires_at: Optional[int], safety_margin: int = TOKEN_SAFETY_MARGIN_SECONDS) -> bool:
    if not expires_at:
        return True
    return _now() >= int(expires_at) - safety_margin


def _parse_meta(meta_data_str: Optional[str]) -> Dict[str, Any]:
    if not meta_data_str:
        return {}
    try:
        data = json.loads(meta_data_str)
        return data if isinstance(data, dict) else {}
    except Exception:
        logger.warning("meta_data_str parse edilemedi.")
        return {}


def _dump_meta(meta: Dict[str, Any]) -> str:
    return json.dumps(meta, ensure_ascii=False)


def _store_tokens_in_meta(meta: Dict[str, Any], token_response: Dict[str, Any]) -> Dict[str, Any]:
    access_token = token_response.get("access_token")
    refresh_token = token_response.get("refresh_token")
    expires_in = int(token_response.get("expires_in", 86400))

    if not access_token:
        raise IdeaSoftError("Token yanıtında access_token bulunamadı.")

    meta["ideasoft_access_token"] = access_token
    meta["ideasoft_access_token_expires_at"] = _now() + expires_in

    if refresh_token:
        meta["ideasoft_refresh_token"] = refresh_token

    return meta


def _update_cache(api_url: str, client_id: str, access_token: str, expires_at: int) -> None:
    _TOKEN_CACHE[_cache_key(api_url, client_id)] = {
        "access_token": access_token,
        "expires_at": expires_at,
    }


def invalidate_token(api_url: str, client_id: str) -> None:
    _TOKEN_CACHE.pop(_cache_key(api_url, client_id), None)


# ─────────────────────────────────────────────────────────────
# OAuth başlangıç akışı
# ─────────────────────────────────────────────────────────────

def build_authorization_url(
    api_url: str,
    client_id: str,
    redirect_uri: str,
    meta_data_str: Optional[str] = None,
    state: Optional[str] = None,
) -> Dict[str, str]:
    api_url = _normalize_api_url(api_url)
    meta = _parse_meta(meta_data_str)

    generated_state = state or secrets.token_urlsafe(24)
    meta["ideasoft_state"] = generated_state

    query = urlencode({
        "client_id": client_id,
        "response_type": "code",
        "state": generated_state,
        "redirect_uri": redirect_uri,
    })

    return {
        "authorization_url": f"{api_url}{IDEASOFT_AUTH_ENDPOINT}?{query}",
        "state": generated_state,
        "updated_meta_data_str": _dump_meta(meta),
    }


def exchange_code_for_token(
    api_url: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    code: str,
    returned_state: str,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    api_url = _normalize_api_url(api_url)
    meta = _parse_meta(meta_data_str)

    expected_state = meta.get("ideasoft_state")
    if not expected_state:
        raise IdeaSoftAuthRequired("OAuth state bulunamadı. Yetkilendirmeyi yeniden başlatın.")

    if returned_state != expected_state:
        raise IdeaSoftAuthRequired("OAuth state doğrulaması başarısız. Yetkilendirmeyi yeniden başlatın.")

    token_url = f"{api_url}{IDEASOFT_TOKEN_ENDPOINT}"
    payload = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
    }

    try:
        resp = requests.post(token_url, data=payload, timeout=REQUEST_TIMEOUT)
    except requests.exceptions.ConnectionError:
        raise IdeaSoftError("IdeaSoft token sunucusuna bağlanılamadı.")
    except requests.exceptions.Timeout:
        raise IdeaSoftError("IdeaSoft token isteği zaman aşımına uğradı.")

    if resp.status_code != 200:
        try:
            err_json = resp.json()
            err = err_json.get("error_description") or err_json.get("error") or resp.text[:500]
        except Exception:
            err = resp.text[:500]
        raise IdeaSoftError(f"Authorization code token'a çevrilemedi (HTTP {resp.status_code}): {err}")

    data = resp.json()
    meta = _store_tokens_in_meta(meta, data)

    meta.pop("ideasoft_state", None)

    access_token = meta["ideasoft_access_token"]
    expires_at = int(meta["ideasoft_access_token_expires_at"])
    _update_cache(api_url, client_id, access_token, expires_at)

    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "expires_in": int(data.get("expires_in", 86400)),
        "updated_meta_data_str": _dump_meta(meta),
    }


def refresh_access_token(
    api_url: str,
    client_id: str,
    client_secret: str,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    api_url = _normalize_api_url(api_url)
    meta = _parse_meta(meta_data_str)
    refresh_token = meta.get("ideasoft_refresh_token")

    if not refresh_token:
        raise IdeaSoftAuthRequired(
            "IdeaSoft refresh token bulunamadı. Lütfen entegrasyonu yeniden yetkilendirin."
        )

    token_url = f"{api_url}{IDEASOFT_TOKEN_ENDPOINT}"
    payload = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
    }

    try:
        resp = requests.post(token_url, data=payload, timeout=REQUEST_TIMEOUT)
    except requests.exceptions.ConnectionError:
        raise IdeaSoftError("IdeaSoft token sunucusuna bağlanılamadı.")
    except requests.exceptions.Timeout:
        raise IdeaSoftError("IdeaSoft refresh token isteği zaman aşımına uğradı.")

    if resp.status_code != 200:
        try:
            err_json = resp.json()
            err = err_json.get("error_description") or err_json.get("error") or resp.text[:500]
        except Exception:
            err = resp.text[:500]

        raise IdeaSoftAuthRequired(
            f"Refresh token ile yeni access token alınamadı (HTTP {resp.status_code}): {err}"
        )

    data = resp.json()
    meta = _store_tokens_in_meta(meta, data)

    access_token = meta["ideasoft_access_token"]
    expires_at = int(meta["ideasoft_access_token_expires_at"])
    _update_cache(api_url, client_id, access_token, expires_at)

    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "expires_in": int(data.get("expires_in", 86400)),
        "updated_meta_data_str": _dump_meta(meta),
    }


def get_valid_access_token(
    api_url: str,
    client_id: str,
    client_secret: str,
    meta_data_str: Optional[str] = None,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    api_url = _normalize_api_url(api_url)
    meta = _parse_meta(meta_data_str)

    key = _cache_key(api_url, client_id)
    cached = _TOKEN_CACHE.get(key)

    if not force_refresh and cached and not _is_expired(cached.get("expires_at")):
        return {
            "access_token": cached["access_token"],
            "updated_meta_data_str": _dump_meta(meta),
        }

    access_token = meta.get("ideasoft_access_token")
    expires_at = meta.get("ideasoft_access_token_expires_at")

    if not force_refresh and access_token and not _is_expired(expires_at):
        _update_cache(api_url, client_id, access_token, int(expires_at))
        return {
            "access_token": access_token,
            "updated_meta_data_str": _dump_meta(meta),
        }

    refreshed = refresh_access_token(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        meta_data_str=_dump_meta(meta),
    )
    refreshed_meta = _parse_meta(refreshed["updated_meta_data_str"])
    return {
        "access_token": refreshed_meta["ideasoft_access_token"],
        "updated_meta_data_str": refreshed["updated_meta_data_str"],
    }


# ─────────────────────────────────────────────────────────────
# Authenticated request
# ─────────────────────────────────────────────────────────────

def _api_request(
    api_url: str,
    client_id: str,
    client_secret: str,
    endpoint: str,
    method: str = "GET",
    params: Optional[Dict[str, Any]] = None,
    body: Optional[Dict[str, Any]] = None,
    meta_data_str: Optional[str] = None,
    _retry: bool = True,
) -> Dict[str, Any]:
    token_result = get_valid_access_token(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        meta_data_str=meta_data_str,
        force_refresh=not _retry,
    )

    access_token = token_result["access_token"]
    current_meta_data_str = token_result["updated_meta_data_str"]

    url = f"{_normalize_api_url(api_url)}{IDEASOFT_API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    try:
        if method.upper() == "POST":
            resp = requests.post(url, headers=headers, params=params, json=body or {}, timeout=REQUEST_TIMEOUT)
        elif method.upper() == "PUT":
            resp = requests.put(url, headers=headers, params=params, json=body or {}, timeout=REQUEST_TIMEOUT)
        elif method.upper() == "DELETE":
            resp = requests.delete(url, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
        else:
            resp = requests.get(url, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
    except requests.exceptions.ConnectionError:
        raise IdeaSoftError("IdeaSoft API sunucusuna bağlanılamadı.")
    except requests.exceptions.Timeout:
        raise IdeaSoftError("IdeaSoft API isteği zaman aşımına uğradı.")

    if resp.status_code == 401 and _retry:
        invalidate_token(api_url, client_id)
        return _api_request(
            api_url=api_url,
            client_id=client_id,
            client_secret=client_secret,
            endpoint=endpoint,
            method=method,
            params=params,
            body=body,
            meta_data_str=current_meta_data_str,
            _retry=False,
        )

    if not resp.ok:
        try:
            err_json = resp.json()
            err_text = err_json if isinstance(err_json, dict) else {"response": err_json}
        except Exception:
            err_text = resp.text[:500]
        raise IdeaSoftError(f"IdeaSoft API hatası (HTTP {resp.status_code}): {err_text}")

    try:
        data = resp.json()
    except Exception:
        data = resp.text

    return {
        "data": data,
        "updated_meta_data_str": current_meta_data_str,
    }


# ─────────────────────────────────────────────────────────────
# Veri normalize yardımcıları
# ─────────────────────────────────────────────────────────────

def _extract_items_from_response(data: Any, fallback_keys: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        if "data" in data and isinstance(data["data"], list):
            return data["data"]
        if fallback_keys:
            for key in fallback_keys:
                value = data.get(key)
                if isinstance(value, list):
                    return value

    return []

def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default

def _extract_category(product: Dict[str, Any]) -> str:
    cats = product.get("categories", product.get("category", []))
    if isinstance(cats, list) and cats:
        first = cats[0]
        if isinstance(first, dict):
            return first.get("name", "")
        return str(first)
    if isinstance(cats, dict):
        return cats.get("name", "")
    return ""

def _build_product_url(api_url: str, product: Dict[str, Any]) -> str:
    direct_url = product.get("url")
    if isinstance(direct_url, str) and direct_url.startswith("http"):
        return direct_url
    slug = product.get("slug") or product.get("sefLink") or product.get("sef_link") or ""
    if slug:
        return f"{_normalize_api_url(api_url)}/{str(slug).lstrip('/')}"
    return ""


# ─────────────────────────────────────────────────────────────
# Ürün işlemleri
# ─────────────────────────────────────────────────────────────

def search_products(
    api_url: str,
    client_id: str,
    client_secret: str,
    query: str,
    limit: int = 10,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    params = {
        "q": query,
        "limit": limit,
    }

    result = _api_request(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        endpoint="/products",
        params=params,
        meta_data_str=meta_data_str,
    )

    raw = result["data"]
    products = _extract_items_from_response(raw, fallback_keys=["products"])
    mapped: List[Dict[str, Any]] = []

    for p in products[:limit]:
        stock_qty = _safe_int(p.get("stockAmount", p.get("stock_amount", p.get("stock", 0))), default=0)
        price = _safe_float(p.get("price1", p.get("price", 0)), default=0.0)

        mapped.append({
            "id": p.get("id"),
            "name": p.get("name", "Bilinmiyor"),
            "price": f"{price:.2f} TL",
            "price_value": price,
            "stock": "Stokta Var" if stock_qty > 0 else "Stokta Yok",
            "stock_qty": stock_qty,
            "sku": p.get("sku", p.get("stockCode", p.get("stock_code", ""))),
            "category": _extract_category(p),
            "url": _build_product_url(api_url, p),
            "raw": p,
        })

    return {
        "products": mapped,
        "updated_meta_data_str": result["updated_meta_data_str"],
    }


def get_product_by_sku(
    api_url: str,
    client_id: str,
    client_secret: str,
    sku: str,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    params = {"sku": sku, "limit": 1}

    result = _api_request(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        endpoint="/products",
        params=params,
        meta_data_str=meta_data_str,
    )

    raw = result["data"]
    products = _extract_items_from_response(raw, fallback_keys=["products"])

    if not products:
        return {
            "product": None,
            "updated_meta_data_str": result["updated_meta_data_str"],
        }

    p = products[0]
    stock_qty = _safe_int(p.get("stockAmount", p.get("stock_amount", p.get("stock", 0))), default=0)
    price = _safe_float(p.get("price1", p.get("price", 0)), default=0.0)

    product = {
        "id": p.get("id"),
        "name": p.get("name", "Bilinmiyor"),
        "price": f"{price:.2f} TL",
        "price_value": price,
        "stock": "Stokta Var" if stock_qty > 0 else "Stokta Yok",
        "stock_qty": stock_qty,
        "sku": p.get("sku", p.get("stockCode", p.get("stock_code", sku))),
        "category": _extract_category(p),
        "url": _build_product_url(api_url, p),
        "raw": p,
    }

    return {
        "product": product,
        "updated_meta_data_str": result["updated_meta_data_str"],
    }


# ─────────────────────────────────────────────────────────────
# Sipariş işlemleri
# ─────────────────────────────────────────────────────────────

_ORDER_STATUS_MAP = {
    0: "Beklemede",
    1: "Onaylandı",
    2: "Hazırlanıyor",
    3: "Kargoya Verildi",
    4: "Teslim Edildi",
    5: "İptal Edildi",
    6: "İade Edildi",
    "deleted": "Silindi",
    "waiting_for_approval": "Onay Bekliyor",
    "approved": "Onaylandı",
    "fulfilled": "Kargoya Verildi",
    "cancelled": "İptal Edildi",
    "delivered": "Teslim Edildi",
    "on_accumulation": "Hazırlanıyor / Toplanıyor",
    "waiting_for_payment": "Ödeme Bekliyor",
    "being_prepared": "Hazırlanıyor",
    "refunded": "İade Edildi",
    "personal_status_1": "Özel Durum 1",
    "personal_status_2": "Özel Durum 2",
    "personal_status_3": "Özel Durum 3",
}


def get_recent_orders(
    api_url: str,
    client_id: str,
    client_secret: str,
    limit: int = 5,
    customer_email: Optional[str] = None,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "limit": limit,
        "sort": "id",
        "direction": "DESC",
    }
    if customer_email:
        params["email"] = customer_email

    result = _api_request(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        endpoint="/orders",
        params=params,
        meta_data_str=meta_data_str,
    )

    raw = result["data"]
    orders = _extract_items_from_response(raw, fallback_keys=["orders"])
    mapped: List[Dict[str, Any]] = []

    for o in orders[:limit]:
        status_raw = o.get("status", o.get("orderStatus", 0))
        total = _safe_float(o.get("finalAmount", o.get("amount", o.get("totalPrice", o.get("total", 0)))), default=0.0)

        customer_name = ""
        fname = o.get("customerFirstname", "")
        sname = o.get("customerSurname", "")
        if fname or sname:
            customer_name = f"{fname} {sname}".strip()
        else:
            customer_obj = o.get("customer")
            if isinstance(customer_obj, dict):
                customer_name = customer_obj.get("fullName", "") or customer_obj.get("name", "")
            if not customer_name:
                customer_name = o.get("customerName", "")

        created_raw = o.get("createdAt", o.get("created_at", ""))

        mapped.append({
            "order_no": o.get("id", "?"),
            "date": str(created_raw)[:10] if created_raw else "",
            "status_code": status_raw,
            "status": _ORDER_STATUS_MAP.get(status_raw, f"Durum:{status_raw}"),
            "total": f"{total:.2f} TL",
            "total_value": total,
            "customer": customer_name,
            "cargo_tracking_no": o.get("shippingTrackingCode", o.get("cargoTrackingNumber", o.get("trackingNumber", ""))),
            "raw": o,
        })

    return {
        "orders": mapped,
        "updated_meta_data_str": result["updated_meta_data_str"],
    }


def get_order_by_number(
    api_url: str,
    client_id: str,
    client_secret: str,
    order_number: str,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    result = _api_request(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        endpoint=f"/orders/{order_number}",
        meta_data_str=meta_data_str,
    )

    data = result["data"]
    if not isinstance(data, dict):
        return {
            "order": None,
            "updated_meta_data_str": result["updated_meta_data_str"],
        }

    status_raw = data.get("status", data.get("orderStatus", 0))
    total = _safe_float(data.get("finalAmount", data.get("amount", data.get("totalPrice", data.get("total", 0)))), default=0.0)
    created_raw = data.get("createdAt", data.get("created_at", ""))

    raw_items = data.get("orderItems", data.get("items", []))
    items: List[Dict[str, Any]] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            items.append({
                "name": item.get("productName", item.get("name", "")),
                "qty": _safe_int(item.get("productQuantity", item.get("quantity", item.get("qty", 1))), default=1),
                "price": _safe_float(item.get("productPrice", item.get("price", 0)), default=0.0),
                "raw": item,
            })

    customer_name = ""
    fname = data.get("customerFirstname", "")
    sname = data.get("customerSurname", "")
    if fname or sname:
        customer_name = f"{fname} {sname}".strip()

    order = {
        "order_no": data.get("id"),
        "date": str(created_raw)[:10] if created_raw else "",
        "status_code": status_raw,
        "status": _ORDER_STATUS_MAP.get(status_raw, f"Durum:{status_raw}"),
        "total": f"{total:.2f} TL",
        "total_value": total,
        "customer": customer_name or data.get("customerName", "Bilinmiyor"),
        "cargo_tracking_no": data.get("shippingTrackingCode", data.get("cargoTrackingNumber", data.get("trackingNumber", ""))),
        "items": items,
        "raw": data,
    }

    return {
        "order": order,
        "updated_meta_data_str": result["updated_meta_data_str"],
    }


# ─────────────────────────────────────────────────────────────
# Kategori işlemleri
# ─────────────────────────────────────────────────────────────

def list_categories(
    api_url: str,
    client_id: str,
    client_secret: str,
    limit: int = 100,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    result = _api_request(
        api_url=api_url,
        client_id=client_id,
        client_secret=client_secret,
        endpoint="/categories",
        params={"status": 1, "limit": limit},
        meta_data_str=meta_data_str,
    )

    raw = result["data"]
    categories = _extract_items_from_response(raw, fallback_keys=["categories"])
    mapped = [
        {
            "id": c.get("id"),
            "name": c.get("name", ""),
            "slug": c.get("slug", ""),
            "raw": c,
        }
        for c in categories
    ]

    return {
        "categories": mapped,
        "updated_meta_data_str": result["updated_meta_data_str"],
    }


# ─────────────────────────────────────────────────────────────
# Bağlantı testi
# ─────────────────────────────────────────────────────────────

def test_connection(
    api_url: str,
    client_id: str,
    client_secret: str,
    meta_data_str: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        token_result = get_valid_access_token(
            api_url=api_url,
            client_id=client_id,
            client_secret=client_secret,
            meta_data_str=meta_data_str,
        )
        current_meta = token_result["updated_meta_data_str"]

        store_name = ""
        product_count = 0

        try:
            settings_result = _api_request(
                api_url=api_url,
                client_id=client_id,
                client_secret=client_secret,
                endpoint="/settings",
                meta_data_str=current_meta,
            )
            current_meta = settings_result["updated_meta_data_str"]
            settings = settings_result["data"]

            if isinstance(settings, dict):
                store_name = (
                    settings.get("storeName")
                    or settings.get("name")
                    or settings.get("title")
                    or ""
                )
        except Exception as e:
            logger.info("settings endpoint okunamadı: %s", e)

        try:
            products_result = _api_request(
                api_url=api_url,
                client_id=client_id,
                client_secret=client_secret,
                endpoint="/products",
                params={"limit": 1},
                meta_data_str=current_meta,
            )
            current_meta = products_result["updated_meta_data_str"]
            prod_data = products_result["data"]

            if isinstance(prod_data, dict):
                product_count = _safe_int(
                    prod_data.get("total", prod_data.get("count", 0)),
                    default=0,
                )
            elif isinstance(prod_data, list):
                product_count = len(prod_data)
        except Exception as e:
            logger.info("products endpoint okunamadı: %s", e)

        return {
            "success": True,
            "message": "Bağlantı başarılı. IdeaSoft mağazasına erişim sağlandı.",
            "store_name": store_name or "IdeaSoft Mağaza",
            "product_count": product_count,
            "updated_meta_data_str": current_meta,
        }

    except IdeaSoftAuthRequired as e:
        return {
            "success": False,
            "message": str(e),
            "store_name": "",
            "product_count": 0,
            "updated_meta_data_str": meta_data_str or "{}",
        }
    except IdeaSoftError as e:
        return {
            "success": False,
            "message": str(e),
            "store_name": "",
            "product_count": 0,
            "updated_meta_data_str": meta_data_str or "{}",
        }
    except Exception as e:
        logger.exception("test_connection beklenmedik hata")
        return {
            "success": False,
            "message": f"Beklenmedik hata: {e}",
            "store_name": "",
            "product_count": 0,
            "updated_meta_data_str": meta_data_str or "{}",
        }


# ─────────────────────────────────────────────────────────────
# Chat format yardımcıları
# ─────────────────────────────────────────────────────────────

def format_products_for_chat(products: List[Dict[str, Any]]) -> str:
    if not products:
        return "Aradığınız kriterlere uygun ürün bulunamadı."

    lines = ["**Bulunan Ürünler:**", ""]
    for p in products:
        lines.append(f"- **{p['name']}**")
        lines.append(f"  - 💰 Fiyat: {p['price']}")
        lines.append(f"  - 📦 Stok: {p['stock']}")
        if p.get("sku"):
            lines.append(f"  - 🏷️ SKU: {p['sku']}")
        if p.get("category"):
            lines.append(f"  - 📂 Kategori: {p['category']}")
        if p.get("url"):
            lines.append(f"  - 🔗 Ürün Linki: {p['url']}")
        lines.append("")
    return "\n".join(lines).strip()


def format_orders_for_chat(orders: List[Dict[str, Any]]) -> str:
    if not orders:
        return "Belirtilen kriterlere uygun sipariş bulunamadı."

    lines = ["**Siparişler:**", ""]
    for o in orders:
        lines.append(f"- **Sipariş #{o['order_no']}**")
        if o.get("date"):
            lines.append(f"  - 📅 Tarih: {o['date']}")
        lines.append(f"  - 🔄 Durum: {o['status']}")
        lines.append(f"  - 💰 Toplam: {o['total']}")
        if o.get("customer"):
            lines.append(f"  - 👤 Müşteri: {o['customer']}")
        if o.get("cargo_tracking_no"):
            lines.append(f"  - 🚚 Kargo Takip: {o['cargo_tracking_no']}")
        lines.append("")
    return "\n".join(lines).strip()
