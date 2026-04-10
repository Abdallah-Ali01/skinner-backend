"""
Hybrid Semantic & Recursive Text Chunking for Skin Disease Data
"""

import os
os.environ.setdefault("HF_HOME", "/mnt/c/huggingface_cache")

import logging
import json
from pathlib import Path
from dotenv import load_dotenv
import colorlog
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

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

PROCESSED_DIR = Path("/mnt/c/Grad-project/skin-disease/src/data/processed")
CHUNKS_OUTPUT = Path("/mnt/c/Grad-project/skin-disease/src/data/processed/chunks.json")

# Chunking parameters
BREAKPOINT_TYPE = "percentile"
BREAKPOINT_AMOUNT = 85  # Lowered from 95 for smaller, more frequent semantic breaks
MIN_CHUNK_LENGTH = 100
MAX_CHUNK_CHARS = 1200  # Hard limit to prevent LLM confusion
CHUNK_OVERLAP = 200     # Overlap for the recursive safety splitter

# ============================================
# INITIALIZE MODELS
# ============================================

logger.info("Initializing embedding model and splitters...")

try:
    # Using E5-Small (Multilingual)
    embeddings = HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-small",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )
    # Primary Splitter: Semantic
    semantic_chunker = SemanticChunker(
        embeddings,
        breakpoint_threshold_type=BREAKPOINT_TYPE,
        breakpoint_threshold_amount=BREAKPOINT_AMOUNT
    )
    
    # Secondary Splitter: Recursive (Safety net for large semantic chunks)
    recursive_splitter = RecursiveCharacterTextSplitter(
        chunk_size=MAX_CHUNK_CHARS,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len
    )
    
    logger.info("✓ Chunking pipeline initialized")

except Exception as e:
    logger.error(f"Initialization failed: {e}")

# ============================================
# PROCESSING FUNCTIONS
# ============================================

def chunk_text_hybrid(text: str, disease: str) -> list[str]:
    """
    Performs hybrid chunking:
    1. Prepends 'passage: ' for E5 model compatibility.
    2. Splits semantically.
    3. Breaks down oversized semantic chunks recursively.
    4. Injects disease context into each chunk.
    """
    try:
        # E5 models expect 'passage: ' prefix for documents
        formatted_input = f"passage: {text}"
        
        # 1. Semantic Splitting
        initial_chunks = semantic_chunker.split_text(formatted_input)
        
        final_processed_chunks = []
        
        # 2. Hybrid Recursive Check
        for chunk in initial_chunks:
            if len(chunk) > MAX_CHUNK_CHARS:
                # Break down massive semantic chunks
                sub_chunks = recursive_splitter.split_text(chunk)
                final_processed_chunks.extend(sub_chunks)
            else:
                final_processed_chunks.append(chunk)
        
        # 3. Context Injection
        # We prepend the disease name so every chunk is 'self-aware'
        contextualized = [f"Disease: {disease} | {c}" for c in final_processed_chunks]
        
        return contextualized
    
    except Exception as e:
        logger.error(f"{disease}: Chunking failed - {e}")
        return []

def main():
    if not PROCESSED_DIR.exists():
        logger.error(f"Directory not found: {PROCESSED_DIR}")
        return

    text_files = sorted(PROCESSED_DIR.glob("*.txt"))
    all_chunks = []
    chunk_id_counter = 0
    
    for txt_file in text_files:
        disease = txt_file.stem
        logger.info(f"Processing: {disease}")
        
        with open(txt_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if not content.strip(): continue

        # Run Hybrid Pipeline
        chunks = chunk_text_hybrid(content, disease)
        
        # Filter short noise
        chunks = [c for c in chunks if len(c) > MIN_CHUNK_LENGTH]
        
        for i, text in enumerate(chunks):
            all_chunks.append({
                "id": f"chunk_{chunk_id_counter:04d}",
                "text": text,
                "metadata": {
                    "disease": disease,
                    "source": txt_file.name,
                    "length": len(text)
                }
            })
            chunk_id_counter += 1
            
        logger.info(f"  Generated {len(chunks)} chunks for {disease}")

    # Save Results
    with open(CHUNKS_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✓ Process complete. Total chunks: {len(all_chunks)}")

if __name__ == "__main__":
    main()