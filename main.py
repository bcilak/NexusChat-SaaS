"""AI Chatbot Platform — FastAPI Entry Point."""
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Rate limiting — paylaşılan limiter örneği (routers/auth.py ile aynı olmalı)
from rate_limit import limiter, RATE_LIMITING_ENABLED
if RATE_LIMITING_ENABLED:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
else:
    print("WARNING: slowapi not installed. Rate limiting disabled. Install with: pip install slowapi")

from db.database import engine, Base
from models import User, Bot, Document, ChatHistory, CrawledPage, BotIntegration, BotTool, InboxConversation, InboxMessage, Ticket, ContactRequest, Product

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
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — widget her müşteri sitesinden erişildiği için origin serbest.
# Kimlik doğrulama Bearer token (Authorization header) ile yapılıyor, cookie kullanılmıyor;
# bu yüzden allow_credentials=False. ("*" + credentials=True tarayıcıda geçersiz bir kombinasyon.)
ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# Mount static files for uploads
os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.getenv("UPLOAD_DIR", "./uploads")), name="uploads")

# Mount static files for widget
os.makedirs("./static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# widget.js önbelleklenmesin — panel değişiklikleri müşteri sitelerine anında ulaşsın
@app.middleware("http")
async def widget_no_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/widget.js") or request.url.path.startswith("/api/widget/"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response

# Include routers
from routers import auth, bot, train, chat, widget, web_train, integration, analytics, admin, inbox, whatsapp, upload, bot_tools, contact, users, feed

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
app.include_router(contact.router)
app.include_router(users.router)
app.include_router(feed.router)


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
