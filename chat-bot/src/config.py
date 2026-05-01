from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from dotenv import load_dotenv
from pathlib import Path

# Project root = the folder that contains /src
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv()

class Settings(BaseSettings):
    # API
    COHERE_API_KEY : str =""
    GENERATION_MODEL_ID : str = "command-a-03-2025"

    model_config = SettingsConfigDict(
        extra="allow"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()