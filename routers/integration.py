from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from models.bot import Bot
from models.bot_integration import BotIntegration
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


class IntegrationCreate(BaseModel):
    bot_id: int
    provider: str
    api_url: str
    api_key: str
    api_secret: Optional[str] = None
    meta_data: Optional[str] = None


class IntegrationUpdate(BaseModel):
    provider: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: Optional[bool] = None
    meta_data: Optional[str] = None


class IntegrationResponse(BaseModel):
    id: int
    bot_id: int
    provider: str
    api_url: str
    api_key: str
    api_secret: Optional[str] = None
    is_active: bool
    meta_data: Optional[str] = None


def integration_to_response(intg: BotIntegration) -> IntegrationResponse:
    return IntegrationResponse(
        id=intg.id,
        bot_id=intg.bot_id,
        provider=intg.provider,
        api_url=intg.api_url,
        api_key=intg.api_key,
        api_secret=intg.api_secret,
        is_active=intg.is_active,
        meta_data=intg.meta_data,
    )


@router.post("", response_model=IntegrationResponse)
def create_integration(
    req: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify exact bot ownership
    bot = db.query(Bot).filter(Bot.id == req.bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=403, detail="Bot bulunamadı veya yetkisiz erişim")

    # Check if this bot already has this provider integration (optional logic step, usually 1 woo per bot)
    existing = db.query(BotIntegration).filter(BotIntegration.bot_id == req.bot_id, BotIntegration.provider == req.provider).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Bot için zaten {req.provider} entegrasyonu mevcut.")

    integration = BotIntegration(**req.model_dump())
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration_to_response(integration)


@router.get("/bot/{bot_id}", response_model=List[IntegrationResponse])
def get_bot_integrations(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
        
    integrations = db.query(BotIntegration).filter(BotIntegration.bot_id == bot_id).all()
    return [integration_to_response(i) for i in integrations]


@router.put("/{integration_id}", response_model=IntegrationResponse)
def update_integration(
    integration_id: int,
    req: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    integration = db.query(BotIntegration).join(Bot).filter(
        BotIntegration.id == integration_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")
        
    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(integration, k, v)
        
    db.commit()
    db.refresh(integration)
    return integration_to_response(integration)


@router.delete("/{integration_id}")
def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    integration = db.query(BotIntegration).join(Bot).filter(
        BotIntegration.id == integration_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")
        
    db.delete(integration)
    db.commit()
    return {"detail": "Entegrasyon silindi"}
