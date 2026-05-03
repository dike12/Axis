from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from modules.auth.models import User
from modules.transactions.router import router as transactions_router

app = FastAPI(title="Axis Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://172.18.0.2:5173"], # Allow your Vite frontend
    allow_credentials=True,
    allow_methods=["*"], # Allow GET, POST, PUT, DELETE
    allow_headers=["*"],
)

app.include_router(transactions_router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    return  {"status": "online", "db": "connected"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)