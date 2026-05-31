from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    DATABASE_URL: str
    SESSION_SECRET_KEY: str  
    ALPHA_VANTAGE_API_KEY: str  
    CORS_ORIGINS: str  



settings = Settings()