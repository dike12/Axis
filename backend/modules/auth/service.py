import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext

from modules.auth.models import User
from modules.auth.schemas import UserRegister, UserLogin
from modules.settings.models import UserSettings

# Bcrypt with cost factor 12 as strictly defined in Section 5.1 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

async def register_user(db: AsyncSession, data: UserRegister) -> User | None:
    # Validate email uniqueness 
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        return None 
        
    new_user = User(
        email=data.email,
        name=data.name,
        hashed_password=pwd_context.hash(data.password)
    )
    db.add(new_user)
    await db.flush() # Flush to generate the new ID
    
    # Auto-create default user_settings row [cite: 116]
    db.add(UserSettings(user_id=new_user.id))
    
    await db.commit()
    await db.refresh(new_user)
    return new_user

async def authenticate_user(db: AsyncSession, data: UserLogin) -> User | None:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    # Verify password against bcrypt hash 
    if not user or not user.hashed_password or not pwd_context.verify(data.password, user.hashed_password):
        return None
    return user