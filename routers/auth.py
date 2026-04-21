import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limiting (optional)
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMITING_ENABLED = True
except ImportError:
    RATE_LIMITING_ENABLED = False
    limiter = None

# --- Config ---
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise ValueError(
        "SECRET_KEY must be set in .env and at least 32 characters long. "
        "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour (was 7 days - security risk)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# --- Schemas ---
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    plan: str
    role: str
    credits: int
    can_use_api_tools: bool
    can_remove_branding: bool
    can_create_users: bool
    parent_id: Optional[int] = None


# --- Helpers ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz kimlik bilgileri",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yönetici yetkisi gereklidir."
        )
    return current_user


# --- Endpoints ---
@router.post("/register", response_model=TokenResponse)
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email, "plan": user.plan, "role": user.role, "credits": user.credits, "can_use_api_tools": user.can_use_api_tools, "can_remove_branding": user.can_remove_branding, "can_create_users": user.can_create_users, "parent_id": user.parent_id},
    )


@router.post("/login", response_model=TokenResponse)
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email, "plan": user.plan, "role": user.role, "credits": user.credits, "can_use_api_tools": user.can_use_api_tools, "can_remove_branding": user.can_remove_branding, "can_create_users": user.can_create_users, "parent_id": user.parent_id},
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        plan=current_user.plan,
        role=current_user.role,
        credits=current_user.credits,
        can_use_api_tools=current_user.can_use_api_tools,
        can_remove_branding=current_user.can_remove_branding,
        can_create_users=current_user.can_create_users,
        parent_id=current_user.parent_id,
    )
