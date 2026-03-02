from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/techhire"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Email
    SES_FROM_EMAIL: str = "noreply@techhire.io"
    FRONTEND_URL: str = "http://localhost:3000"

@lru_cache()
def get_settings():
    return Settings()