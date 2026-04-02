# AI Chatbot Platform (ChatGenius)

Multi-tenant RAG (Retrieval-Augmented Generation) tabanlı AI chatbot platformu. FastAPI backend, Next.js frontend, ChromaDB vector database ve LangChain entegrasyonu.

## ✨ Özellikler

- 🤖 **Multi-tenant Bot Yönetimi** - Her kullanıcı kendi botlarını oluşturabilir
- 📚 **RAG Pipeline** - Doküman bazlı yanıtlar (Semantic + BM25 hybrid search)
- 🔌 **Multi-LLM Desteği** - OpenAI GPT-4, Google Gemini, Anthropic Claude
- 💬 **WhatsApp Entegrasyonu** - WhatsApp Business API desteği
- 🛒 **E-ticaret Platformları** - WooCommerce, Shopify, Ticimax, IdeaSoft
- 🔧 **Dinamik API Tools** - Runtime'da custom API call desteği
- 🌐 **Web Crawling** - Otomatik web sitesi training
- 📬 **Omnichannel Inbox** - WhatsApp, Web, Instagram desteği
- 🎨 **Widget Entegrasyonu** - Web sitelerine embed edilebilir chat widget

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Python 3.10+
- Node.js 18+
- Redis (Celery için)
- Git

### 1. Backend Kurulumu

```bash
# Repository'yi klonlayın
git clone <your-repo-url>
cd Newbot

# Virtual environment oluşturun
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2. Environment Variables

```bash
# .env.example'ı kopyalayın
copy .env.example .env

# SECRET_KEY oluşturun
python -c "import secrets; print(secrets.token_urlsafe(32))"

# .env dosyasını düzenleyin ve şunları ekleyin:
# - OPENAI_API_KEY (zorunlu)
# - SECRET_KEY (yukarıda oluşturduğunuz)
# - Diğer API keyler (opsiyonel)
```

**Önemli:** `.env` dosyasını asla Git'e commit etmeyin!

### 3. Veritabanı Kurulumu

```bash
# Veritabanı otomatik oluşturulacak
# İlk admin kullanıcısı oluşturun
python create_admin.py

# Email: admin@chatgenius.com
# Password: admin123
```

### 4. Frontend Kurulumu

```bash
cd frontend
npm install
```

### 5. Uygulamayı Çalıştırın

```bash
# Backend (Terminal 1)
cd Newbot
uvicorn main:app --reload --port 8000

# Frontend (Terminal 2)
cd Newbot/frontend
npm run dev

# Redis (Terminal 3 - Celery için)
redis-server

# Celery Worker (Terminal 4 - Opsiyonel, web crawling için)
celery -A services.crawler_tasks worker --loglevel=info
```

Tarayıcınızda açın:
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **Admin Panel:** http://localhost:3000/dashboard

## 🧪 Testleri Çalıştırma

```bash
# Tüm testleri çalıştır
pytest

# Coverage raporu ile
pytest --cov=. --cov-report=html

# HTML coverage raporunu görüntüle
# htmlcov/index.html dosyasını açın

# Belirli bir test dosyasını çalıştır
pytest tests/test_auth.py -v

