import logging
from typing import Dict, Any
from prompts.system_prompt import SYSTEM_PROMPT
from .llm_service import CohereProvider

logger = logging.getLogger(__name__)

class CHATService:
    """
    Pure LLM service — no RAG, no FAISS, no embeddings.
    Uses Cohere to answer dermatology questions directly.
    """

    def __init__(self, llm_provider: CohereProvider):
        self.llm_provider = llm_provider

    def answer(
        self,
        query: str,
        chat_history: list = [],
        max_output_tokens: int = 500,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:

        # 1. Build system prompt
        system_prompt = SYSTEM_PROMPT.strip() 

        # 2. Generate answer
        answer_text = self.llm_provider.generate_text(
            prompt=query,
            chat_history=chat_history,
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            system_prompt=system_prompt,
        )

        if answer_text is None:
            fallback = "Sorry, I couldn't generate a response. Please try again."
              
            answer_text = fallback

        return {
            "answer": answer_text,
            "query": query,
        }