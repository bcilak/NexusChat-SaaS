
import sys

with open("routers/whatsapp.py", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update receive_webhook
old_webhook_block = """                            if msg_type == "text":
                                text = msg["text"]["body"]
                            elif msg_type == "image":
                                media_id = msg["image"]["id"]
                                caption = msg["image"].get("caption", "")
                                text = f"[\U0001f4f7 Resim] {caption}".strip() if caption else "[\U0001f4f7 Resim gönderildi]"
                                # Download media in background for future use
                                background_tasks.add_task(handle_media_message, media_id, msg_type, phone_number_id, db)
                            elif msg_type == "video":
                                caption = msg["video"].get("caption", "")
                                text = f"[\U0001f3ac Video] {caption}".strip() if caption else "[\U0001f3ac Video gönderildi]"
                            elif msg_type == "audio":
                                text = "[\U0001f3b5 Sesli mesaj gönderildi]"
                            elif msg_type == "document":
                                filename = msg["document"].get("filename", "belge")
                                text = f"[\U0001f4c4 Belge: {filename}]\""""

new_webhook_block = """                            media_id = None
                            filename = None

                            if msg_type == "text":
                                text = msg["text"]["body"]
                            elif msg_type == "image":
                                media_id = msg["image"]["id"]
                                caption = msg["image"].get("caption", "")
                                text = f"[\U0001f4f7 Resim] {caption}".strip() if caption else "[\U0001f4f7 Resim gönderildi]"
                            elif msg_type == "video":
                                media_id = msg["video"]["id"]
                                caption = msg["video"].get("caption", "")
                                text = f"[\U0001f3ac Video] {caption}".strip() if caption else "[\U0001f3ac Video gönderildi]"
                            elif msg_type == "audio":
                                media_id = msg["audio"]["id"]
                                text = "[\U0001f3b5 Sesli mesaj gönderildi]"
                            elif msg_type == "document":
                                media_id = msg["document"]["id"]
                                filename = msg["document"].get("filename", "belge")
                                text = f"[\U0001f4c4 Belge: {filename}]\""""

if old_webhook_block in text:
    print("webhook block found")
else:
    print("webhook block NOT found")
    
