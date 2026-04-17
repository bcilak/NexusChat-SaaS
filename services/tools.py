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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ E-Commerce Tool (mevcut) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ECommerceProductSearchInput(BaseModel):
    query: str = Field(description="Arama yapÄ±lacak Ã¼rÃ¼n adÄ± veya anahtar kelime")

class ECommerceProductSearchTool(BaseTool):
    name: str = "ecommerce_product_search"
    description: str = "MaÄŸazada verilen anahtar kelimeye gÃ¶re Ã¼rÃ¼n fiyat, stok ve Ã¶zelliklerini canlÄ± arar."
    args_schema: Type[BaseModel] = ECommerceProductSearchInput
    
    api_url: str = ""
    api_key: str = ""
    api_secret: str = ""
    provider: str = ""
    meta_data_str: str = ""
    bot_id: int = 0

    def _update_meta(self, new_meta: str):
        if new_meta and new_meta != self.meta_data_str and self.bot_id:
            try:
                from db.database import SessionLocal
                from models.bot_integration import BotIntegration
                db = SessionLocal()
                intg = db.query(BotIntegration).filter_by(bot_id=self.bot_id, provider=self.provider).first()
                if intg:
                    intg.meta_data = new_meta
                    db.commit()
                db.close()
                self.meta_data_str = new_meta
            except Exception as e:
                pass
    
    def _run(self, query: str) -> str:
        # â”€â”€ WooCommerce â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                        return f"'{query}' ile eÅŸleÅŸen Ã¼rÃ¼n bulunamadÄ±."
                    lines = ["**Bulunan ÃœrÃ¼nler:**\n"]
                    for p in products:
                        stock = "Stokta Var" if p.get("in_stock") else "Stokta Yok"
                        price = p.get('price', '?')
                        lines.append(f"- **{p.get('name')}**")
                        lines.append(f"  - ğŸ’° Fiyat: {price} TL")
                        lines.append(f"  - ğŸ“¦ Stok: {stock}")
                        lines.append("")
                    return "\n".join(lines)
                return f"MaÄŸaza API'sinden hata alÄ±ndÄ± (HTTP {res.status_code})."
            except Exception as e:
                return f"WooCommerce baÄŸlantÄ± hatasÄ±: {str(e)}"

        # â”€â”€ IdeaSoft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                if res and res.get("updated_meta_data_str"):
                    self._update_meta(res["updated_meta_data_str"])
                products = res.get("products", [])
                return format_products_for_chat(products)
            except IdeaSoftError as e:
                return f"Bunu kullanÄ±cÄ±ya AYNEN ilet: MaÄŸaza Ã¼rÃ¼n sisteminde (IdeaSoft) geçici bir baÄŸlantÄ±, yetki veya token sorunu var ({str(e)}). LÃ¼tfen bu hatayÄ± maÄŸaza sahiplerine raporlayÄ±n."
            except Exception as e:
                return f"Beklenmedik hata (KullanÄ±cÄ±ya bu durumu bildirin): {str(e)}"

        # â”€â”€ Ticimax â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                        return f"'{query}' ile eÅŸleÅŸen Ã¼rÃ¼n bulunamadÄ±."
                    lines = ["**Bulunan ÃœrÃ¼nler:**\n"]
                    for p in (products if isinstance(products, list) else [])[:5]:
                        price = p.get("Price", p.get("price", "?"))
                        stock = "Stokta Var" if p.get("StockQuantity", p.get("stockQuantity", 0)) > 0 else "Stokta Yok"
                        lines.append(f"- **{p.get('Name', p.get('name', 'ÃœrÃ¼n'))}**")
                        lines.append(f"  - ğŸ’° Fiyat: {price} TL")
                        lines.append(f"  - ğŸ“¦ Stok: {stock}")
                        lines.append("")
                    return "\n".join(lines)
                return f"Ticimax API hatasÄ± (HTTP {res.status_code})"
            except Exception as e:
                return f"Ticimax baÄŸlantÄ± hatasÄ±: {str(e)}"

        # â”€â”€ Shopify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                        return f"'{query}' ile eÅŸleÅŸen Ã¼rÃ¼n bulunamadÄ±."
                    lines = ["**Bulunan ÃœrÃ¼nler:**\n"]
                    for p in products:
                        variant = p.get("variants", [{}])[0]
                        price = variant.get("price", "?")
                        stock = "Stokta Var" if variant.get("inventory_quantity", 0) > 0 else "Stokta Yok"
                        lines.append(f"- **{p.get('title')}**")
                        lines.append(f"  - ğŸ’° Fiyat: {price} TL")
                        lines.append(f"  - ğŸ“¦ Stok: {stock}")
                        lines.append("")
                    return "\n".join(lines)
                return f"Shopify API hatasÄ± (HTTP {res.status_code})"
            except Exception as e:
                return f"Shopify baÄŸlantÄ± hatasÄ±: {str(e)}"

        else:
            return f"'{self.provider}' altyapÄ±sÄ± desteklenmiyor. Desteklenen: woocommerce, ideasoft, ticimax, shopify."


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ IdeaSoft SipariÅŸ Sorgulama Tool â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class IdeaSoftOrderInput(BaseModel):
    query: str = Field(description="SipariÅŸ numarasÄ± (Ã¶rn: 142822) veya 'son sipariÅŸler'.")

