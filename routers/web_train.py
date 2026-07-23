import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User
from models.crawled_page import CrawledPage
from routers.auth import get_current_user
from routers.bot import get_user_bot
from services.crawler_tasks import process_single_url_background, crawl_website_recursive_background

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bots/{bot_id}/web", tags=["web-training"])

class TrainUrlRequest(BaseModel):
    url: str

MAX_CRAWL_PAGES = 200  # Kaçak/sonsuz taramayı önlemek için üst sınır


class TrainWebsiteRequest(BaseModel):
    base_url: str
    max_pages: int = 50

class CrawledPageResponse(BaseModel):
    id: int
    url: str
    title: str
    last_crawled: str

@router.post("/train-url")
def train_url(
    bot_id: int,
    req: TrainUrlRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    logger.info(
        "[web-training] Queue single URL url=%s bot_id=%s user_id=%s",
        req.url,
        bot.id,
        current_user.id,
    )
    # Start task in background so API answers instantly
    background_tasks.add_task(process_single_url_background, req.url, bot.id)
    return {"message": f"{req.url} URL'si öğrenme kuyruğuna eklendi."}

@router.post("/train-website")
def train_website(
    bot_id: int,
    req: TrainWebsiteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    max_pages = max(1, min(req.max_pages, MAX_CRAWL_PAGES))  # 1..200 aralığına sıkıştır
    logger.info(
        "[web-training] Queue recursive crawl base_url=%s bot_id=%s user_id=%s max_pages=%s",
        req.base_url,
        bot.id,
        current_user.id,
        max_pages,
    )
    background_tasks.add_task(crawl_website_recursive_background, req.base_url, bot.id, max_pages)
    return {"message": f"{req.base_url} tüm site tarama kuyruğuna eklendi (Maks: {max_pages} sayfa)."}

@router.get("/pages", response_model=list[CrawledPageResponse])
def list_crawled_pages(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    pages = db.query(CrawledPage).filter(CrawledPage.bot_id == bot_id).order_by(CrawledPage.last_crawled.desc()).all()
    return [
        CrawledPageResponse(
            id=p.id,
            url=p.url,
            title=p.title or p.url,
            last_crawled=p.last_crawled.isoformat() if p.last_crawled else ""
        )
        for p in pages
    ]

@router.delete("/pages/{page_id}")
def delete_crawled_page(
    bot_id: int,
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    page = db.query(CrawledPage).filter(CrawledPage.id == page_id, CrawledPage.bot_id == bot_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Sayfa bulunamadı")
    # Bu URL'ye ait chunk'ları vektör deposundan da sil — silinen sayfa cevap vermeye devam etmesin
    from services.vectordb import VectorDBService
    VectorDBService().delete_by_source(str(bot_id), page.url)
    db.delete(page)
    db.commit()
    return {"message": "Sayfa silindi"}
