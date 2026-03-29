import sqlite3
import os

def upgrade_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatbot.db')
    print(f"Upgrading DB at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Users table
    user_columns = [
        ("role", "VARCHAR(50) DEFAULT 'user'")
    ]
    
    for col_name, col_def in user_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
            print(f"Added {col_name} to users.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists in users.")
            else:
                pass
                
    # Bots table
    bot_columns = [
        ("theme_color", "VARCHAR(20) DEFAULT '#000000'"),
        ("text_color", "VARCHAR(20) DEFAULT '#FFFFFF'"),
        ("logo_url", "VARCHAR(500)"),
        ("welcome_message", "TEXT DEFAULT 'Merhaba, size nasıl yardımcı olabilirim?'"),
        ("example_questions", "TEXT"),
        ("whatsapp_phone_id", "VARCHAR(100)"),
        ("whatsapp_token", "VARCHAR(500)"),
        ("whatsapp_verify_token", "VARCHAR(100)")
    ]
    
    for col_name, col_def in bot_columns:
        try:
            cursor.execute(f"ALTER TABLE bots ADD COLUMN {col_name} {col_def}")
            print(f"Added {col_name} to bots.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists in bots.")
            else:
                pass
                
    # ChatHistory table
    chat_columns = [
        ("is_liked", "BOOLEAN"),
        ("is_fallback", "BOOLEAN DEFAULT 0")
    ]
    
    for col_name, col_def in chat_columns:
        try:
            cursor.execute(f"ALTER TABLE chat_history ADD COLUMN {col_name} {col_def}")
            print(f"Added {col_name} to chat_history.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists in chat_history.")
            else:
                pass
                
    conn.commit()
    conn.close()
    print("DB upgrade completed.")

if __name__ == '__main__':
    upgrade_db()
