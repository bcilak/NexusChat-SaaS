import hashlib
import logging
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from db.database import SessionLocal
from models.crawled_page import CrawledPage
from services.crawler import fetch_html, clean_html_to_text, extract_valid_links
from services.text_splitter import split_documents
from langchain_core.documents import Document
from services.vectordb import VectorDBService

logger = logging.getLogger(__name__)

def compute_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def process_single_url_background(url: str, bot_id: int):
    """Run single URL training with its own DB session for background execution."""
    db = SessionLocal()
    try:
        process_single_url(url, bot_id, db)
    except Exception:
        logger.exception("[web-training] Unhandled single-url task error url=%s bot_id=%s", url, bot_id)
    finally:
        db.close()


def crawl_website_recursive_background(base_url: str, bot_id: int, max_pages: int = 50):
    """Run recursive website training with its own DB session for background execution."""
    db = SessionLocal()
    try:
        crawl_website_recursive(base_url, bot_id, db, max_pages)
    except Exception:
        logger.exception(
            "[web-training] Unhandled recursive task error base_url=%s bot_id=%s max_pages=%s",
            base_url,
            bot_id,
            max_pages,
        )
    finally:
        db.close()

def process_single_url(url: str, bot_id: int, db: Session):
    """Fetch, clean, chunk, and embed a single URL."""
    logger.info("[web-training] Single URL started url=%s bot_id=%s", url, bot_id)
    try:
        # 1. Fetch
        logger.info("[web-training] Fetching URL url=%s bot_id=%s", url, bot_id)
        html = fetch_html(url)
        logger.info("[web-training] Fetched URL url=%s bot_id=%s html_chars=%s", url, bot_id, len(html))

        # 2. Extract text
        text = clean_html_to_text(html)
        logger.info("[web-training] Extracted text url=%s bot_id=%s text_chars=%s", url, bot_id, len(text))
        if not text.strip():
            logger.warning("[web-training] Empty text, skipping url=%s bot_id=%s", url, bot_id)
            return
            
        content_hash = compute_hash(text)
        
        # 3. Duplicate check
        existing = db.query(CrawledPage).filter(
            CrawledPage.bot_id == bot_id,
            CrawledPage.url == url
        ).first()
        
        if existing and existing.content_hash == content_hash:
            # Skip if content hasn't changed
            logger.info("[web-training] Content unchanged, skipping url=%s bot_id=%s", url, bot_id)
            return

        # 4. Chunk
        raw_doc = Document(page_content=text, metadata={"source": url, "title": url, "type": "web_page"})
        chunks = split_documents([raw_doc])
        logger.info("[web-training] Created chunks url=%s bot_id=%s chunks=%s", url, bot_id, len(chunks))
        for chunk in chunks:
            chunk.metadata["bot_id"] = str(bot_id)

        # 5. Embed & Vector DB — güncelleme ise bu URL'nin eski chunk'larını önce sil
        #    (aksi halde eski + yeni içerik birlikte cevap havuzunda kalır)
        logger.info("[web-training] Embedding chunks url=%s bot_id=%s chunks=%s", url, bot_id, len(chunks))
        vectordb = VectorDBService()
        if existing:
            vectordb.delete_by_source(str(bot_id), url)
        vectordb.add_documents(str(bot_id), chunks)
        logger.info("[web-training] Embedded chunks url=%s bot_id=%s chunks=%s", url, bot_id, len(chunks))
        
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
        logger.info("[web-training] Single URL completed url=%s bot_id=%s", url, bot_id)
    except Exception as e:
        db.rollback()
        logger.exception("[web-training] Single URL failed url=%s bot_id=%s error=%s", url, bot_id, e)

def crawl_website_recursive(base_url: str, bot_id: int, db: Session, max_pages: int = 50):
    """Crawl a website starting from base_url, up to max_pages."""
    logger.info("[web-training] Recursive crawl started base_url=%s bot_id=%s max_pages=%s", base_url, bot_id, max_pages)
    visited = set()
    queue = [base_url]
    
    while queue and len(visited) < max_pages:
        current_url = queue.pop(0)
        if current_url in visited:
            continue
            
        visited.add(current_url)
        logger.info(
            "[web-training] Crawling page url=%s bot_id=%s progress=%s/%s queue=%s",
            current_url,
            bot_id,
            len(visited),
            max_pages,
            len(queue),
        )
        
        try:
            logger.info("[web-training] Fetching URL url=%s bot_id=%s", current_url, bot_id)
            html = fetch_html(current_url)
            logger.info("[web-training] Fetched URL url=%s bot_id=%s html_chars=%s", current_url, bot_id, len(html))
            
            # Process current page
            text = clean_html_to_text(html)
            logger.info("[web-training] Extracted text url=%s bot_id=%s text_chars=%s", current_url, bot_id, len(text))
            if not text.strip():
                logger.warning("[web-training] Empty text, skipping url=%s bot_id=%s", current_url, bot_id)
                continue
                
            content_hash = compute_hash(text)
            existing = db.query(CrawledPage).filter(CrawledPage.bot_id == bot_id, CrawledPage.url == current_url).first()
            if not (existing and existing.content_hash == content_hash):
                raw_doc = Document(page_content=text, metadata={"source": current_url, "title": current_url, "type": "web_page"})
                chunks = split_documents([raw_doc])
                logger.info("[web-training] Created chunks url=%s bot_id=%s chunks=%s", current_url, bot_id, len(chunks))
                for chunk in chunks:
                    chunk.metadata["bot_id"] = str(bot_id)
                logger.info("[web-training] Embedding chunks url=%s bot_id=%s chunks=%s", current_url, bot_id, len(chunks))
                vectordb = VectorDBService()
                if existing:
                    vectordb.delete_by_source(str(bot_id), current_url)
                vectordb.add_documents(str(bot_id), chunks)
                logger.info("[web-training] Embedded chunks url=%s bot_id=%s chunks=%s", current_url, bot_id, len(chunks))
                
                if existing:
                    existing.content = text
                    existing.content_hash = content_hash
                else:
                    db.add(CrawledPage(bot_id=bot_id, url=current_url, title=current_url, content=text, content_hash=content_hash))
                db.commit()
                logger.info("[web-training] Saved crawled page url=%s bot_id=%s", current_url, bot_id)
            else:
                logger.info("[web-training] Content unchanged, skipping embed url=%s bot_id=%s", current_url, bot_id)
            
            # Extract links and add to queue
            links = extract_valid_links(base_url, html) # base_url ensures domain restriction
            logger.info("[web-training] Extracted links url=%s bot_id=%s links=%s", current_url, bot_id, len(links))
            for link in links:
                if link not in visited and link not in queue:
                    queue.append(link)
                    
        except Exception as e:
            db.rollback()
            logger.exception("[web-training] Crawl page failed url=%s bot_id=%s error=%s", current_url, bot_id, e)

    logger.info(
        "[web-training] Recursive crawl completed base_url=%s bot_id=%s visited=%s",
        base_url,
        bot_id,
        len(visited),
    )
