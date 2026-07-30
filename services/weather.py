"""Hava durumu servisi — Open-Meteo (ücretsiz, anahtarsız).

İki adım:
  1) Geocoding: şehir adı → enlem/boylam
  2) Forecast: enlem/boylam → güncel hava + günlük UV/min/max

Yalnızca bot.weather_enabled=True olan botlar bu servisi (weather tool üzerinden)
kullanır; diğer botlar hiç etkilenmez.
"""
from typing import Optional

import requests as http_requests

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT = 10

# WMO hava durumu kodları → Türkçe açıklama
_WMO_TR = {
    0: "Açık",
    1: "Genellikle açık",
    2: "Parçalı bulutlu",
    3: "Kapalı / bulutlu",
    45: "Sisli",
    48: "Kırağılı sis",
    51: "Hafif çisenti",
    53: "Çisenti",
    55: "Yoğun çisenti",
    56: "Donan hafif çisenti",
    57: "Donan çisenti",
    61: "Hafif yağmur",
    63: "Yağmur",
    65: "Şiddetli yağmur",
    66: "Donan hafif yağmur",
    67: "Donan yağmur",
    71: "Hafif kar",
    73: "Kar",
    75: "Yoğun kar",
    77: "Kar taneleri",
    80: "Hafif sağanak",
    81: "Sağanak",
    82: "Şiddetli sağanak",
    85: "Hafif kar sağanağı",
    86: "Yoğun kar sağanağı",
    95: "Gök gürültülü fırtına",
    96: "Dolu ile fırtına",
    99: "Şiddetli dolu ile fırtına",
}

# Rüzgar yönü (derece) → 8 yönlü Türkçe
_WIND_DIRS = ["Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu", "Güney", "Güneybatı", "Batı", "Kuzeybatı"]


def _wmo_text(code) -> str:
    try:
        return _WMO_TR.get(int(code), "Bilinmiyor")
    except (TypeError, ValueError):
        return "Bilinmiyor"


def _wind_dir_text(deg) -> Optional[str]:
    try:
        idx = int((float(deg) + 22.5) // 45) % 8
        return _WIND_DIRS[idx]
    except (TypeError, ValueError):
        return None


def _uv_risk(uv) -> Optional[str]:
    try:
        v = float(uv)
    except (TypeError, ValueError):
        return None
    if v < 3:
        return "Düşük"
    if v < 6:
        return "Orta"
    if v < 8:
        return "Yüksek"
    if v < 11:
        return "Çok yüksek"
    return "Aşırı"


def geocode_city(city: str) -> Optional[dict]:
    """Şehir adını enlem/boylama çevirir. Bulunamazsa None."""
    if not city or not city.strip():
        return None
    resp = http_requests.get(
        _GEOCODE_URL,
        params={"name": city.strip(), "count": 1, "language": "tr", "format": "json"},
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    results = (resp.json() or {}).get("results") or []
    if not results:
        return None
    r = results[0]
    label = r.get("name") or city
    admin1 = r.get("admin1")
    country = r.get("country")
    suffix = ", ".join([p for p in (admin1, country) if p])
    return {
        "latitude": r.get("latitude"),
        "longitude": r.get("longitude"),
        "name": label,
        "display": f"{label} ({suffix})" if suffix else label,
    }


def get_weather(city: str) -> dict:
    """Şehir için güncel hava durumunu döndürür.

    Dönüş: {"ok": bool, "error": str|None, "location": str|None, "data": dict|None,
            "summary": str}  — summary LLM'e verilecek Türkçe metin.
    """
    try:
        loc = geocode_city(city)
    except http_requests.exceptions.RequestException:
        return {"ok": False, "error": "geocode_failed", "location": None, "data": None,
                "summary": "Konum servisine şu anda ulaşılamıyor, lütfen sonra tekrar deneyin."}
    if not loc:
        return {"ok": False, "error": "not_found", "location": None, "data": None,
                "summary": f"'{city}' için bir konum bulunamadı. Lütfen şehir adını kontrol edin."}

    try:
        resp = http_requests.get(
            _FORECAST_URL,
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
                "daily": "uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto",
                "forecast_days": 1,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json() or {}
    except http_requests.exceptions.RequestException:
        return {"ok": False, "error": "forecast_failed", "location": loc["display"], "data": None,
                "summary": f"{loc['display']} için hava durumu servisine ulaşılamıyor, lütfen sonra tekrar deneyin."}

    cur = payload.get("current") or {}
    daily = payload.get("daily") or {}

    def _d0(key):
        arr = daily.get(key)
        return arr[0] if isinstance(arr, list) and arr else None

    code = cur.get("weather_code")
    uv_max = _d0("uv_index_max")
    data = {
        "location": loc["display"],
        "temperature": cur.get("temperature_2m"),
        "apparent_temperature": cur.get("apparent_temperature"),
        "humidity": cur.get("relative_humidity_2m"),
        "precipitation": cur.get("precipitation"),
        "weather_code": code,
        "weather_text": _wmo_text(code),
        "wind_speed": cur.get("wind_speed_10m"),
        "wind_direction_deg": cur.get("wind_direction_10m"),
        "wind_direction_text": _wind_dir_text(cur.get("wind_direction_10m")),
        "uv_index_max": uv_max,
        "uv_risk": _uv_risk(uv_max),
        "temp_max": _d0("temperature_2m_max"),
        "temp_min": _d0("temperature_2m_min"),
        "precipitation_probability_max": _d0("precipitation_probability_max"),
    }

    # LLM'e verilecek düz Türkçe özet (araç çıktısı)
    lines = [f"{data['location']} — güncel hava durumu:"]
    if data["weather_text"]:
        lines.append(f"Durum: {data['weather_text']}")
    if data["temperature"] is not None:
        t = f"Sıcaklık: {data['temperature']}°C"
        if data["apparent_temperature"] is not None:
            t += f" (hissedilen {data['apparent_temperature']}°C)"
        lines.append(t)
    if data["temp_min"] is not None and data["temp_max"] is not None:
        lines.append(f"Bugün: en düşük {data['temp_min']}°C / en yüksek {data['temp_max']}°C")
    if data["humidity"] is not None:
        lines.append(f"Nem: %{data['humidity']}")
    if data["wind_speed"] is not None:
        w = f"Rüzgar: {data['wind_speed']} km/s"
        if data["wind_direction_text"]:
            w += f" ({data['wind_direction_text']})"
        lines.append(w)
    if data["uv_index_max"] is not None:
        u = f"UV indeksi: {data['uv_index_max']}"
        if data["uv_risk"]:
            u += f" ({data['uv_risk']} risk)"
        lines.append(u)
    if data["precipitation_probability_max"] is not None:
        lines.append(f"Yağış olasılığı: %{data['precipitation_probability_max']}")

    return {"ok": True, "error": None, "location": loc["display"], "data": data,
            "summary": "\n".join(lines)}
