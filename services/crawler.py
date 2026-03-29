import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Set, Dict

def fetch_html(url: str) -> str:
    """Fetch raw HTML from a URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    return response.text

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
