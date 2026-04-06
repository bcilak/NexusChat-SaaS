from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from models.bot import Bot
from models.document import Document
from routers.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

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
            "created_at": u.created_at
        }
        for u in users
    ]

@router.put("/users/{user_id}")
def update_user(user_id: int, payload: dict, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if "plan" in payload:
        user.plan = payload["plan"]
    if "credits" in payload:
        user.credits = payload["credits"]
    if "can_use_api_tools" in payload:
        user.can_use_api_tools = payload["can_use_api_tools"]
    if "can_remove_branding" in payload:
        user.can_remove_branding = payload["can_remove_branding"]
        
    db.commit()
    return {"message": "Kullanıcı güncellendi"}

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
