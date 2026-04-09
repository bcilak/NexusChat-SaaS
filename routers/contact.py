from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db.database import get_db
from models.contact_request import ContactRequest
from routers.auth import get_current_admin
from pydantic import BaseModel, EmailStr
from datetime import datetime

router = APIRouter(prefix="/api/contact", tags=["Contact"])

class ContactRequestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str = None
    company: str = None
    message: str = None
    request_type: str = "demo"

class ContactRequestResponse(ContactRequestCreate):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.post("", response_model=ContactRequestResponse, description="Genel form isteği oluştur")
def create_contact_request(req: ContactRequestCreate, db: Session = Depends(get_db)):
    db_req = ContactRequest(
        name=req.name,
        email=req.email,
        phone=req.phone,
        company=req.company,
        message=req.message,
        request_type=req.request_type,
        status="bekliyor"
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

@router.get("/admin", response_model=List[ContactRequestResponse], description="Admin: Tüm form isteklerini getir")
def get_all_requests(db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    return db.query(ContactRequest).order_by(ContactRequest.created_at.desc()).all()

class ContactRequestUpdate(BaseModel):
    status: str

@router.put("/admin/{request_id}", response_model=ContactRequestResponse, description="Admin: Form durumu güncelle")
def update_request_status(request_id: str, update_data: ContactRequestUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    db_req = db.query(ContactRequest).filter(ContactRequest.id == request_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    db_req.status = update_data.status
    db_req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_req)
    return db_req
