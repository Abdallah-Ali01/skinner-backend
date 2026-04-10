import faiss
import numpy as np
import logging
import json
import os
from typing import List, Dict, Any, Optional
from langdetect import detect, DetectorFactory
import langdetect
from prompts.system_prompt import SYSTEM_PROMPT
from .llm_service import CohereProvider


logger = logging.getLogger(__name__)



SKIN_DISEASE_SYSTEM_PROMPT = SYSTEM_PROMPT.strip()

class RAGService:
    """
    Retrieval-Augmented Generation service.

    Flow:
      query → embed (HF) → FAISS search → retrieve chunks
           → build prompt → Gemini → answer
    """

    def __init__(
        self,
        faiss_index_path: str,
        metadata_path: str,
        llm_provider: CohereProvider,
        embedding_provider,            
        top_k: int = 5,
        similarity_threshold: float = 0.0,  # cosine distance; lower = more similar
    ):
        self.llm_provider = llm_provider
        self.embedding_provider = embedding_provider
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold

        self.index: Optional[faiss.Index] = None
        self.metadata: List[Dict[str, Any]] = []

        self._load_index(faiss_index_path)
        self._load_metadata(metadata_path)

    # ── index / metadata loading ──────────────────────────────
    def _load_index(self, path: str):
        if not os.path.exists(path):
            logger.error("FAISS index not found at: %s", path)
            raise FileNotFoundError(f"FAISS index not found: {path}")
        self.index = faiss.read_index(path)
        logger.info("FAISS index loaded — %d vectors", self.index.ntotal)

    def _load_metadata(self, path: str):
        """
        Metadata file: JSON array where each element corresponds 1-to-1
        with a FAISS vector.  Each element should have at least:
          { "text": "...", "source": "..." }
        """
        if not os.path.exists(path):
            logger.error("Metadata file not found at: %s", path)
            raise FileNotFoundError(f"Metadata file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        logger.info("Metadata loaded — %d entries", len(self.metadata))

    # ── embedding ─────────────────────────────────────────────
    def _embed_query(self, query: str) -> Optional[np.ndarray]:
        try:
            # This calls the updated HuggingFaceProvider which adds "query: "
            result = self.embedding_provider.embed_text(query, document_type="query")

            if result is None:
                return None

            vector = np.array(result, dtype=np.float32)

            # Ensure it is the correct shape for FAISS (1, dimension)
            return vector.reshape(1, -1) 

        except Exception as e:
            self.logger.error("Embedding error: %s", e)
            return None
    # ── retrieval ─────────────────────────────────────────────
    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """Return top-k metadata chunks most similar to query."""
        vector = self._embed_query(query)
        if vector is None:
            return []

        distances, indices = self.index.search(vector, self.top_k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:               # FAISS padding value
                continue
            if self.similarity_threshold and dist < self.similarity_threshold:
                continue
            if idx >= len(self.metadata):
                continue
            chunk = dict(self.metadata[idx])
            chunk["_score"] = float(dist)
            results.append(chunk)

        logger.debug("Retrieved %d chunks for query: %s", len(results), query[:60])
        return results

    def _detect_language(self, text: str) -> str:
        """Detect language from user query"""
        DetectorFactory.seed = 0
        try:
            lang_code = detect(text)
            # Map language codes to full names
            lang_map = {
                'en': 'English',
                'ar': 'Arabic',
                # Add more as needed
            }
            return lang_map.get(lang_code, 'English')
        except:
            return 'English'  # Default fallback
    # ── prompt construction ───────────────────────────────────
    def _build_rag_prompt(self, query, chunks, language="English"):
        """Build complete prompt with system instructions, context, and query"""
        if not chunks:
            context = "No relevant information found in the knowledge base."
        else:
            context = "\n\n".join(chunk.get("text", "").strip() for chunk in chunks)
        
        system_prompt = SKIN_DISEASE_SYSTEM_PROMPT.format(language=language)
        
        # Merge everything into one complete prompt
        complete_prompt = f"""{system_prompt}

        {context}

        User Question:
        {query}

        IMPORTANT: Remember to respond in {language} language using ONLY the information from the context above. If the answer isn't in the context, say "I don't know" in {language}."""
        
        return complete_prompt


    # ── main public method ────────────────────────────────────
    def answer(
        self,
        query: str,
        chat_history: list = [],
        max_output_tokens: int = 300,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
 
        # 1. Detect language
        user_language = self._detect_language(query)
        search_query = query 

        # 2. Translate only if Arabic
        if user_language == 'Arabic':
            logger.info("Arabic detected. Translating query for improved retrieval...")
            translation_prompt = f"Translate the following medical/dermatology query into English keywords for database search. Only return the English translation: {query}"
            
            translated_query = self.llm_provider.generate_text(
                prompt=translation_prompt,
                temperature=0.0 # Keep translation deterministic
            )
            
            if translated_query:
                search_query = translated_query
                logger.info(f"Translated Search Query: {search_query}")

        # 3. Retrieve relevant chunks using the (possibly translated) query
        chunks = self.retrieve(search_query)
        
        # 4. Build prompt using original query but English context
        complete_prompt = self._build_rag_prompt(query, chunks, user_language)
        
        # 5. Generate answer
        answer_text = self.llm_provider.generate_text(
            prompt=complete_prompt,
            chat_history=chat_history,
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            system_prompt=None,
        )

        if answer_text is None:
            # Fallback message in detected language
            fallback_messages = {
                'English': "Sorry, I couldn't generate a response. Please try again.",
                'Arabic': "عذراً, لم أتمكن من إنشاء استجابة. يرجى المحاولة مرة أخرى.",
            }
            answer_text = fallback_messages.get(user_language, fallback_messages['English'])

        # 5. Build clean sources list for the API response
        sources = [
            {"text": c.get("text", "")}
            for c in chunks
        ]

        return {
            "answer": answer_text,
            "sources": sources,
            "query": query,
            "detected_language": user_language,  #for debugging
        }