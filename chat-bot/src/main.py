import logging
import colorlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from services.llm_service import CohereProvider
from services.chat_service import CHATService
from api.routes import router

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    "%(log_color)s%(levelname)-8s%(reset)s | %(name)s | %(message)s"
))
logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger(__name__)




@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm_service

    logger.info("Starting up...")

    try:
        cohere_provider = CohereProvider(api_key=settings.COHERE_API_KEY)
        app.state.chat_service = CHATService(llm_provider=cohere_provider)
        logger.info("✓ Chat service ready")

    except Exception as e:
        logger.error("Failed to initialize Chat service: %s", e)
        raise

    yield

    logger.info("Shutting down...")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Skin Disease API",
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