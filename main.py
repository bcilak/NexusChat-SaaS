"""AI Chatbot Platform — FastAPI Entry Point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from db.database import engine, Base
from models import User, Bot, Document, ChatHistory, CrawledPage, BotIntegration, BotTool, InboxConversation, InboxMessage

# Load environment variables
load_dotenv()

# Create all tables
Base.metadata.create_all(bind=engine)

# Create upload directory
os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)

app = FastAPI(
    title="AI Chatbot Platform",
    description="Multi-Tenant RAG Chatbot Platform — LangChain + FastAPI + ChromaDB",
    version="1.0.0",
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
