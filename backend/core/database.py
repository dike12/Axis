from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from core.config import settings

# 1. Create the engine (The bridge to Postgres)
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# 2. Create the Session Factory (How we talk to the database)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# 3. Base class for all your future models (Users, Transactions, etc.)
class Base(AsyncAttrs, DeclarativeBase):
    pass

# 4. Dependency to use in your FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session