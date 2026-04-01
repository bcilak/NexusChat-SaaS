"""Bot API Tools router — CRUD + live test endpoint."""
import json
import requests as http_requests
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.bot import Bot
from models.bot_tool import BotTool
from routers.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/api/bots", tags=["bot-tools"])


# ──────────────────────────── Schemas ────────────────────────────

class BotToolCreate(BaseModel):
    name: str
    display_name: str
    description: str
    api_url: str
    method: str = "GET"
    headers: str = "{}"
    query_params: str = "{}"
    body_template: str = ""
    response_path: str = ""
    response_template: str = ""
    is_active: bool = True


class BotToolUpdate(BotToolCreate):
    pass


class TestToolRequest(BaseModel):
    api_url: str
    method: str = "GET"
    headers: str = "{}"
    query_params: str = "{}"
    body_template: str = ""
    response_path: str = ""
    response_template: str = ""
    query: str = ""          # {query} placeholder'ının yerine geçer


# ──────────────────────────── Helpers ────────────────────────────

def _get_bot_or_404(bot_id: int, db: Session, user: User) -> Bot:
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı.")
    return bot


def _resolve(template: str, query: str) -> str:
    """Replace {query} placeholder in url / params / body."""
    return template.replace("{query}", query)


def _get_nested(data: Any, path: str) -> Any:
    """Dot-notation JSON path: 'main.temp' or 'weather.0.description'"""
    parts = path.strip().split(".")
    cur = data
    for part in parts:
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def _call_api(payload: TestToolRequest) -> dict:
    """Make the HTTP call and return structured result."""
    query = payload.query or "test"
    url = _resolve(payload.api_url, query)

    try:
        headers = json.loads(payload.headers or "{}")
    except Exception:
        headers = {}

    try:
        raw_params = json.loads(payload.query_params or "{}")
        params = {k: _resolve(str(v), query) for k, v in raw_params.items()}
    except Exception:
        params = {}

    try:
        if payload.method.upper() == "POST":
            body_str = _resolve(payload.body_template or "{}", query)
            body = json.loads(body_str)
            resp = http_requests.post(url, json=body, headers=headers, timeout=10)
        else:
            resp = http_requests.get(url, params=params, headers=headers, timeout=10)
    except http_requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="API isteği zaman aşımına uğradı (10 sn).")
    except http_requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="API adresine bağlanılamadı. URL'yi kontrol edin.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API isteği başarısız: {str(e)}")

    try:
        json_data = resp.json()
    except Exception:
        raise HTTPException(status_code=422, detail=f"API JSON döndürmedi. Yanıt: {resp.text[:300]}")

    # Extract specified paths
    extracted: Dict[str, Any] = {}
    if payload.response_path:
        for path in payload.response_path.split(","):
            path = path.strip()
            if path:
                extracted[path] = _get_nested(json_data, path)

    # Apply template
    formatted = payload.response_template or ""
    for path, value in extracted.items():
        formatted = formatted.replace("{" + path + "}", str(value) if value is not None else "N/A")

    return {
        "status_code": resp.status_code,
        "raw_response": json_data,
        "extracted": extracted,
        "formatted": formatted,
        "success": resp.ok,
    }


# ──────────────────────────── Endpoints ────────────────────────────

@router.get("/{bot_id}/tools")
def list_tools(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    tools = db.query(BotTool).filter(BotTool.bot_id == bot_id).order_by(BotTool.id).all()
    return tools


@router.post("/{bot_id}/tools", status_code=status.HTTP_201_CREATED)
def create_tool(bot_id: int, payload: BotToolCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    tool = BotTool(bot_id=bot_id, **payload.dict())
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool


@router.put("/{bot_id}/tools/{tool_id}")
def update_tool(bot_id: int, tool_id: int, payload: BotToolUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    tool = db.query(BotTool).filter(BotTool.id == tool_id, BotTool.bot_id == bot_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Araç bulunamadı.")
    for k, v in payload.dict().items():
        setattr(tool, k, v)
    db.commit()
    db.refresh(tool)
    return tool


@router.delete("/{bot_id}/tools/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tool(bot_id: int, tool_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    tool = db.query(BotTool).filter(BotTool.id == tool_id, BotTool.bot_id == bot_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Araç bulunamadı.")
    db.delete(tool)
    db.commit()


@router.patch("/{bot_id}/tools/{tool_id}/toggle")
def toggle_tool(bot_id: int, tool_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_bot_or_404(bot_id, db, current_user)
    tool = db.query(BotTool).filter(BotTool.id == tool_id, BotTool.bot_id == bot_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Araç bulunamadı.")
    tool.is_active = not tool.is_active
    db.commit()
    return {"id": tool.id, "is_active": tool.is_active}


@router.post("/{bot_id}/tools/test")
def test_tool(bot_id: int, payload: TestToolRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """API'yi canlı olarak test et — yanıtı ve ayrıştırılan alanları döndür."""
    _get_bot_or_404(bot_id, db, current_user)
    return _call_api(payload)
