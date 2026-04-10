import logging
from fastapi import APIRouter, HTTPException, Request
from .schemes import ChatRequest, ChatResponse, HealthResponse
from utils.helpers import format_chat_history

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(request: Request):
    rag_service = getattr(request.app.state, "rag_service", None)
    return {
        "status": "ok",
        "message": "Skin disease RAG API is running",
        "rag_service_ready": rag_service is not None
    }


@router.post("/chat", response_model=ChatResponse)
def chat(chat_data: ChatRequest, request: Request):
    rag_service = getattr(request.app.state, "rag_service", None)

    if rag_service is None:
        logger.error("RAG service not initialized")
        raise HTTPException(
            status_code=503, 
            detail="Service not ready. Check that data files exist and models loaded."
        )
        
    try:
        history = format_chat_history(
            [msg.model_dump() for msg in chat_data.chat_history]
        )

        result = rag_service.answer(
            query=chat_data.query,
            chat_history=history,
        )

        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "query": result["query"],
        }

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))