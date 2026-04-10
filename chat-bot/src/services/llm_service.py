import os
import logging
from langchain_huggingface import HuggingFaceEmbeddings
from typing import List
import cohere
from config import get_settings

settings = get_settings()

class CohereProvider:
    def __init__(
        self,
        api_key: str,
        default_input_max_characters: int = 4000,
        default_generation_max_output_tokens: int = 1024,
        default_generation_temperature: float = 0.2,
    ):
        self.api_key = api_key
        self.default_input_max_characters = default_input_max_characters
        self.default_generation_max_output_tokens = default_generation_max_output_tokens
        self.default_generation_temperature = default_generation_temperature
        self.generation_model_id = settings.GENERATION_MODEL_ID # e.g., 'command-r-plus'
        self.logger = logging.getLogger(__name__)

        # Initialize Cohere Client 
        self.client = cohere.ClientV2(api_key=self.api_key)

    def _build_cohere_history(self, chat_history: list) -> list:
        # Cohere uses roles: "user", "assistant", "system"
        # Format: {"role": "user", "content": "text"}
        ROLE_MAP = {"user": "user", "assistant": "assistant", "system": "system"}
        cohere_history = []
        for msg in chat_history:
            role = ROLE_MAP.get(msg.get("role", "user"), "user")
            content = msg.get("content") or msg.get("text", "")
            cohere_history.append({"role": role, "content": content})
        return cohere_history

    def generate_text(
        self,
        prompt: str,
        chat_history: list = [],
        max_output_tokens: int = None,
        temperature: float = None,
        system_prompt: str = None,
    ) -> str | None:

        max_tokens = max_output_tokens or self.default_generation_max_output_tokens
        temp = temperature or self.default_generation_temperature

        try:
            # Format history for Cohere
            messages = self._build_cohere_history(chat_history)
            
            # If system prompt exists, Cohere prefers it as a 'system' role message at the start
            if system_prompt:
                messages.insert(0, {"role": "system", "content": system_prompt})
            
            # Add the current user prompt
            messages.append({"role": "user", "content": prompt[:self.default_input_max_characters]})

            response = self.client.chat(
                model=self.generation_model_id,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temp
            )

            # Accessing the result in V2 SDK
            return response.message.content[0].text.strip()

        except Exception as e:
            self.logger.error("Cohere generation error: %s", e)
            return None


class HuggingFaceProvider:
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_ID):
        self.model = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
        self.logger = logging.getLogger(__name__)

    def embed_text(self, text: str, document_type: str = "query"):
        try:
            # E5 requirement: Queries MUST start with "query: "
            if document_type == "query":
                processed_text = f"query: {text}"
                return self.model.embed_query(processed_text)
            else:
                return self.model.embed_documents([text])[0]
        except Exception as e:
            self.logger.error("HuggingFace embedding error: %s", e)
            return None