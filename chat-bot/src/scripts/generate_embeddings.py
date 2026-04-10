"""
Generate embeddings for text chunks using HuggingFace (local)
Reads chunks.json and outputs embeddings.json
"""
import os
os.environ.setdefault("HF_HOME", "/mnt/c/huggingface_cache")

import logging
import json
from pathlib import Path
from typing import List, Dict, Any
import colorlog
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

logger = logging.getLogger(__name__)
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    "%(log_color)s%(levelname)s%(reset)s: %(message)s"
))
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)

# ============================================
# CONFIGURATION
# ============================================

CHUNKS_INPUT = Path("/mnt/c/Grad-project/skin-disease/src/data/processed/chunks.json")
EMBEDDINGS_OUTPUT = Path("/mnt/c/Grad-project/skin-disease/src/data/processed/embeddings.json")


# ============================================
# INITIALIZE EMBEDDINGS
# ============================================

def get_embeddings_model() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-small",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )


# ============================================
# EMBEDDING FUNCTIONS
# ============================================

def generate_embeddings(
    chunks: List[Dict[str, Any]],
    embeddings_model: HuggingFaceEmbeddings,
) -> List[Dict[str, Any]]:
    """
    Generate embeddings for all chunks.
    Returns the same list of chunks, each with an added 'embedding' field.
    """
    total = len(chunks)
    logger.info(f"Generating embeddings for {total} chunks...")

    enriched_chunks: List[Dict[str, Any]] = []

    for chunk in tqdm(chunks, desc="Embedding chunks"):
        embedding = embeddings_model.embed_query(chunk["text"]) 
        enriched_chunks.append({**chunk, "embedding": embedding})

    logger.info(f"✓ Generated {len(enriched_chunks)} embeddings")
    return enriched_chunks


# ============================================
# VALIDATION
# ============================================

def validate_embeddings(enriched_chunks: List[Dict[str, Any]]) -> bool:
    """Sanity-check that every chunk has a non-empty embedding of consistent dimension."""
    if not enriched_chunks:
        logger.error("No enriched chunks to validate")
        return False

    dim = len(enriched_chunks[0]["embedding"])
    logger.info(f"Embedding dimension: {dim}")

    for i, chunk in enumerate(enriched_chunks):
        emb = chunk.get("embedding")
        if not emb:
            logger.error(f"Chunk {i} ({chunk['id']}): missing embedding")
            return False
        if len(emb) != dim:
            logger.error(
                f"Chunk {i} ({chunk['id']}): dimension mismatch "
                f"(expected {dim}, got {len(emb)})"
            )
            return False

    logger.info("✓ All embeddings validated successfully")
    return True


# ============================================
# MAIN PIPELINE
# ============================================

def main():
    """Main embedding generation pipeline"""

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("=" * 60)
    logger.info("STEP 3: EMBEDDING GENERATION")
    logger.info("=" * 60)

    # --- Load chunks ---
    if not CHUNKS_INPUT.exists():
        logger.error(f"Chunks file not found: {CHUNKS_INPUT}")
        logger.info("Please run 2_chunk_text.py first")
        return

    logger.info(f"Loading chunks from {CHUNKS_INPUT}...")
    with open(CHUNKS_INPUT, "r", encoding="utf-8") as f:
        chunks: List[Dict[str, Any]] = json.load(f)

    if not chunks:
        logger.warning("Chunks file is empty — nothing to embed")
        return

    logger.info(f"Loaded {len(chunks)} chunks")

    # --- Init model ---
    logger.info(f"Loading model: intfloat/multilingual-e5-small...")
    try:
        embeddings_model = get_embeddings_model()
        logger.info(f"✓ Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return

    # --- Generate embeddings ---
    try:
        enriched_chunks = generate_embeddings(chunks, embeddings_model)
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return

    # --- Validate ---
    if not validate_embeddings(enriched_chunks):
        logger.error("Validation failed — not saving output")
        return

    # --- Save ---
    EMBEDDINGS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Saving embeddings to {EMBEDDINGS_OUTPUT}...")
    with open(EMBEDDINGS_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(enriched_chunks, f, indent=2, ensure_ascii=False)

    # --- Summary ---
    dim = len(enriched_chunks[0]["embedding"])
    diseases = sorted({c["metadata"]["disease"] for c in enriched_chunks})

    logger.info("")
    logger.info("=" * 60)
    logger.info("EMBEDDING COMPLETE")
    logger.info("=" * 60)
    logger.info(f"✓ Total embedded chunks : {len(enriched_chunks)}")
    logger.info(f"📐 Embedding dimension  : {dim}")
    logger.info(f"🏥 Diseases covered     : {len(diseases)}")
    logger.info(f"💾 Saved to             : {EMBEDDINGS_OUTPUT}")
    logger.info("")

    logger.info("Chunks per disease:")
    disease_counts: Dict[str, int] = {}
    for chunk in enriched_chunks:
        d = chunk["metadata"]["disease"]
        disease_counts[d] = disease_counts.get(d, 0) + 1
    for disease, count in sorted(disease_counts.items()):
        logger.info(f"  {disease}: {count} chunks")


if __name__ == "__main__":
    main()