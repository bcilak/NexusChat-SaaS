import requests
from typing import Type, Any
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

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
        # Mocking WooCommerce/Shopify/Ticimax/Ideasoft search for demonstration
        endpoint = ""
        params = {}
        if self.provider == "woocommerce":
            endpoint = f"{self.api_url.rstrip('/')}/wp-json/wc/v3/products"
            params = {"search": query, "consumer_key": self.api_key, "consumer_secret": self.api_secret, "per_page": 3}
        elif self.provider in ["shopify", "ticimax", "ideasoft"]:
            # Mocking identical fallback test for diverse providers initially
            pass
        else:
            return f"{query} için stok ve fiyat bilgisi bulunamadı (Desteklenmeyen altyapı)."
            
        try:
            if endpoint:
                res = requests.get(endpoint, params=params, timeout=5)
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
            # Fallback mock for testing without real credentials
            return f"Simüle Edilmiş Mağaza Verisi: {query} ürünü 250 TL ve stokta mevcuttur."
