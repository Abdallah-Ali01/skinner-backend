import logging
from fastapi import APIRouter, HTTPException, Request
from .schemes import ChatRequest, ChatResponse, HealthResponse
from utils.helpers import format_chat_history

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(request: Request):
    chat_service = getattr(request.app.state, "chat_service", None)
    return {
        "status": "ok",
        "message": "Skin disease chat API is running",
        "chat_service_ready": chat_service is not None
    }


@router.post("/chat", response_model=ChatResponse)
def chat(chat_data: ChatRequest, request: Request):
    chat_service = getattr(request.app.state, "chat_service", None)

    if chat_service is None:
        logger.error("Chat service not initialized")
        raise HTTPException(
            status_code=503, 
            detail="Service not ready. Check that data files exist and models loaded."
        )
        
    try:
        history = format_chat_history(
            [msg.model_dump() for msg in chat_data.chat_history]
        )

        result = chat_service.answer(
            query=chat_data.query,
            chat_history=history,
        )

        return {
            "answer": result["answer"],
        }

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))