import os

# Load settings BEFORE any other imports
from config import get_settings
settings = get_settings()

# Must be set before any HF import
os.environ.setdefault("HF_HOME", settings.HF_HOME)

print("=" * 50)
print("Current working directory:", os.getcwd())
print(f"HF_HOME: {settings.HF_HOME}")
print(f"FAISS_INDEX_PATH: {settings.FAISS_INDEX_PATH}")
print(f"METADATA_PATH: {settings.METADATA_PATH}")
print(f"File exists check:")
print(f"  - FAISS index exists: {os.path.exists(settings.FAISS_INDEX_PATH)}")
print(f"  - Metadata exists: {os.path.exists(settings.METADATA_PATH)}")
print("=" * 50)

import logging
import colorlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.llm_service import CohereProvider, HuggingFaceProvider
from services.rag_service import RAGService
from api.routes import router

# ── Logging ───────────────────────────────────────────────────
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    "%(log_color)s%(levelname)-8s%(reset)s | %(name)s | %(message)s"
))
logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — loading models and index...")
    
    try:
        # Check if files exist
        if not os.path.exists(settings.FAISS_INDEX_PATH):
            logger.error(f"FAISS index not found at: {settings.FAISS_INDEX_PATH}")
            # List directory contents for debugging
            data_dir = "/app/data"
            if os.path.exists(data_dir):
                logger.info(f"Contents of {data_dir}: {os.listdir(data_dir)}")
                index_dir = f"{data_dir}/index"
                if os.path.exists(index_dir):
                    logger.info(f"Contents of {index_dir}: {os.listdir(index_dir)}")
            raise FileNotFoundError(f"FAISS index missing: {settings.FAISS_INDEX_PATH}")
        
        if not os.path.exists(settings.METADATA_PATH):
            logger.error(f"Metadata file not found at: {settings.METADATA_PATH}")
            raise FileNotFoundError(f"Metadata missing: {settings.METADATA_PATH}")
        
        logger.info("Initializing Cohere provider...")
        cohere = CohereProvider(api_key=settings.COHERE_API_KEY)
        
        logger.info("Initializing HuggingFace embedding provider...")
        embedder = HuggingFaceProvider(model_name=settings.EMBEDDING_MODEL_ID)

        logger.info("Initializing RAG service...")
        app.state.rag_service = RAGService(
            faiss_index_path=settings.FAISS_INDEX_PATH,
            metadata_path=settings.METADATA_PATH,
            llm_provider=cohere,
            embedding_provider=embedder,
            top_k=settings.TOP_K,
        )
        logger.info("✓ RAG service ready")

    except Exception as e:
        logger.error(f"Failed to initialize RAG service: {e}", exc_info=True)
        app.state.rag_service = None
        logger.warning("RAG service unavailable - chat endpoint will return 503")

    yield
    logger.info("Shutting down...")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Skin Disease RAG API",
    description="Bilingual Arabic/English dermatology assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)