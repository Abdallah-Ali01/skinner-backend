from pydantic import BaseModel, Field
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    chat_history: List[ChatMessage] = Field(
        default=[],
        description="Previous turns — client is responsible for sending this"
    )


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
    query: str
    



class HealthResponse(BaseModel):
    status: str
    message: str