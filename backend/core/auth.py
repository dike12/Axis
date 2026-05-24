import os
import uuid
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException

# Secret key for signing session JWTs [cite: 127]
SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "super-secret-local-dev-key")
ALGORITHM = "HS256"

def create_access_token(user_id: uuid.UUID) -> str:
    """Creates a JWT token valid for 7 days [cite: 119]"""
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user_id(request: Request) -> uuid.UUID:
    """Dependency to extract the user_id from the secure HTTP-only cookie [cite: 118]"""
    token = request.cookies.get("axis_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid session token")
        return uuid.UUID(user_id_str)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")