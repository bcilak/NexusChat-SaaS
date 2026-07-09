import sqlite3
import os

def upgrade_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatbot.db')
    print(f"Upgrading DB at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Users table
    user_columns = [
        ("role", "VARCHAR(50) DEFAULT 'user'"),
        ("credits", "INTEGER DEFAULT 500"),
        ("can_use_api_tools", "BOOLEAN DEFAULT 0"),
        ("can_remove_branding", "BOOLEAN DEFAULT 0")
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
        ("whatsapp_verify_token", "VARCHAR(100)"),
        ("whatsapp_welcome_message", "TEXT"),
        # Widget appearance & behavior
        ("subtitle", "VARCHAR(200)"),
        ("theme_mode", "VARCHAR(10) DEFAULT 'dark'"),
        ("show_home_screen", "BOOLEAN DEFAULT 0"),
        ("privacy_url", "VARCHAR(500)"),
        ("widget_position", "VARCHAR(10) DEFAULT 'right'"),
        ("auto_open_delay", "INTEGER DEFAULT 0"),
        ("proactive_message", "TEXT"),
        ("branding_visible", "BOOLEAN DEFAULT 1"),
        ("sound_enabled", "BOOLEAN DEFAULT 0"),
        ("hero_header", "BOOLEAN DEFAULT 0"),
        ("feed_url", "VARCHAR(1000)"),
        ("feed_last_sync", "DATETIME")
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
        ("is_fallback", "BOOLEAN DEFAULT 0"),
        ("platform", "VARCHAR(50) DEFAULT 'web'"),
        ("is_spam", "BOOLEAN DEFAULT 0"),
        ("ip_address", "VARCHAR(100)")
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
    
    # Create banned_ips table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS banned_ips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address VARCHAR(255) UNIQUE,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_banned_ips_ip_address ON banned_ips (ip_address)")
        print("Created banned_ips table.")
    except Exception as e:
        print(f"Error creating banned_ips table: {e}")
        
    # Create products table (ürün feed senkronizasyonu)
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id INTEGER NOT NULL,
            external_id VARCHAR(200),
            title VARCHAR(500) NOT NULL,
            description TEXT,
            price FLOAT,
            sale_price FLOAT,
            currency VARCHAR(10) DEFAULT 'TRY',
            stock VARCHAR(50),
            image_url VARCHAR(1000),
            product_url VARCHAR(1000),
            category VARCHAR(500),
            brand VARCHAR(200),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id)
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_bot_id ON products (bot_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_external_id ON products (external_id)")
        print("Created products table.")
    except Exception as e:
        print(f"Error creating products table: {e}")

    conn.commit()
    conn.close()
    print("DB upgrade completed.")

if __name__ == '__main__':
    upgrade_db()
