import ipaddress
import socket
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Set, Dict

MAX_FETCH_BYTES = 10 * 1024 * 1024  # 10MB — devasa/HTML olmayan yanıtlara karşı koruma


def _is_public_http_url(url: str) -> bool:
    """URL http(s) mi ve hedef IP herkese açık mı? SSRF (iç ağ / cloud metadata)
    saldırılarını engellemek için private/loopback/link-local adreslere izin verilmez."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    host = parsed.hostname
    if not host:
        return False
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            return False
    return True


def fetch_html(url: str) -> str:
    """Fetch raw HTML from a URL. Sadece herkese açık http(s) adreslerine izin verir."""
    if not _is_public_http_url(url):
        raise ValueError(f"Güvenli olmayan veya erişilemez URL reddedildi: {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    response = requests.get(url, headers=headers, timeout=15, stream=True)
    response.raise_for_status()

    # HTML dışı içerik tiplerini reddet (ör. büyük binary/zip/video)
    ctype = response.headers.get("Content-Type", "").lower()
    if ctype and not any(t in ctype for t in ("text/html", "application/xhtml", "text/plain", "application/xml")):
        raise ValueError(f"HTML olmayan içerik tipi atlandı ({ctype}): {url}")

    # Boyut sınırı uygulayarak parça parça oku
    chunks = []
    total = 0
    for chunk in response.iter_content(chunk_size=65536, decode_unicode=False):
        if not chunk:
            continue
        total += len(chunk)
        if total > MAX_FETCH_BYTES:
            raise ValueError(f"İçerik boyut sınırını aştı (>{MAX_FETCH_BYTES} bayt): {url}")
        chunks.append(chunk)
    raw = b"".join(chunks)
    encoding = response.encoding or "utf-8"
    return raw.decode(encoding, errors="replace")

def clean_html_to_text(html: str) -> str:
    """Extract readable text from HTML by removing noise."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove script, style, header, footer, nav, aside elements
    for element in soup(["script", "style", "header", "footer", "nav", "aside", "noscript", "meta"]):
        element.extract()
        
    # Get text and clean it
    text = soup.get_text(separator="\n", strip=True)
    # Basic cleanup: remove multiple newlines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)

def extract_valid_links(base_url: str, html: str) -> List[str]:
    """Find valid same-domain links from an HTML document."""
    soup = BeautifulSoup(html, "html.parser")
    base_domain = urlparse(base_url).netloc
    
    links = set()
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        # Make absolute
        full_url = urljoin(base_url, href)
        # Remove fragments / query params for uniqueness (optional)
        parsed_url = urlparse(full_url)
        clean_url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
        
        # Check domain constraint
        if parsed_url.netloc == base_domain:
            links.add(clean_url)
            
    return list(links)
