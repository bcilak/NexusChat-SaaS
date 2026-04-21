# -*- coding: utf-8 -*-
"""
Mevcut veritabanina yeni kullanici sutunlarini ekler:
  - parent_id  (INTEGER, nullable, FK users.id)
  - can_create_users (BOOLEAN, default False)
"""
import sqlite3
import os
import sys

# Windows encoding fix
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./chatbot.db").replace("sqlite:///", "").replace("./", "")
DB_FILE = DB_PATH if os.path.isabs(DB_PATH) else os.path.join(os.path.dirname(os.path.abspath(__file__)), DB_PATH)

print(f"Veritabani: {DB_FILE}")

conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()

# Mevcut sutunlari kontrol et
cur.execute("PRAGMA table_info(users)")
columns = [row[1] for row in cur.fetchall()]
print(f"Mevcut sutunlar: {columns}")

added = []

if "parent_id" not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN parent_id INTEGER REFERENCES users(id)")
    added.append("parent_id")
    print("OK: parent_id sutunu eklendi")
else:
    print("INFO: parent_id zaten mevcut")

if "can_create_users" not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN can_create_users BOOLEAN DEFAULT 0 NOT NULL")
    added.append("can_create_users")
    print("OK: can_create_users sutunu eklendi")
else:
    print("INFO: can_create_users zaten mevcut")

# Eski sutunlari da kontrol et (credits, can_use_api_tools, can_remove_branding)
if "credits" not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 500")
    added.append("credits")
    print("OK: credits sutunu eklendi")

if "can_use_api_tools" not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN can_use_api_tools BOOLEAN DEFAULT 0 NOT NULL")
    added.append("can_use_api_tools")
    print("OK: can_use_api_tools sutunu eklendi")

if "can_remove_branding" not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN can_remove_branding BOOLEAN DEFAULT 0 NOT NULL")
    added.append("can_remove_branding")
    print("OK: can_remove_branding sutunu eklendi")

conn.commit()
conn.close()

if added:
    print(f"\nMigration tamamlandi. Eklenen sutunlar: {', '.join(added)}")
else:
    print("\nVeritabani guncel, herhangi bir degisiklik yapilmadi.")

