import sys
import os

# Uygulama dizinini path'e ekliyoruz ki modülleri bulabilsin
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from models.user import User
from routers.auth import hash_password

def create_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@chatgenius.com"
        existing = db.query(User).filter(User.email == admin_email).first()
        
        if existing:
            existing.role = "admin"
            db.commit()
            print(f"Mevcut kullanıcı güncellendi: {admin_email} (Şifre aynı kaldı, admin yapıldı)")
            return

        new_admin = User(
            name="Super Admin",
            email=admin_email,
            hashed_password=hash_password("admin123"),
            plan="enterprise",
            role="admin"
        )
        db.add(new_admin)
        db.commit()
        print(f"Yeni Admin başarıyla oluşturuldu!\nE-posta: {admin_email}\nŞifre: admin123")
    except Exception as e:
        print(f"Veritabanı hatası oluştu: {e}")
        print("Eğer veritabanını metin editörüyle açıp bozduysanız `chatbot.db` dosyasını silmeniz (veya yedeğe çekmeniz) gerekebilir.")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
