import json
import requests as http_requests
from typing import Type, Any, Optional
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from services.ideasoft import (
    search_products as ideasoft_search_products,
    get_recent_orders as ideasoft_get_orders,
    get_order_by_number as ideasoft_get_order_by_number,
    format_products_for_chat,
    format_orders_for_chat,
    IdeaSoftError,
)


# ─────────────────────────── E-Commerce Tool (mevcut) ───────────────────────────

class ECommerceProductSearchInput(BaseModel):
    query: str = Field(description="Arama yapılacak ürün adı veya anahtar kelime")

class ECommerceProductSearchTool(BaseTool):
    name: str = "ecommerce_product_search"
    description: str = "Mağazada verilen anahtar kelimeye göre ürün fiyat, stok ve özelliklerini canlı arar."
    args_schema: Type[BaseModel] = ECommerceProductSearchInput
    
    api_url: str = ""
    api_key: str = ""
    api_secret: str = ""
    provider: str = ""
    meta_data_str: str = ""
    
    def _run(self, query: str) -> str:
        # ── WooCommerce ───────────────────────────────────────────────────────
        if self.provider == "woocommerce":
            endpoint = f"{self.api_url.rstrip('/')}/wp-json/wc/v3/products"
            params = {
                "search": query,
                "consumer_key": self.api_key,
                "consumer_secret": self.api_secret,
                "per_page": 5,
            }
            try:
                res = http_requests.get(endpoint, params=params, timeout=8)
                if res.status_code == 200:
                    products = res.json()
                    if not products:
                        return f"'{query}' ile eşleşen ürün bulunamadı."
                    lines = ["**Bulunan Ürünler:**\n"]
                    for p in products:
                        stock = "Stokta Var" if p.get("in_stock") else "Stokta Yok"
                        price = p.get('price', '?')
                        lines.append(f"- **{p.get('name')}**")
                        lines.append(f"  - 💰 Fiyat: {price} TL")
                        lines.append(f"  - 📦 Stok: {stock}")
                        lines.append("")
                    return "\n".join(lines)
                return f"Mağaza API'sinden hata alındı (HTTP {res.status_code})."
            except Exception as e:
                return f"WooCommerce bağlantı hatası: {str(e)}"

        # ── IdeaSoft ─────────────────────────────────────────────────────────
        elif self.provider == "ideasoft":
            try:
                res = ideasoft_search_products(
                    api_url=self.api_url,
                    client_id=self.api_key,
                    client_secret=self.api_secret,
                    query=query,
                    limit=5,
                    meta_data_str=self.meta_data_str,
                )
                products = res.get("products", [])
                return format_products_for_chat(products)
            except IdeaSoftError as e:
                return f"IdeaSoft ürün arama hatası: {str(e)}"
            except Exception as e:
                return f"Beklenmedik hata: {str(e)}"

        # ── Ticimax ──────────────────────────────────────────────────────────
        elif self.provider == "ticimax":
            try:
                endpoint = f"{self.api_url.rstrip('/')}/api/Product/GetProducts"
                headers = {"Authorization": f"Bearer {self.api_key}"}
                params = {"search": query, "pageSize": 5}
                res = http_requests.get(endpoint, headers=headers, params=params, timeout=8)
                if res.ok:
                    data = res.json()
                    products = data.get("Data", data) if isinstance(data, dict) else data
                    if not products:
                        return f"'{query}' ile eşleşen ürün bulunamadı."
                    lines = ["**Bulunan Ürünler:**\n"]
                    for p in (products if isinstance(products, list) else [])[:5]:
                        price = p.get("Price", p.get("price", "?"))
                        stock = "Stokta Var" if p.get("StockQuantity", p.get("stockQuantity", 0)) > 0 else "Stokta Yok"
                        lines.append(f"- **{p.get('Name', p.get('name', 'Ürün'))}**")
                        lines.append(f"  - 💰 Fiyat: {price} TL")
                        lines.append(f"  - 📦 Stok: {stock}")
                        lines.append("")
                    return "\n".join(lines)
                return f"Ticimax API hatası (HTTP {res.status_code})"
            except Exception as e:
                return f"Ticimax bağlantı hatası: {str(e)}"

        # ── Shopify ───────────────────────────────────────────────────────────
        elif self.provider == "shopify":
            try:
                shop = self.api_url.rstrip("/")
                endpoint = f"{shop}/admin/api/2024-01/products.json"
                headers = {"X-Shopify-Access-Token": self.api_key}
                params = {"title": query, "limit": 5}
                res = http_requests.get(endpoint, headers=headers, params=params, timeout=8)
                if res.ok:
                    products = res.json().get("products", [])
                    if not products:
                        return f"'{query}' ile eşleşen ürün bulunamadı."
                    lines = ["**Bulunan Ürünler:**\n"]
                    for p in products:
                        variant = p.get("variants", [{}])[0]
                        price = variant.get("price", "?")
                        stock = "Stokta Var" if variant.get("inventory_quantity", 0) > 0 else "Stokta Yok"
                        lines.append(f"- **{p.get('title')}**")
                        lines.append(f"  - 💰 Fiyat: {price} TL")
                        lines.append(f"  - 📦 Stok: {stock}")
                        lines.append("")
                    return "\n".join(lines)
                return f"Shopify API hatası (HTTP {res.status_code})"
            except Exception as e:
                return f"Shopify bağlantı hatası: {str(e)}"

        else:
            return f"'{self.provider}' altyapısı desteklenmiyor. Desteklenen: woocommerce, ideasoft, ticimax, shopify."


