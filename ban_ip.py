import sys
from sqlalchemy.orm import Session
from db.database import SessionLocal
from models.banned_ip import BannedIP

def ban_ip(ip_address: str, reason: str = "Spam/Gibberish"):
    db: Session = SessionLocal()
    try:
        existing = db.query(BannedIP).filter(BannedIP.ip_address == ip_address).first()
        if existing:
            print(f"IP {ip_address} zaten banlanmış.")
            return

        new_ban = BannedIP(ip_address=ip_address, reason=reason)
        db.add(new_ban)
        db.commit()
        print(f"IP {ip_address} başarıyla banlandı.")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: python ban_ip.py <ip_adresi> [sebep]")
        sys.exit(1)
        
    ip = sys.argv[1]
    reason = sys.argv[2] if len(sys.argv) > 2 else "Spam/Bot Saldırısı"
    ban_ip(ip, reason)
