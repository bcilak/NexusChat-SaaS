with open('routers/bot.py', 'r', encoding='utf-8') as f:
    text = f.read()

endpoint = '''
@router.get("/{bot_id}/tickets")
def list_bot_tickets(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.ticket import Ticket
    bot = get_user_bot(bot_id, current_user, db)
    tickets = db.query(Ticket).filter(Ticket.bot_id == bot.id).order_by(Ticket.created_at.desc()).all()
    
    return [
        {
            "id": t.id,
            "contact_id": t.contact_id,
            "order_number": t.order_number,
            "product_name": t.product_name,
            "damage_summary": t.damage_summary,
            "platform": t.platform,
            "image_url": t.image_url,
            "status": t.status,
            "created_at": t.created_at.isoformat() if hasattr(t, 'created_at') and t.created_at else ""
        }
        for t in tickets
    ]
'''

text += endpoint

with open('routers/bot.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
