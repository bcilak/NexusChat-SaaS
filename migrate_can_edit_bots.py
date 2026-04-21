# -*- coding: utf-8 -*-
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

cur.execute("PRAGMA table_info(users)")
columns = [row[1] for row in cur.fetchall()]

if "can_edit_bots" not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN can_edit_bots BOOLEAN DEFAULT 0 NOT NULL")
    print("OK: can_edit_bots sutunu eklendi")
else:
    print("INFO: can_edit_bots zaten mevcut")

conn.commit()
conn.close()
print("Migration tamamlandi.")
