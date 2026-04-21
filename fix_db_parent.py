import sqlite3

try:
    conn = sqlite3.connect('chatbot.db')
    cur = conn.cursor()
    # Find all admins
    cur.execute("SELECT id FROM users WHERE role='admin'")
    admin_ids = [row[0] for row in cur.fetchall()]
    print(f"Admin IDs: {admin_ids}")
    
    if admin_ids:
        # Set parent_id to NULL where parent_id is an admin
        cur.execute(f"UPDATE users SET parent_id = NULL WHERE parent_id IN ({','.join(map(str, admin_ids))})")
        conn.commit()
        print(f"Rows updated: {cur.rowcount}")
    else:
        print("No admins found.")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
