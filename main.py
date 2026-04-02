"""AI Chatbot Platform — FastAPI Entry Point."""
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Rate limiting (optional - install with: pip install slowapi)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    RATE_LIMITING_ENABLED = True
except ImportError:
    RATE_LIMITING_ENABLED = False
    print("⚠️  WARNING: slowapi not installed. Rate limiting disabled. Install with: pip install slowapi")

from db.database import engine, Base
from models import User, Bot, Document, ChatHistory, CrawledPage, BotIntegration, BotTool, InboxConversation, InboxMessage

# Load environment variables
load_dotenv()

# Validate critical environment variables
REQUIRED_ENV_VARS = ["SECRET_KEY"]
missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
if missing_vars:
    raise ValueError(
        f"Missing required environment variables: {', '.join(missing_vars)}. "
        "Please check your .env file."
    )

# Create all tables
Base.metadata.create_all(bind=engine)

# Create upload directory
os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)

app = FastAPI(
    title="AI Chatbot Platform",
    description="Multi-Tenant RAG Chatbot Platform — LangChain + FastAPI + ChromaDB",
    version="1.0.0",
)

# Initialize rate limiter (if available)
if RATE_LIMITING_ENABLED:
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
else:
    limiter = None

# CORS — allow frontend (security: no wildcard)
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

# Mount static files for uploads
os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.getenv("UPLOAD_DIR", "./uploads")), name="uploads")

# Mount static files for widget
os.makedirs("./static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
from routers import auth, bot, train, chat, widget, web_train, integration, analytics, admin, inbox, whatsapp, upload, bot_tools

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(bot.router)
app.include_router(train.router)
app.include_router(chat.router)
app.include_router(widget.router)
app.include_router(web_train.router)
app.include_router(integration.router)
app.include_router(analytics.router)
app.include_router(inbox.router)
app.include_router(whatsapp.router)
app.include_router(upload.router)
app.include_router(bot_tools.router)


@app.get("/")
def root():
    return {
        "name": "AI Chatbot Platform",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
