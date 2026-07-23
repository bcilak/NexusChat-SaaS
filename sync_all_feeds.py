"""Zamanlanmış ürün feed senkronizasyonu.

`feed_url` tanımlı tüm (aktif) botların ürün feed'ini indirir ve products
tablosunu günceller. Sunucuda cron ile çalıştırılmak üzere tasarlandı:

    # Her 6 saatte bir (crontab -e):
    0 */6 * * * cd /home/.../NexusChat-SaaS && venv/bin/python sync_all_feeds.py >> logs/feed_sync.log 2>&1

Tek bir botu senkronlamak için:
    venv/bin/python sync_all_feeds.py --bot-id 12

Yalnızca X saatten eski senkronları yenilemek için:
    venv/bin/python sync_all_feeds.py --stale-hours 6
"""
import argparse
import sys
from datetime import datetime, timedelta

from db.database import SessionLocal
from models.bot import Bot
from services.feed import sync_feed


def _log(msg: str) -> None:
    print(f"[{datetime.utcnow().isoformat(timespec='seconds')}Z] {msg}", flush=True)


def sync_all(bot_id: int = None, stale_hours: float = None) -> int:
    db = SessionLocal()
    ok = fail = skipped = 0
    try:
        q = db.query(Bot).filter(Bot.feed_url.isnot(None), Bot.feed_url != "")
        if bot_id:
            q = q.filter(Bot.id == bot_id)
        bots = q.all()
        _log(f"{len(bots)} bot için feed senkronizasyonu taranıyor.")

        threshold = None
        if stale_hours:
            threshold = datetime.utcnow() - timedelta(hours=stale_hours)

        for bot in bots:
            # Pasif botları atla — widget zaten görünmüyor
            if bot.is_active is not None and not bot.is_active:
                skipped += 1
                continue
            # Yeterince taze ise atla
            if threshold and bot.feed_last_sync and bot.feed_last_sync > threshold:
                skipped += 1
                continue
            try:
                stats = sync_feed(bot, db, feed_url=None)  # kayıtlı feed_url kullanılır
                _log(
                    f"  ✓ bot #{bot.id} ({bot.name}): "
                    f"{stats['total']} ürün — +{stats['created']} yeni, "
                    f"~{stats['updated']} güncel, -{stats['removed']} kaldırıldı"
                )
                ok += 1
            except Exception as e:
                db.rollback()
                _log(f"  ✗ bot #{bot.id} ({bot.name}): HATA — {e}")
                fail += 1

        _log(f"Bitti. Başarılı: {ok}, Hatalı: {fail}, Atlanan: {skipped}")
        return 0 if fail == 0 else 1
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ürün feed'lerini toplu senkronla.")
    parser.add_argument("--bot-id", type=int, default=None, help="Sadece bu bot ID'sini senkronla.")
    parser.add_argument(
        "--stale-hours", type=float, default=None,
        help="Yalnızca son senkronu bu saatten eski olan botları yenile.",
    )
    args = parser.parse_args()
    sys.exit(sync_all(bot_id=args.bot_id, stale_hours=args.stale_hours))