class IdeaSoftOrderSearchTool(BaseTool):
    name: str = "ideasoft_order_search"
    description: str = "IdeaSoft maÄŸazasÄ±nda sipariÅŸ numarasÄ± ile durumunu sorgular. Ã–NEMLÄ°: Bu aracÄ±n dÃ¶nÃ¼ÅŸ metnini KULLANICIYA AYNEN Ä°LET! EÄŸer 'bulunmuyor' diyorsa, kullanÄ±cÄ±ya 'sipariÅŸ bulunmuyor' de, asla kendi ezbere 'net bilgiye sahip deÄŸilim' ÅŸablonunu kullanma!"
    args_schema: Type[BaseModel] = IdeaSoftOrderInput

    api_url: str = ""
    api_key: str = ""       # client_id
    api_secret: str = ""    # client_secret
    meta_data_str: str = ""
    bot_id: int = 0

    def _update_meta(self, new_meta: str):
        if new_meta and new_meta != self.meta_data_str and self.bot_id:
            try:
                from db.database import SessionLocal
                from models.bot_integration import BotIntegration
                db = SessionLocal()
                intg = db.query(BotIntegration).filter_by(bot_id=self.bot_id, provider="ideasoft").first()
                if intg:
                    intg.meta_data = new_meta
                    db.commit()
                db.close()
                self.meta_data_str = new_meta
            except Exception as e:
                pass

    def _run(self, query: str) -> str:
        try:
            import re
            order_no = None
            if query:
                # Sadece rakamsal bir string mi veya iÃ§inde aÃ§Ä±kÃ§a sipariÅŸ numarasÄ± var mÄ±?
                query_stripped = query.strip()
                if query_stripped.isdigit():
                    order_no = query_stripped
                elif query_stripped.startswith("#") and query_stripped[1:].isdigit():
                    order_no = query_stripped[1:]
                else:
                    # Metin iÃ§inde daha uzun rakam grubunu da dÃ¼ÅŸÃ¼nelim, en az 4 haneli
                    match = re.search(r'\b\d{4,}\b', query)
                    if match:
                        order_no = match.group(0)

            if order_no:
                res = ideasoft_get_order_by_number(
                    api_url=self.api_url,
                    client_id=self.api_key,
                    client_secret=self.api_secret,
                    order_number=order_no,
                    meta_data_str=self.meta_data_str,
                )
                if res and res.get("updated_meta_data_str"):
                    self._update_meta(res["updated_meta_data_str"])
                order = res.get("order")
                if order:
                    lines = [f"**SipariÅŸ #{order.get('order_no', order_no)} DetaylarÄ±:**\n"]
                    if order.get("date"):
                        lines.append(f"- ğŸ“… Tarih: {order['date']}")
                    lines.append(f"- ğŸ”„ Durum: {order.get('status', 'Bilinmiyor')}")
                    if order.get("total"):
                        lines.append(f"- ğŸ’° Toplam: {order['total']}")
                    if order.get("cargo_tracking_no"):
                        lines.append(f"- ğŸšš Kargo Takip No: {order['cargo_tracking_no']}")
                    if order.get("items"):
                        lines.append("\n**ÃœrÃ¼nler:**")
                        for item in order["items"]:
                            lines.append(f"  - {item.get('name', 'Bilinmeyen ÃœrÃ¼n')} Ã— {item.get('qty', 1)} adet")
                    return "\n".join(lines)
                return f"SipariÅŸ kayÄ±tlarÄ±mÄ±zda {order_no} numaralÄ± bir sipariÅŸ bulunmuyor."
            else:
                # Genel sorgu â€” son sipariÅŸleri listele
                res = ideasoft_get_orders(
                    api_url=self.api_url,
                    client_id=self.api_key,
                    client_secret=self.api_secret,
                    limit=5,
                    meta_data_str=self.meta_data_str,
                )
                if res and res.get("updated_meta_data_str"):
                    self._update_meta(res["updated_meta_data_str"])
                orders = res.get("orders", [])
                return format_orders_for_chat(orders)
        except IdeaSoftError as e:
            if "HTTP 404" in str(e):
                return f"Sisteme baktÄ±m, {order_no} numaralÄ± bir sipariÅŸiniz bulunmamaktadÄ±r. LÃ¼tfen numarayÄ± kontrol edip tekrar dener misiniz?"
            return f"BU MESAJI AYNEN Ä°LET: Åžu anda maÄŸaza sisteminde (IdeaSoft) geçici bir baÄŸlantÄ± sorunu veya yetki hatasÄ± yaÅŸanÄ±yor (Hata: {str(e)}). LÃ¼tfen durumu maÄŸaza yetkililerine bildirin."
        except Exception as e:
            return f"BU MESAJI AYNEN Ä°LET: SipariÅŸ kontrolÃ¼ sÄ±rasÄ±nda beklenmedik bir hata oluÅŸtu ({str(e)}). LÃ¼tfen maÄŸaza yÃ¶netimine bildirin."


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ E-Commerce Tool Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def build_ecommerce_tools(bot_id: int, db) -> list:
    """
    DB'deki aktif BotIntegration kayÄ±tlarÄ±ndan e-ticaret araÃ§larÄ± oluÅŸturur.
    Her entegrasyon iÃ§in uygun LangChain tool listesini dÃ¶ndÃ¼rÃ¼r.
    """
    from models.bot_integration import BotIntegration

    integrations = db.query(BotIntegration).filter(
        BotIntegration.bot_id == bot_id,
        BotIntegration.is_active == True,
    ).all()

    tools = []
    for intg in integrations:
        if intg.provider in ("woocommerce", "shopify", "ticimax", "ideasoft"):
            # ÃœrÃ¼n arama tÃ¼m saÄŸlayÄ±cÄ±larda
            tools.append(ECommerceProductSearchTool(
                api_url=intg.api_url,
                api_key=intg.api_key,
                api_secret=intg.api_secret or "",
                provider=intg.provider,
                meta_data_str=intg.meta_data or "",
                bot_id=bot_id,
            ))
            # SipariÅŸ sorgulama sadece IdeaSoft'ta (diÄŸerleri iÃ§in ayrÄ± tool eklenebilir)
            if intg.provider == "ideasoft":
                tools.append(IdeaSoftOrderSearchTool(
                    api_url=intg.api_url,
                    api_key=intg.api_key,
                    api_secret=intg.api_secret or "",
                    meta_data_str=intg.meta_data or "",
                    bot_id=bot_id,
                ))
    return tools


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Dynamic API Tool (yeni) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class DynamicApiInput(BaseModel):
    query: str = Field(description="KullanÄ±cÄ±nÄ±n sorduÄŸu konu veya anahtar kelime")