# Belirli bir testi çalıştır
pytest tests/test_auth.py::test_login_success -v
```

## 📁 Proje Yapısı

```
Newbot/
├── main.py                 # FastAPI entry point
├── requirements.txt        # Python dependencies
├── requirements-dev.txt    # Development dependencies
├── .env                    # Environment variables (GİT'E COMMIT ETMEYİN!)
├── .env.example           # Environment template
│
├── db/                    # Database configuration
│   └── database.py
│
├── models/                # SQLAlchemy models
│   ├── user.py
│   ├── bot.py
│   ├── document.py
│   ├── chat_history.py
│   └── ...
│
├── routers/               # API endpoints
│   ├── auth.py           # Authentication
│   ├── bot.py            # Bot CRUD
│   ├── chat.py           # Chat/RAG
│   ├── train.py          # Document upload
│   ├── whatsapp.py       # WhatsApp webhook
│   └── ...
│
├── services/              # Business logic
│   ├── chat.py           # RAG pipeline
│   ├── embedding.py      # OpenAI embeddings
│   ├── vectordb.py       # ChromaDB operations
│   ├── training.py       # Document processing
│   ├── crawler.py        # Web scraping
│   └── ...
│
├── tests/                 # Test suite
│   ├── conftest.py       # Pytest fixtures
│   ├── test_auth.py      # Auth tests
│   ├── test_bot.py       # Bot tests
│   └── test_security.py  # Security tests
│
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   └── components/   # React components
│   ├── package.json
│   └── ...
│
├── static/                # Widget static files
└── uploads/               # Uploaded documents
```

## 🔐 Güvenlik

### Uygulanan Güvenlik Önlemleri

- ✅ JWT-based authentication (HS256)
- ✅ Bcrypt password hashing
- ✅ Rate limiting (login: 5/min, register: 3/min)
- ✅ CORS whitelist (wildcard kapatıldı)
- ✅ SECRET_KEY validation (32+ karakter zorunlu)
- ✅ Token expiry: 1 saat
- ✅ SQL injection koruması (SQLAlchemy ORM)
- ✅ WhatsApp webhook signature verification
- ✅ Environment variable validation

### Güvenlik Best Practices

1. **API Key'leri asla commit etmeyin**
2. Production'da güçlü SECRET_KEY kullanın
3. HTTPS kullanın (production)
4. Rate limiting ayarlarını güncelleyin
5. Düzenli olarak dependency'leri güncelleyin

## 🔧 Konfigürasyon

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ | - | JWT signing key (32+ chars) |
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key |
| `GOOGLE_API_KEY` | ❌ | - | Google Gemini API key |
| `ANTHROPIC_API_KEY` | ❌ | - | Anthropic Claude API key |
| `DATABASE_URL` | ❌ | `sqlite:///./chatbot.db` | Database connection |
| `ALLOWED_ORIGINS` | ❌ | `localhost:3000` | CORS allowed origins |
| `ENV` | ❌ | `development` | Environment (development/production) |

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Mevcut kullanıcı

### Bots
- `GET /api/bots` - Bot listesi
- `POST /api/bots` - Yeni bot oluştur
- `GET /api/bots/{id}` - Bot detayı
- `PUT /api/bots/{id}` - Bot güncelle
- `DELETE /api/bots/{id}` - Bot sil

### Chat
- `POST /api/chat/{bot_id}` - Chat mesajı gönder
- `GET /api/chat/{bot_id}/history` - Chat geçmişi

### Training
- `POST /api/train/{bot_id}/upload` - Doküman yükle
- `POST /api/web-train/{bot_id}/crawl` - URL'den training
- `GET /api/train/{bot_id}/documents` - Doküman listesi

Tüm endpoint'ler için: http://localhost:8000/docs

## 🐛 Sorun Giderme

### "SECRET_KEY must be set" Hatası
```bash
# SECRET_KEY oluşturun
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Çıktıyı .env dosyasına ekleyin
```

### "OPENAI_API_KEY" Hatası
.env dosyasında geçerli bir OpenAI API key olduğundan emin olun.

### Test Hataları
```bash
# Test database'i temizleyin
rm chatbot.db
python create_admin.py
pytest
```

### Rate Limiting Hataları
Test sırasında rate limiting hatası alırsanız 1 dakika bekleyin veya `slowapi` konfigürasyonunu ayarlayın.

## 📝 Lisans

[MIT License](LICENSE)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📧 İletişim

- **Email:** support@chatgenius.com
- **Documentation:** [docs.chatgenius.com](https://docs.chatgenius.com)

---

**⚡ Built with FastAPI, LangChain, and Next.js**