# ─────────────────────────── IdeaSoft Sipariş Sorgulama Tool ────────────────

class IdeaSoftOrderInput(BaseModel):
    query: str = Field(description="Sipariş numarası, müşteri adı veya 'son siparişler' gibi sorgular")


class IdeaSoftOrderSearchTool(BaseTool):
    name: str = "ideasoft_order_search"
    description: str = (
        "IdeaSoft mağazasında sipariş sorgular. "
        "Sipariş numarası veya 'son siparişler' komutuyla kullanılabilir. "
        "Sipariş durumu, kargo takibi ve sipariş detaylarını döndürür."
    )
    args_schema: Type[BaseModel] = IdeaSoftOrderInput

    api_url: str = ""
    api_key: str = ""       # client_id
    api_secret: str = ""    # client_secret
    meta_data_str: str = ""

    def _run(self, query: str) -> str:
        try:
            # Sipariş numarası mı yoksa genel sorgu mu?
            query_stripped = query.strip()
            # Eğer sadece rakam içeriyorsa sipariş numarası kabul et
            if query_stripped.isdigit() or (query_stripped.startswith("#") and query_stripped[1:].isdigit()):
                order_no = query_stripped.lstrip("#")
                res = ideasoft_get_order_by_number(
                    api_url=self.api_url,
                    client_id=self.api_key,
                    client_secret=self.api_secret,
                    order_number=order_no,
                    meta_data_str=self.meta_data_str,
                )
                order = res.get("order")
                if order:
                    lines = [f"**Sipariş #{order['order_no']} Detayları:**\n"]
                    if order.get("date"):
                        lines.append(f"- 📅 Tarih: {order['date']}")
                    lines.append(f"- 🔄 Durum: {order['status']}")
                    lines.append(f"- 💰 Toplam: {order['total']}")
                    if order.get("cargo_tracking_no"):
                        lines.append(f"- 🚚 Kargo Takip No: {order['cargo_tracking_no']}")
                    if order.get("items"):
                        lines.append("\n**Ürünler:**")
                        for item in order["items"]:
                            lines.append(f"  - {item['name']} × {item['qty']} adet")
                    return "\n".join(lines)
                return f"#{order_no} numaralı sipariş bulunamadı."
            else:
                # Genel sorgu — son siparişleri listele
                res = ideasoft_get_orders(
                    api_url=self.api_url,
                    client_id=self.api_key,
                    client_secret=self.api_secret,
                    limit=5,
                    meta_data_str=self.meta_data_str,
                )
                orders = res.get("orders", [])
                return format_orders_for_chat(orders)
        except IdeaSoftError as e:
            return f"IdeaSoft sipariş sorgulama hatası: {str(e)}"
        except Exception as e:
            return f"Beklenmedik hata: {str(e)}"


