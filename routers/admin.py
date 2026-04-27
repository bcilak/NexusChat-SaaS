from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from db.database import get_db
from models.user import User
from models.bot import Bot
from models.document import Document
from models.chat_history import ChatHistory
from models.banned_ip import BannedIP
from routers.auth import get_current_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Schemas ---
class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    plan: Optional[str] = "free"
    role: Optional[str] = "user"
    credits: Optional[int] = 500
    can_use_api_tools: Optional[bool] = False
    can_remove_branding: Optional[bool] = False
    can_create_users: Optional[bool] = False

class BanIPRequest(BaseModel):
    ip_address: str
    reason: Optional[str] = "Bot/Spam Saldırısı"

@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    total_users = db.query(User).count()
    total_bots = db.query(Bot).count()
    total_documents = db.query(Document).count()
    
    return {
        "users": total_users,
        "bots": total_bots,
        "documents": total_documents
    }

@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "plan": u.plan,
            "role": u.role,
            "credits": u.credits,
            "can_use_api_tools": u.can_use_api_tools,
            "can_remove_branding": u.can_remove_branding,
            "can_create_users": u.can_create_users,
            "parent_id": u.parent_id,
            "created_at": u.created_at
        }
        for u in users
    ]


@router.post("/users")
def create_user(req: CreateUserRequest, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Admin yeni bir kullanıcı oluşturur. can_create_users=True ise o kullanıcı da alt kullanıcı ekleyebilir."""
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    new_user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        plan=req.plan,
        role=req.role,
        credits=req.credits,
        can_use_api_tools=req.can_use_api_tools,
        can_remove_branding=req.can_remove_branding,
        can_edit_bots=True, # Genellikle müşteri oluşturulduğu için baştan yetki tam olsun.
        parent_id=None,  # Adminin oluşturduğu kullanıcı bağımsız bir müşteridir (kendi hesabı vardır).
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "plan": new_user.plan,
        "role": new_user.role,
        "credits": new_user.credits,
        "can_use_api_tools": new_user.can_use_api_tools,
        "can_remove_branding": new_user.can_remove_branding,
        "can_create_users": new_user.can_create_users,
        "parent_id": new_user.parent_id,
        "created_at": new_user.created_at,
        "message": "Kullanıcı başarıyla oluşturuldu"
    }

@router.put("/users/{user_id}")
def update_user(user_id: int, payload: dict, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if "plan" in payload:
        user.plan = payload["plan"]
    if "role" in payload:
        user.role = payload["role"]
    if "credits" in payload:
        user.credits = payload["credits"]
    if "can_use_api_tools" in payload:
        user.can_use_api_tools = payload["can_use_api_tools"]
    if "can_remove_branding" in payload:
        user.can_remove_branding = payload["can_remove_branding"]
    if "can_create_users" in payload:
        user.can_create_users = payload["can_create_users"]
        
    db.commit()
    return {"message": "Kullanıcı güncellendi"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Admin kullanıcılar silinemez")
    db.delete(user)
    db.commit()
    return {"message": "Kullanıcı silindi"}

@router.put("/users/{user_id}/plan")
def update_user_plan(user_id: int, payload: dict, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    plan = payload.get("plan")
    if plan:
        user.plan = plan
        db.commit()
    return {"message": "Plan güncellendi", "plan": user.plan}

@router.get("/bots")
def list_all_bots(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    bots = db.query(Bot).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "model": b.model,
            "owner_id": b.owner_id,
            "created_at": b.created_at
        }
        for b in bots
    ]

@router.delete("/bots/{bot_id}")
def delete_bot_admin(bot_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")
    
    db.delete(bot)
    db.commit()
    return {"message": "Bot sistemden kalıcı olarak silindi"}

# --- Security Endpoints ---

@router.get("/security/logs")
def get_chat_logs(type: Optional[str] = "all", db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    query = db.query(ChatHistory)
    if type == "spam":
        query = query.filter(ChatHistory.is_spam == True)
    
    logs = query.order_by(ChatHistory.created_at.desc()).limit(150).all()
    result = []
    for log in logs:
        bot = db.query(Bot).filter(Bot.id == log.bot_id).first()
        result.append({
            "id": log.id,
            "bot_id": log.bot_id,
            "bot_name": bot.name if bot else "Unknown",
            "ip_address": log.ip_address,
            "question": log.question,
            "answer": log.answer,
            "is_spam": log.is_spam,
            "created_at": log.created_at
        })
    return result

@router.get("/security/banned-ips")
def get_banned_ips(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ips = db.query(BannedIP).order_by(BannedIP.created_at.desc()).all()
    return [
        {
            "id": ip.id,
            "ip_address": ip.ip_address,
            "reason": ip.reason,
            "created_at": ip.created_at
        }
        for ip in ips
    ]

@router.post("/security/ban-ip")
def ban_ip(req: BanIPRequest, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    existing = db.query(BannedIP).filter(BannedIP.ip_address == req.ip_address).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu IP adresi zaten banlanmış.")
    
    new_ban = BannedIP(ip_address=req.ip_address, reason=req.reason)
    db.add(new_ban)
    db.commit()
    return {"message": f"IP {req.ip_address} başarıyla banlandı."}

@router.delete("/security/ban-ip/{ip_id}")
def unban_ip(ip_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    banned_ip = db.query(BannedIP).filter(BannedIP.id == ip_id).first()
    if not banned_ip:
        raise HTTPException(status_code=404, detail="Banlı IP bulunamadı.")
    
    db.delete(banned_ip)
    db.commit()
    return {"message": "IP banı başarıyla kaldırıldı."}
