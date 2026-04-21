"""
Kullanıcıların kendi alt kullanıcılarını yönetmesi için endpoints.
Sadece can_create_users=True olan kullanıcılar erişebilir.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from db.database import get_db
from models.user import User
from routers.auth import get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


# --- Schemas ---
class CreateSubUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    plan: Optional[str] = "free"
    credits: Optional[int] = 100
    # Sub-user kendi izinlerini ayarlar, ama üst kullanıcının sahip olduklarıyla sınırlı
    can_use_api_tools: Optional[bool] = False
    can_remove_branding: Optional[bool] = False
    can_create_users: Optional[bool] = False
    can_edit_bots: Optional[bool] = False


class UpdateSubUserRequest(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    credits: Optional[int] = None
    can_use_api_tools: Optional[bool] = None
    can_remove_branding: Optional[bool] = None
    can_create_users: Optional[bool] = None
    can_edit_bots: Optional[bool] = None


def require_can_create_users(current_user: User = Depends(get_current_user)) -> User:
    """Sadece can_create_users yetkisi olan kullanıcılar geçer."""
    if not current_user.can_create_users and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Alt kullanıcı oluşturma yetkiniz bulunmuyor."
        )
    return current_user


@router.get("/sub-users")
def list_sub_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_can_create_users),
):
    """Giriş yapan kullanıcının oluşturduğu alt kullanıcıları listeler."""
    sub_users = db.query(User).filter(User.parent_id == current_user.id).all()
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
            "can_edit_bots": getattr(u, 'can_edit_bots', False),
            "parent_id": u.parent_id,
            "created_at": u.created_at,
        }
        for u in sub_users
    ]


@router.post("/sub-users")
def create_sub_user(
    req: CreateSubUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_can_create_users),
):
    """Bir kullanıcı, kendi alt kullanıcısını oluşturur.
    İzinler üst kullanıcının yetkilerini aşamaz.
    """
    # E-posta kontrolü
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    # Üst kullanıcı sahip olmadığı izinleri alt kullanıcıya veremez
    can_use_api = req.can_use_api_tools and current_user.can_use_api_tools
    can_remove_brand = req.can_remove_branding and current_user.can_remove_branding
    # can_create_users: sadece mevcut kullanıcı zaten bu yetkiye sahipse verebilir
    can_create = req.can_create_users and current_user.can_create_users

    new_user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        plan=req.plan,
        role="user",  # Sub-user her zaman normal kullanıcı
        credits=req.credits,
        can_use_api_tools=can_use_api,
        can_remove_branding=can_remove_brand,
        can_create_users=can_create,
        can_edit_bots=req.can_edit_bots and getattr(current_user, 'can_edit_bots', False),
        parent_id=current_user.id,
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
        "can_edit_bots": getattr(new_user, 'can_edit_bots', False),
        "parent_id": new_user.parent_id,
        "created_at": new_user.created_at,
        "message": "Alt kullanıcı başarıyla oluşturuldu",
    }


@router.put("/sub-users/{sub_user_id}")
def update_sub_user(
    sub_user_id: int,
    req: UpdateSubUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_can_create_users),
):
    """Kendi alt kullanıcısını günceller."""
    sub_user = db.query(User).filter(
        User.id == sub_user_id,
        User.parent_id == current_user.id
    ).first()

    if not sub_user:
        raise HTTPException(status_code=404, detail="Alt kullanıcı bulunamadı")

    if req.name is not None:
        sub_user.name = req.name
    if req.plan is not None:
        sub_user.plan = req.plan
    if req.credits is not None:
        sub_user.credits = req.credits
    if req.can_use_api_tools is not None:
        # Üst kullanıcının yetkisini aşamaz
        sub_user.can_use_api_tools = req.can_use_api_tools and current_user.can_use_api_tools
    if req.can_remove_branding is not None:
        sub_user.can_remove_branding = req.can_remove_branding and current_user.can_remove_branding
    if req.can_create_users is not None:
        sub_user.can_create_users = req.can_create_users and current_user.can_create_users
    if req.can_edit_bots is not None:
        sub_user.can_edit_bots = req.can_edit_bots and getattr(current_user, 'can_edit_bots', False)

    db.commit()
    return {"message": "Alt kullanıcı güncellendi"}


@router.delete("/sub-users/{sub_user_id}")
def delete_sub_user(
    sub_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_can_create_users),
):
    """Kendi alt kullanıcısını siler."""
    sub_user = db.query(User).filter(
        User.id == sub_user_id,
        User.parent_id == current_user.id
    ).first()

    if not sub_user:
        raise HTTPException(status_code=404, detail="Alt kullanıcı bulunamadı")

    db.delete(sub_user)
    db.commit()
    return {"message": "Alt kullanıcı silindi"}