# ─────────────────────────── E-Commerce Tool Builder ────────────────────────

def build_ecommerce_tools(bot_id: int, db) -> list:
    """
    DB'deki aktif BotIntegration kayıtlarından e-ticaret araçları oluşturur.
    Her entegrasyon için uygun LangChain tool listesini döndürür.
    """
    from models.bot_integration import BotIntegration

    integrations = db.query(BotIntegration).filter(
        BotIntegration.bot_id == bot_id,
        BotIntegration.is_active == True,
    ).all()

    tools = []
    for intg in integrations:
        if intg.provider in ("woocommerce", "shopify", "ticimax", "ideasoft"):
            # Ürün arama tüm sağlayıcılarda
            tools.append(ECommerceProductSearchTool(
                api_url=intg.api_url,
                api_key=intg.api_key,
                api_secret=intg.api_secret or "",
                provider=intg.provider,
                meta_data_str=intg.meta_data or "",
            ))
            # Sipariş sorgulama sadece IdeaSoft'ta (diğerleri için ayrı tool eklenebilir)
            if intg.provider == "ideasoft":
                tools.append(IdeaSoftOrderSearchTool(
                    api_url=intg.api_url,
                    api_key=intg.api_key,
                    api_secret=intg.api_secret or "",
                    meta_data_str=intg.meta_data or "",
                ))
    return tools


# ─────────────────────────── Dynamic API Tool (yeni) ───────────────────────────

class DynamicApiInput(BaseModel):
    query: str = Field(description="Kullanıcının sorduğu konu veya anahtar kelime")


def _get_nested(data: Any, path: str) -> Any:
    """Dot-notation ile JSON'dan değer okur. Örn: 'main.temp', 'weather.0.description'"""
    parts = path.strip().split(".")
    cur = data
    for part in parts:
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


class DynamicApiTool(BaseTool):
    """
    Kullanıcının dashboard'dan tanımladığı API yapılandırmasını çalıştırır.
    {query} placeholder'ı otomatik olarak kullanıcı sorgusuna göre doldurulur.
    """
    name: str
    description: str
    args_schema: Type[BaseModel] = DynamicApiInput

    # Yapılandırma — DB'den gelir
    api_url: str = ""
    method: str = "GET"
    headers_json: str = "{}"
    params_json: str = "{}"
    body_template: str = ""
    response_path: str = ""        # virgülle ayrılmış, ör: "main.temp,weather.0.description"
    response_template: str = ""   # ör: "Sıcaklık: {main.temp}°C, Durum: {weather.0.description}"

    def _run(self, query: str) -> str:
        try:
            url = self.api_url.replace("{query}", query)

            try:
                headers = json.loads(self.headers_json or "{}")
            except Exception:
                headers = {}

            try:
                raw_params = json.loads(self.params_json or "{}")
                params = {k: str(v).replace("{query}", query) for k, v in raw_params.items()}
            except Exception:
                params = {}

            if self.method.upper() == "POST":
                body_str = (self.body_template or "{}").replace("{query}", query)
                try:
                    body = json.loads(body_str)
                except Exception:
                    body = {}
                resp = http_requests.post(url, json=body, headers=headers, timeout=10)
            else:
                resp = http_requests.get(url, params=params, headers=headers, timeout=10)

            if not resp.ok:
                return f"API isteği başarısız oldu. HTTP {resp.status_code}: {resp.text[:200]}"

            try:
                data = resp.json()
            except Exception:
                return f"API yanıtı: {resp.text[:500]}"

            # Yanıttan belirtilen alanları çıkar
            extracted: dict[str, Any] = {}
            if self.response_path:
                for path in self.response_path.split(","):
                    path = path.strip()
                    if path:
                        extracted[path] = _get_nested(data, path)

            # Şablon varsa uygula
            if self.response_template and extracted:
                result = self.response_template
                for path, value in extracted.items():
                    result = result.replace("{" + path + "}", str(value) if value is not None else "N/A")
                return result

            # Şablon yoksa ham çıkarılan değerleri döndür
            if extracted:
                parts = [f"{k}: {v}" for k, v in extracted.items() if v is not None]
                return " | ".join(parts) if parts else str(data)

            # Hiçbir path belirtilmemişse ham JSON özeti
            return json.dumps(data, ensure_ascii=False)[:800]

        except http_requests.exceptions.Timeout:
            return "API isteği zaman aşımına uğradı. Lütfen sonra tekrar deneyin."
        except http_requests.exceptions.ConnectionError:
            return "API adresine bağlanılamadı. İnternet bağlantısını veya URL'yi kontrol edin."
        except Exception as e:
            return f"Araç çalışırken bir hata oluştu: {str(e)}"


