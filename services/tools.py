import json
import requests as http_requests
from typing import Type, Any
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field


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
    
    def _run(self, query: str) -> str:
        endpoint = ""
        params = {}
        if self.provider == "woocommerce":
            endpoint = f"{self.api_url.rstrip('/')}/wp-json/wc/v3/products"
            params = {"search": query, "consumer_key": self.api_key, "consumer_secret": self.api_secret, "per_page": 3}
        elif self.provider in ["shopify", "ticimax", "ideasoft"]:
            pass
        else:
            return f"{query} için stok ve fiyat bilgisi bulunamadı (Desteklenmeyen altyapı)."
            
        try:
            if endpoint:
                res = http_requests.get(endpoint, params=params, timeout=5)
                if res.status_code == 200:
                    products = res.json()
                    if not products:
                        return f"{query} ile eşleşen ürün bulunamadı."
                    result = []
                    for p in products:
                        name = p.get("name")
                        price = p.get("price")
                        status = "Stokta Var" if p.get("in_stock") else "Stokta Yok"
                        result.append(f"Ürün: {name} | Fiyat: {price} TL | Durum: {status}")
                    return "\n".join(result)
                return "Ürün aranırken mağaza altyapısında bir sorun oluştu."
            else:
                return f"Simüle Edilmiş Mağaza ({self.provider.upper()}): {query} ürünü 499.90 TL ve stokta mevcuttur."
        except Exception:
            return f"Simüle Edilmiş Mağaza Verisi: {query} ürünü 250 TL ve stokta mevcuttur."


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
            response_template=t.response_template or "",
        ))
    return tools
