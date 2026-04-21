"""Training router — file upload and training pipeline endpoints."""
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from db.database import get_db
from models.bot import Bot
from models.document import Document
from models.user import User
from routers.auth import get_current_user
from routers.bot import get_user_bot
from services.training import train_all_documents

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

router = APIRouter(prefix="/api/bots/{bot_id}", tags=["training"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt", "xlsx", "xls", "csv"}


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


class DocumentResponse(BaseModel):
    id: int
    file_name: str
    file_type: str
    chunk_count: int
    is_trained: bool
    created_at: str


@router.post("/upload")
async def upload_file(
    bot_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)

    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya türü: {ext}. İzin verilenler: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Save file to disk
    bot_upload_dir = os.path.join(UPLOAD_DIR, str(bot_id))
    os.makedirs(bot_upload_dir, exist_ok=True)

    file_path = os.path.join(bot_upload_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create document record
    doc = Document(
        bot_id=bot_id,
        file_name=file.filename,
        file_type=ext,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "file_type": doc.file_type,
        "message": f"'{file.filename}' yüklendi. Eğitim başlatmak için /train endpoint'ini kullanın.",
    }


@router.post("/train")
def train_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    result = train_all_documents(bot.id, db, UPLOAD_DIR, retrain=False)
    return result


@router.post("/retrain")
def retrain_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    result = train_all_documents(bot.id, db, UPLOAD_DIR, retrain=True)
    return result


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db)
    docs = db.query(Document).filter(Document.bot_id == bot_id).order_by(Document.created_at.desc()).all()
    return [
        DocumentResponse(
            id=d.id,
            file_name=d.file_name,
            file_type=d.file_type,
            chunk_count=d.chunk_count,
            is_trained=d.is_trained,
            created_at=d.created_at.isoformat() if d.created_at else "",
        )
        for d in docs
    ]


@router.delete("/documents/{doc_id}")
def delete_document(
    bot_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = get_user_bot(bot_id, current_user, db, require_can_edit=True)
    doc = db.query(Document).filter(Document.id == doc_id, Document.bot_id == bot_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Döküman bulunamadı")

    # Delete file from disk
    file_path = os.path.join(UPLOAD_DIR, str(bot_id), doc.file_name)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(doc)
    db.commit()
    return {"detail": "Döküman silindi"}