def build_dynamic_tools_from_db(bot_id: int, db) -> list:
    """DB'deki aktif BotTool kayıtlarından DynamicApiTool listesi oluşturur."""
    from models.bot_tool import BotTool
    
    db_tools = db.query(BotTool).filter(
        BotTool.bot_id == bot_id,
        BotTool.is_active == True
    ).all()

    tools = []
    for t in db_tools:
        # LangChain tool name: sadece harf, rakam ve alt çizgi içermeli
        safe_name = "".join(c if c.isalnum() or c == "_" else "_" for c in t.name).strip("_") or f"tool_{t.id}"
        tools.append(DynamicApiTool(
            name=safe_name,
            description=t.description,
            api_url=t.api_url,
            method=t.method or "GET",
            headers_json=t.headers or "{}",
            params_json=t.query_params or "{}",
            body_template=t.body_template or "",
            response_path=t.response_path or "",
            response_template=t.response_template or ""
        ))
    return tools

# ─────────────────────────── Ticket Tool ───────────────────────────

from langchain_core.tools import StructuredTool

class TicketCreateInput(BaseModel):
    damage_summary: str = Field(description="Kullanıcının hasarlı, eksik ürün destek talebi veya kargo şikayetinin çok detaylı özeti.")
    order_number: Optional[str] = Field(default=None, description="Kullanıcı sipariş numarası (veya ID) belirttiyse buraya yaz.")

def build_ticket_tools(bot_id: int, platform: str, session_id: str, db) -> list:
    """Chat üzerinde Ticket (Hasar/Eksik vs) formunu tetikleyecek aracı döner."""
    
    def _create_ticket(damage_summary: str, order_number: Optional[str] = None) -> str:
        if platform in ("whatsapp", "wa"):
            from models.ticket import Ticket
            ticket = Ticket(
                bot_id=bot_id,
                platform="whatsapp",
                contact_id=session_id,
                order_number=order_number,
                damage_summary=damage_summary,
                status="open"
            )
            db.add(ticket)
            db.commit()
            return "Kullanıcıya talebinin destek ekibimize ulaştığını ve hızlı şekilde çözüleceğini samimi bir dille ilet."
        else:
            return "Lütfen yanıtında ŞU METNİ birebir DÖNDÜR (noktalama değiştirmeden, [TICKET_FORM_RENDER] kodunu kesinlikle ekleyerek yanıtla, böylelikle kullanıcı ekranında form çıkacaktır): 'Destek talebinizi oluşturmak için aşağıdaki formu doldurunuz: [TICKET_FORM_RENDER]'"

    ticket_tool = StructuredTool.from_function(
        func=_create_ticket,
        name="create_ticket",
        description="Kullanıcı kargonuzun hasarlı, eksik veya yanlış geldiğini söylediğinde, ya da iade / destek talebi oluşturmak istediğinde ÇAĞRILACAKTIR.",
        args_schema=TicketCreateInput,
    )
    return [ticket_tool]
 