import hashlib
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from models.crawled_page import CrawledPage
from services.crawler import fetch_html, clean_html_to_text, extract_valid_links
from services.text_splitter import split_documents
from langchain_core.documents import Document
from services.vectordb import VectorDBService

def compute_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()

def process_single_url(url: str, bot_id: int, db: Session):
    """Fetch, clean, chunk, and embed a single URL."""
    try:
        # 1. Fetch
        html = fetch_html(url)
        # 2. Extract text
        text = clean_html_to_text(html)
        if not text.strip():
            return
            
        content_hash = compute_hash(text)
        
        # 3. Duplicate check
        existing = db.query(CrawledPage).filter(
            CrawledPage.bot_id == bot_id,
            CrawledPage.url == url
        ).first()
        
        if existing and existing.content_hash == content_hash:
            # Skip if content hasn't changed
            return

        # 4. Chunk
        raw_doc = Document(page_content=text, metadata={"source": url, "title": url, "type": "web_page"})
        chunks = split_documents([raw_doc])
        for chunk in chunks:
            chunk.metadata["bot_id"] = str(bot_id)

        # 5. Embed & Vector DB
        vectordb = VectorDBService()
        vectordb.add_documents(str(bot_id), chunks)
        
        # 6. Save to relational DB
        if existing:
            existing.content = text
            existing.content_hash = content_hash
        else:
            new_page = CrawledPage(
                bot_id=bot_id,
                url=url,
                title=url,
                content=text,
                content_hash=content_hash
            )
            db.add(new_page)
            
        db.commit()
        print(f"Successfully processed and embedded {url}")
    except Exception as e:
        print(f"Error processing URL {url}: {e}")

def crawl_website_recursive(base_url: str, bot_id: int, db: Session, max_pages: int = 50):
    """Crawl a website starting from base_url, up to max_pages."""
    visited = set()
    queue = [base_url]
    
    while queue and len(visited) < max_pages:
        current_url = queue.pop(0)
        if current_url in visited:
            continue
            
        visited.add(current_url)
        print(f"Crawling: {current_url} ({len(visited)}/{max_pages})")
        
        try:
            html = fetch_html(current_url)
            
            # Process current page
            text = clean_html_to_text(html)
            if not text.strip():
                continue
                
            content_hash = compute_hash(text)
            existing = db.query(CrawledPage).filter(CrawledPage.bot_id == bot_id, CrawledPage.url == current_url).first()
            if not (existing and existing.content_hash == content_hash):
                raw_doc = Document(page_content=text, metadata={"source": current_url, "title": current_url, "type": "web_page"})
                chunks = split_documents([raw_doc])
                for chunk in chunks:
                    chunk.metadata["bot_id"] = str(bot_id)
                vectordb = VectorDBService()
                vectordb.add_documents(str(bot_id), chunks)
                
                if existing:
                    existing.content = text
                    existing.content_hash = content_hash
                else:
                    db.add(CrawledPage(bot_id=bot_id, url=current_url, title=current_url, content=text, content_hash=content_hash))
                db.commit()
            
            # Extract links and add to queue
            links = extract_valid_links(base_url, html) # base_url ensures domain restriction
            for link in links:
                if link not in visited and link not in queue:
                    queue.append(link)
                    
        except Exception as e:
            print(f"Error crawling {current_url}: {e}")