def _get_nested(data: Any, path: str) -> Any:
    """Dot-notation ile JSON'dan deÄŸer okur. Ã–rn: 'main.temp', 'weather.0.description'"""
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
    KullanÄ±cÄ±nÄ±n dashboard'dan tanÄ±mladÄ±ÄŸÄ± API yapÄ±landÄ±rmasÄ±nÄ± Ã§alÄ±ÅŸtÄ±rÄ±r.
    {query} placeholder'Ä± otomatik olarak kullanÄ±cÄ± sorgusuna gÃ¶re doldurulur.
    """
    name: str
    description: str
    args_schema: Type[BaseModel] = DynamicApiInput

    # YapÄ±landÄ±rma â€” DB'den gelir
    api_url: str = ""
    method: str = "GET"
    headers_json: str = "{}"
    params_json: str = "{}"
    body_template: str = ""
    response_path: str = ""        # virgÃ¼lle ayrÄ±lmÄ±ÅŸ, Ã¶r: "main.temp,weather.0.description"
    response_template: str = ""   # Ã¶r: "SÄ±caklÄ±k: {main.temp}Â°C, Durum: {weather.0.description}"

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
                return f"API isteÄŸi baÅŸarÄ±sÄ±z oldu. HTTP {resp.status_code}: {resp.text[:200]}"

            try:
                data = resp.json()
            except Exception:
                return f"API yanÄ±tÄ±: {resp.text[:500]}"

            # YanÄ±ttan belirtilen alanlarÄ± Ã§Ä±kar
            extracted: dict[str, Any] = {}
            if self.response_path:
                for path in self.response_path.split(","):
                    path = path.strip()
                    if path:
                        extracted[path] = _get_nested(data, path)

            # Åablon varsa uygula
            if self.response_template and extracted:
                result = self.response_template
                for path, value in extracted.items():
                    result = result.replace("{" + path + "}", str(value) if value is not None else "N/A")
                return result

            # Åablon yoksa ham Ã§Ä±karÄ±lan deÄŸerleri dÃ¶ndÃ¼r
            if extracted:
                parts = [f"{k}: {v}" for k, v in extracted.items() if v is not None]
                return " | ".join(parts) if parts else str(data)

            # HiÃ§bir path belirtilmemiÅŸse ham JSON Ã¶zeti
            return json.dumps(data, ensure_ascii=False)[:800]

        except http_requests.exceptions.Timeout:
            return "API isteÄŸi zaman aÅŸÄ±mÄ±na uÄŸradÄ±. LÃ¼tfen sonra tekrar deneyin."
        except http_requests.exceptions.ConnectionError:
            return "API adresine baÄŸlanÄ±lamadÄ±. Ä°nternet baÄŸlantÄ±sÄ±nÄ± veya URL'yi kontrol edin."
        except Exception as e:
            return f"AraÃ§ Ã§alÄ±ÅŸÄ±rken bir hata oluÅŸtu: {str(e)}"


def build_dynamic_tools_from_db(bot_id: int, db) -> list:
    """DB'deki aktif BotTool kayÄ±tlarÄ±ndan DynamicApiTool listesi oluÅŸturur."""
    from models.bot_tool import BotTool
    
    db_tools = db.query(BotTool).filter(
        BotTool.bot_id == bot_id,
        BotTool.is_active == True
    ).all()

    tools = []
    for t in db_tools:
        # LangChain tool name: sadece harf, rakam ve alt Ã§izgi iÃ§ermeli
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

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ticket Tool â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

