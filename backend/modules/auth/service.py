import uuid
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


from modules.auth.models import User
from modules.auth.schemas import UserRegister, UserLogin
from modules.settings.models import UserSettings



async def register_user(db: AsyncSession, data: UserRegister) -> User | None:
    # Validate email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        return None 
        
    # FIX: Use raw bcrypt instead of passlib
    # Generate salt and hash the password (cost factor 12 is built-in)
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(data.password.encode('utf-8'), salt)
    
    new_user = User(
        email=data.email,
        name=data.name,
        # Decode the bytes back to a string so PostgreSQL can store it in the TEXT column
        hashed_password=hashed_bytes.decode('utf-8') 
    )
    
    db.add(new_user)
    await db.flush() 
    
    # Auto-create default user_settings row
    db.add(UserSettings(user_id=new_user.id))
    
    await db.commit()
    await db.refresh(new_user)
    return new_user

async def authenticate_user(db: AsyncSession, data: UserLogin) -> User | None:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password:
        return None
        
    # FIX: Use raw bcrypt verify
    # Encode strings back to bytes for the C-library comparison
    is_valid = bcrypt.checkpw(
        data.password.encode('utf-8'), 
        user.hashed_password.encode('utf-8')
    )
    
    if not is_valid:
        return None
        
    return user