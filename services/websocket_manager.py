from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps bot_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, bot_id: int, websocket: WebSocket):
        await websocket.accept()
        if bot_id not in self.active_connections:
            self.active_connections[bot_id] = []
        self.active_connections[bot_id].append(websocket)

    def disconnect(self, bot_id: int, websocket: WebSocket):
        if bot_id in self.active_connections:
            if websocket in self.active_connections[bot_id]:
                self.active_connections[bot_id].remove(websocket)
            if not self.active_connections[bot_id]:
                del self.active_connections[bot_id]

    async def broadcast_to_bot(self, bot_id: int, message: dict):
        if bot_id in self.active_connections:
            for connection in self.active_connections[bot_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to websocket: {e}")

manager = ConnectionManager()
