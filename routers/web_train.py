from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User
from models.crawled_page import CrawledPage
from routers.auth import get_current_user
from routers.bot import get_user_bot
from services.crawler_tasks import process_single_url, crawl_website_recursive

router = APIRouter(prefix="/api/bots/{bot_id}/web", tags=["web-training"])

class TrainUrlRequest(BaseModel):
    url: str

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
    bot = get_user_bot(bot_id, current_user, db)
    # Start task in background so API answers instantly
    background_tasks.add_task(process_single_url, req.url, bot_id, db)
    return {"message": f"{req.url} URL'si öğrenme kuyruğuna eklendi."}

@router.post("/train-website")
def train_website(
    bot_id: int,
    req: TrainWebsiteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    background_tasks.add_task(crawl_website_recursive, req.base_url, bot_id, db, req.max_pages)
    return {"message": f"{req.base_url} tüm site tarama kuyruğuna eklendi (Maks: {req.max_pages} sayfa)."}

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
    bot = get_user_bot(bot_id, current_user, db)
    page = db.query(CrawledPage).filter(CrawledPage.id == page_id, CrawledPage.bot_id == bot_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Sayfa bulunamadı")
    # Note: ideally we should also delete chunks from ChromaDB by URL here.
    db.delete(page)
    db.commit()
    return {"message": "Sayfa silindi"}
