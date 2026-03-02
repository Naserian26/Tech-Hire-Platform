from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.api.v1 import auth, employer, jobs, seeker, ai, ai
from app.websocket import manager

app = FastAPI()

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

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["auth"])
app.include_router(employer.router, prefix="/api/v1/employer", tags=["employer"])
app.include_router(jobs.router,     prefix="/api/v1/jobs",     tags=["jobs"])
app.include_router(seeker.router,   prefix="/api/v1/seeker",   tags=["seeker"])
app.include_router(ai.router,       prefix="/api/v1/ai",       tags=["ai"])

@app.get("/")
def read_root():
    return {"status": "TechHire API Running"}