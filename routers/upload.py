"""Upload router — handles file and image uploads for the chat system."""
import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from urllib.parse import urljoin

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Determine the base URL for constructing full file URLs.
# In production, this should ideally come from an environment variable (e.g., API_BASE_URL).
API_BASE_URL = os.getenv("API_BASE_URL", "")


@router.post("")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Upload a file and return its public URL."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adı bulunamadı")

    # Generate a unique filename using UUID to avoid collisions
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    # Optional: Validate file extensions if needed
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt", ".csv"}
    if file_ext and file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Desteklenmeyen dosya formatı: {file_ext}")

    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya yüklenirken hata oluştu: {str(e)}")
    finally:
        file.file.close()

    # Return the absolute path from root instead of request.base_url which may be wrong behind proxies
    file_url = f"/uploads/{unique_filename}"
    
    return {"url": file_url, "filename": file.filename}
