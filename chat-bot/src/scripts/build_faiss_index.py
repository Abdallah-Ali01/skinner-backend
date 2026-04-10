"""
Build a FAISS index from pre-computed embeddings
Reads embeddings.json and outputs a FAISS index + metadata store
"""
import logging
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
import faiss
from dotenv import load_dotenv
import colorlog

load_dotenv()

logger = logging.getLogger(__name__)
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

EMBEDDINGS_INPUT = Path("/mnt/c/Grad-project/skin-disease/src/data/processed/embeddings.json")

# FAISS index output
INDEX_DIR = Path("/mnt/c/Grad-project/skin-disease/src/data/index")
INDEX_FILE = INDEX_DIR / "skin_disease.index"
METADATA_FILE = INDEX_DIR / "skin_disease_metadata.json"

INDEX_TYPE = "flat"

# ============================================
# BUILD FUNCTIONS
# ============================================

def load_embeddings(path: Path) -> Tuple[List[Dict[str, Any]], np.ndarray]:
    """
    Load enriched chunks and extract the embedding matrix.

    Returns:
        metadata : list of chunk dicts (without the 'embedding' field)
        matrix   : float32 numpy array of shape (N, dim)
    """
    logger.info(f"Loading embeddings from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        enriched_chunks: List[Dict[str, Any]] = json.load(f)

    if not enriched_chunks:
        raise ValueError("Embeddings file is empty")

    # Separate vectors from metadata
    vectors = []
    metadata = []
    for chunk in enriched_chunks:
        vectors.append(chunk["embedding"])
        meta = {k: v for k, v in chunk.items() if k != "embedding"}
        metadata.append(meta)

    matrix = np.array(vectors, dtype=np.float32)
    logger.info(
        f"Loaded {matrix.shape[0]} vectors of dimension {matrix.shape[1]}"
    )
    return metadata, matrix


def normalize_vectors(matrix: np.ndarray) -> np.ndarray:
    """L2-normalize vectors (required for cosine similarity with inner product index)."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    # Avoid division by zero
    norms = np.where(norms == 0, 1.0, norms)
    return matrix / norms


def build_flat_index(dim: int) -> faiss.IndexFlatIP:
    """
    Build an exact inner-product (cosine, after normalisation) FAISS index.
    Best for datasets up to ~500k vectors.
    """
    index = faiss.IndexFlatIP(dim)
    logger.info(f"Built IndexFlatIP (dim={dim})")
    return index



def validate_index(index: faiss.Index, matrix: np.ndarray, top_k: int = 5) -> bool:
    """
    Quick sanity check: query the index with the first vector and verify
    the top result is itself (distance ≈ 1.0 for normalised cosine).
    """
    query = matrix[:1]
    distances, indices = index.search(query, top_k)

    top_idx = int(indices[0][0])
    top_dist = float(distances[0][0])

    if top_idx != 0:
        logger.warning(
            f"Validation: top result index is {top_idx}, expected 0"
        )
        return False

    if abs(top_dist - 1.0) > 1e-3:
        logger.warning(
            f"Validation: top cosine score is {top_dist:.6f}, expected ~1.0"
        )
        return False

    logger.info(
        f"✓ Index validated — top match: idx={top_idx}, score={top_dist:.6f}"
    )
    return True


# ============================================
# SEARCH HELPER  (convenience, not required at build time)
# ============================================

def search(
    query_vector: np.ndarray,
    index: faiss.Index,
    metadata: List[Dict[str, Any]],
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Search the FAISS index with a single query vector.

    Args:
        query_vector : 1-D float32 array of shape (dim,)
        index        : loaded FAISS index
        metadata     : list returned by load_embeddings()
        top_k        : number of results to return

    Returns:
        List of metadata dicts, each augmented with a 'score' field.
    """
    query = query_vector.astype(np.float32).reshape(1, -1)
    query = normalize_vectors(query)

    distances, indices = index.search(query, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        result = {**metadata[idx], "score": float(dist)}
        results.append(result)

    return results


# ============================================
# MAIN PIPELINE
# ============================================

def main():
    """Main FAISS index-building pipeline"""

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("=" * 60)
    logger.info("STEP 4: BUILD FAISS INDEX")
    logger.info("=" * 60)

    # --- Check input ---
    if not EMBEDDINGS_INPUT.exists():
        logger.error(f"Embeddings file not found: {EMBEDDINGS_INPUT}")
        logger.info("Please run 3_generate_embeddings.py first")
        return

    # --- Load ---
    try:
        metadata, matrix = load_embeddings(EMBEDDINGS_INPUT)
    except Exception as e:
        logger.error(f"Failed to load embeddings: {e}")
        return

    n_vectors, dim = matrix.shape

    # --- Normalise for cosine similarity ---
    logger.info("Normalising vectors (L2) for cosine similarity...")
    matrix = normalize_vectors(matrix)

    # --- Build index ---
    logger.info(f"Building {INDEX_TYPE.upper()} FAISS index...")
    try:
        index = build_flat_index(dim)
    except Exception as e:
        logger.error(f"Failed to build index: {e}")
        return

    # --- Add vectors ---
    logger.info(f"Adding {n_vectors} vectors to index...")
    index.add(matrix)
    logger.info(f"✓ Index now contains {index.ntotal} vectors")

    # --- Validate ---
    if not validate_index(index, matrix):
        logger.warning("Index validation produced unexpected results — proceeding anyway")

    # --- Save index ---
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    logger.info(f"Saving FAISS index to {INDEX_FILE}...")
    faiss.write_index(index, str(INDEX_FILE))

    # --- Save metadata ---
    logger.info(f"Saving metadata to {METADATA_FILE}...")
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    # --- Summary ---
    index_size_mb = INDEX_FILE.stat().st_size / (1024 * 1024)
    meta_size_kb = METADATA_FILE.stat().st_size / 1024
    diseases = sorted({m["metadata"]["disease"] for m in metadata})

    logger.info("=" * 60)
    logger.info("FAISS INDEX COMPLETE")
    logger.info("=" * 60)
    logger.info(f"✓ Vectors indexed      : {index.ntotal}")
    logger.info(f"📐 Embedding dimension  : {dim}")
    logger.info(f"🔍 Index type           : {INDEX_TYPE.upper()}")
    logger.info(f"🏥 Diseases covered     : {len(diseases)}")
    logger.info(f"💾 Index file           : {INDEX_FILE} ({index_size_mb:.1f} MB)")
    logger.info(f"📋 Metadata file        : {METADATA_FILE} ({meta_size_kb:.1f} KB)")
    logger.info("")
    logger.info("How to load later:")
    logger.info(f"  index    = faiss.read_index('{INDEX_FILE}')")
    logger.info(f"  metadata = json.load(open('{METADATA_FILE}'))")

if __name__ == "__main__":
    main()