from langchain_core.tools import StructuredTool

class TicketCreateInput(BaseModel):
    damage_summary: str = Field(description="MÃ¼ÅŸterinin ÅŸikayetinin ASIL Ã¶zeti (Ã–rn: 'ÃœrÃ¼n ezik geldi, faturasÄ± yoktu'). Buraya ASLA sipariÅŸ veya Ã¼rÃ¼n adÄ±nÄ± yazma!")
    order_number: Optional[str] = Field(default=None, description="Müşterinin belirttiği sipariş numarası (Varsa yaz, Yoksay ve ASLA kullanıcıya sorma).")
    product_name: Optional[str] = Field(default=None, description="Sorun yaşanan ürünün adı (Varsa yaz, Yoksay ve ASLA kullanıcıya sorma).")

def build_ticket_tools(bot_id: int, platform: str, session_id: str, db) -> list:
    """Chat Ã¼zerinde Ticket (Hasar/Eksik vs) formunu tetikleyecek aracÄ± dÃ¶ner."""
    
    def _create_ticket(damage_summary: str, order_number: Optional[str] = None, product_name: Optional[str] = None) -> str:
        if platform in ("whatsapp", "wa"):
            from models.ticket import Ticket
            ticket = Ticket(
                bot_id=bot_id,
                platform="whatsapp",
                contact_id=session_id,
                order_number=order_number,
                product_name=product_name,
                damage_summary=damage_summary,
                status="open"
            )
            db.add(ticket)
            db.commit()
            return "KullanÄ±cÄ±ya talebinin destek ekibimize ulaÅŸtÄ±ÄŸÄ±nÄ± ve hÄ±zlÄ± ÅŸekilde Ã§Ã¶zÃ¼leceÄŸini samimi bir dille ilet."
        else:
            return "LÃ¼tfen yanÄ±tÄ±nda ÅU METNÄ° birebir DÃ–NDÃœR (noktalama deÄŸiÅŸtirmeden, [TICKET_FORM_RENDER] kodunu kesinlikle ekleyerek yanÄ±tla, bÃ¶ylelikle kullanÄ±cÄ± ekranÄ±nda form Ã§Ä±kacaktÄ±r): 'Destek talebinizi oluÅŸturmak iÃ§in aÅŸaÄŸÄ±daki formu doldurunuz: [TICKET_FORM_RENDER]'"

    ticket_tool = StructuredTool.from_function(
        func=_create_ticket,
        name="create_ticket",
        description="KullanÄ±cÄ± kargo hasarÄ±, eksik Ã¼rÃ¼n, kÄ±rÄ±k/patlak paket veya ÅŸikayetten bahsettiÄŸinde, HÄ°Ã‡BÄ°R EK BÄ°LGÄ° (sipariÅŸ no, Ã¼rÃ¼n adÄ± vb) SORMADAN ANINDA bu aracÄ± Ã§aÄŸÄ±r. Web formu bu bilgileri kendisi toplayacaktÄ±r. Sadece ÅŸikayet Ã¶zetini (damage_summary) doldur ve aracÄ± Ã§alÄ±ÅŸtÄ±r.",
        args_schema=TicketCreateInput,
    )
    return [ticket_tool]
 

