"""Ürün feed yönetimi — feed URL kaydetme, senkronizasyon, ürün listeleme."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.product import Product
from models.user import User
from routers.auth import get_current_user
from routers.bot import get_user_bot
from services.feed import sync_feed

router = APIRouter(prefix="/api/bots", tags=["feed"])


class FeedSyncRequest(BaseModel):
    feed_url: Optional[str] = None  # Verilirse bota kaydedilir; verilmezse kayıtlı URL kullanılır


@router.post("/{bot_id}/feed/sync")
def feed_sync(
    bot_id: int,
    req: FeedSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    try:
        stats = sync_feed(bot, db, feed_url=req.feed_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Feed indirilemedi veya işlenemedi: {e}")
    return {
        "status": "success",
        "message": f"{stats['total']} ürün işlendi ({stats['created']} yeni, {stats['updated']} güncellendi, {stats['removed']} kaldırıldı).",
        **stats,
        "feed_url": bot.feed_url,
        "feed_last_sync": bot.feed_last_sync.isoformat() if bot.feed_last_sync else None,
    }


@router.post("/{bot_id}/feed/upload")
async def feed_upload(
    bot_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """XML feed dosyasını yükleyerek senkronize et (barındırılan URL olmadığında)."""
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya çok büyük (maks 50MB).")
    from services.feed import sync_feed_from_bytes
    try:
        stats = sync_feed_from_bytes(bot, db, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"XML işlenemedi: {e}")
    return {
        "status": "success",
        "message": f"{stats['total']} ürün işlendi ({stats['created']} yeni, {stats['updated']} güncellendi, {stats['removed']} kaldırıldı).",
        **stats,
        "feed_last_sync": bot.feed_last_sync.isoformat() if bot.feed_last_sync else None,
    }


@router.get("/{bot_id}/products")
def list_products(
    bot_id: int,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    query = db.query(Product).filter(Product.bot_id == bot.id)
    if q:
        query = query.filter(Product.title.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(Product.title).offset(offset).limit(min(limit, 200)).all()
    return {
        "total": total,
        "feed_url": bot.feed_url,
        "feed_last_sync": bot.feed_last_sync.isoformat() if bot.feed_last_sync else None,
        "products": [
            {
                "id": p.id,
                "external_id": p.external_id,
                "title": p.title,
                "price": p.price,
                "sale_price": p.sale_price,
                "currency": p.currency,
                "stock": p.stock,
                "image_url": p.image_url,
                "product_url": p.product_url,
                "category": p.category,
                "brand": p.brand,
            }
            for p in rows
        ],
    }


@router.delete("/{bot_id}/products/{product_id}")
def delete_product(
    bot_id: int,
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tek bir ürünü sil (feed'deki hatalı/test ürünleri için)."""
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    product = db.query(Product).filter(Product.id == product_id, Product.bot_id == bot.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    # Bir sonraki senkronda feed'den geri gelmesin diye hariç tutulanlara ekle.
    # external_id yoksa product_url'yi anahtar olarak kullan (feed.py her ikisini de kontrol eder).
    exclude_key = product.external_id or product.product_url
    if exclude_key:
        excluded = set((bot.feed_excluded_ids or "").split(",")) - {""}
        excluded.add(exclude_key)
        bot.feed_excluded_ids = ",".join(sorted(excluded))
    db.delete(product)
    db.commit()
    return {"status": "success", "deleted_id": product_id}


@router.delete("/{bot_id}/products")
def clear_products(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    deleted = db.query(Product).filter(Product.bot_id == bot.id).delete()
    bot.feed_last_sync = None
    bot.feed_excluded_ids = None  # Temiz başlangıç — hariç tutulanlar da sıfırlanır
    db.commit()
    return {"status": "success", "deleted": deleted}
