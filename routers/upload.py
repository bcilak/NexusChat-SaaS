"""Upload router — handles file and image uploads for the chat system."""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from urllib.parse import urljoin

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB — public endpoint; disk doldurma (DoS) koruması

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
        total = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(status_code=400, detail="Dosya çok büyük (maks 10MB).")
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya yüklenirken hata oluştu: {str(e)}")
    finally:
        await file.close()

    # Return the absolute path from root instead of request.base_url which may be wrong behind proxies
    file_url = f"/uploads/{unique_filename}"
    
    return {"url": file_url, "filename": file.filename}
