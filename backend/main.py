from fastapi import FastAPI, Depends
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from core.database import get_db
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


from modules.auth.models import User
from modules.transactions.router import router as transactions_router
from modules.budget.router import router as budget_router
from modules.analysis.router import router as analysis_router

app = FastAPI(title="Axis Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://172.18.0.2:5173"], # Allow your Vite frontend
    allow_credentials=True,
    allow_methods=["*"], # Allow GET, POST, PUT, DELETE
    allow_headers=["*"],
)

app.include_router(transactions_router, prefix="/api/v1")
app.include_router(budget_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1/analysis")

@app.get("/api/v1/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "online", "db": "connected"}
    except Exception as e:
        return {"status": "online", "db": f"FAILED: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)