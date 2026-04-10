from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from dotenv import load_dotenv
from pathlib import Path

# Project root = the folder that contains /src
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv()

class Settings(BaseSettings):
    # API
    COHERE_API_KEY : str = "19MjvHoHZkaLnJMY2xJ6a3VFUuUvi6g2NCf6QkeG"
    GENERATION_MODEL_ID : str = "command-a-03-2025"
    EMBEDDING_MODEL_ID : str = "intfloat/multilingual-e5-small"
    TOP_K : int = 4
    # Paths
    FAISS_INDEX_PATH: str = str(PROJECT_ROOT / "data" / "index" / "skin_disease.index")
    METADATA_PATH: str = str(PROJECT_ROOT / "data" / "index" / "skin_disease_metadata.json")
    HF_HOME: str = str(Path.home() / ".cache" / "huggingface")


    model_config = SettingsConfigDict(
        extra="allow"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()