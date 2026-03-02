from fastapi import WebSocket
from typing import Dict
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: str):
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                disconnected.append(user_id)
        for user_id in disconnected:
            self.disconnect(user_id)

manager = ConnectionManager()