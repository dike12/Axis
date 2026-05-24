import uuid
from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.auth import create_access_token, get_current_user_id
from modules.auth import service, schemas
from modules.auth.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

def error_response(code: str, message: str, status_code: int = 400):
    """Helper to enforce strict JSON envelope for errors """
    return JSONResponse(
        status_code=status_code,
        content={"data": None, "error": {"code": code, "message": message}, "meta": None}
    )

@router.post("/register")
async def register(data: schemas.UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    user = await service.register_user(db, data)
    if not user:
        return error_response("BAD_REQUEST", "Email already registered", 400)
        
    # Issue JWT Cookie [cite: 116]
    token = create_access_token(user.id)
    response.set_cookie(key="axis_session", value=token, httponly=True, samesite="lax", max_age=7*24*3600)
    
    return {"data": schemas.UserResponse.model_validate(user).model_dump(), "error": None, "meta": {"message": "Registration successful"}}

@router.post("/login")
async def login(data: schemas.UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    user = await service.authenticate_user(db, data)
    if not user:
        # Return 401 on mismatch, never reveal whether email exists 
        return error_response("UNAUTHORIZED", "Invalid email or password", 401)
        
    # Issue JWT Cookie 
    token = create_access_token(user.id)
    response.set_cookie(key="axis_session", value=token, httponly=True, samesite="lax", max_age=7*24*3600)
    
    return {"data": schemas.UserResponse.model_validate(user).model_dump(), "error": None, "meta": {"message": "Login successful"}}

@router.post("/logout")
async def logout(response: Response):
    # Clear session cookie [cite: 38]
    response.delete_cookie("axis_session")
    return {"data": None, "error": None, "meta": {"message": "Logged out successfully"}}

@router.get("/me")
async def get_me(db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return error_response("NOT_FOUND", "User not found", 404)
        
    return {"data": schemas.UserResponse.model_validate(user).model_dump(), "error": None, "meta": None}