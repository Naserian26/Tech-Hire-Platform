from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.core.websocket_manager import manager  # ✅ fixed import
from app.api.v1.router import api_router        # ✅ single router import


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()       # startup
    yield
    await close_mongo_connection() # shutdown


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


app.include_router(api_router, prefix="/api/v1")  # ✅ single clean include


@app.get("/")
def read_root():
    return {"status": "TechHire API Running"}