"""
Extract and clean text from PDF and TXT files
Removes publisher names, dates, URLs, and other noise
"""
import os
import logging
import re
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Tuple
from tqdm import tqdm
import fitz



logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Supported file extensions
SUPPORTED_EXTENSIONS = {'.pdf', '.txt'}

# Common noise patterns to remove
NOISE_PATTERNS = {
    # Publisher names (case insensitive)
    'publishers': [
        r'mayo clinic',
        r'medicover hospitals?',
        r'cleveland clinic',
        r'webmd',
        r'healthline',
        r'medical news today',
        r'nhs',
        r'american academy of dermatology',
        r'aad\.org',
    ],
    
    # Date patterns
    'dates': [
        r'\d{1,2}/\d{1,2}/\d{2,4}',  # 2/9/26
        r'\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)',  # 5:34 PM
        r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}',  # January 1, 2024
        r'\d{4}-\d{2}-\d{2}',  # 2024-01-01
        r'published:?\s*\d{1,2}/\d{1,2}/\d{2,4}',
        r'updated:?\s*\d{1,2}/\d{1,2}/\d{2,4}',
        r'last reviewed:?.*?\d{4}',
    ],
    
    # URLs
    'urls': [
        r'https?://[^\s]+',
        r'www\.[^\s]+',
        r'(?:https?://)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:/[^\s]*)?',
    ],
    
    # Common website elements
    'web_elements': [
        r'copyright\s*©?\s*\d{4}',
        r'all rights reserved',
        r'privacy policy',
        r'terms of (?:use|service)',
        r'cookie policy',
        r'back to top',
        r'share this (?:page|article)',
        r'print this page',
        r'download pdf',
        r'subscribe to (?:our )?newsletter',
        r'follow us on',
        r'related articles?',
        r'you may also like',
        r'advertisement',
    ],
    
    # References and citations
    'references': [
        r'\[\d+\]',  # [1], [2], etc.
        r'references?:',
        r'sources?:',
        r'citations?:',
    ],
    
    # Page numbers and headers/footers
    'page_elements': [
        r'page \d+ of \d+',
        r'\d+\s*/\s*\d+',  # 1 / 5
    ]
}

# ============================================
# EXTRACTION FUNCTIONS
# ============================================

def extract_from_pdf_pymupdf(pdf_path: Path) -> str:
    """Extract text from PDF file using PyMuPDF (faster and better)"""
    try:
        text = ""
        doc = fitz.open(pdf_path)
        num_pages = len(doc)
        
        for page_num in range(num_pages):
            page = doc[page_num]
            page_text = page.get_text()
            if page_text:
                text += page_text + "\n"
        
        doc.close()
        logger.debug(f"Extracted {len(text)} chars from {num_pages} pages (PyMuPDF)")
        return text
    
    except Exception as e:
        logger.error(f"PyMuPDF extraction failed for {pdf_path.name}: {e}")
        return ""


def extract_from_txt(txt_path: Path) -> str:
    """Extract text from TXT file"""
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            with open(txt_path, 'r', encoding=encoding) as file:
                text = file.read()
            logger.debug(f"Extracted {len(text)} chars with {encoding} encoding")
            return text
        except UnicodeDecodeError:
            continue
        except Exception as e:
            logger.error(f"TXT extraction failed for {txt_path.name}: {e}")
            return ""
    
    logger.error(f"Could not decode {txt_path.name} with any encoding")
    return ""


# ============================================
# TEXT CLEANING
# ============================================

def remove_noise_patterns(text: str) -> str:
    """Remove common noise patterns from extracted text"""
    cleaned = text
    removed_count = 0
    
    for category, patterns in NOISE_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, cleaned, re.IGNORECASE)
            if matches:
                cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
                removed_count += len(matches)
                logger.debug(f"Removed {len(matches)} instances of {category}: {pattern}")
    
    if removed_count > 0:
        logger.info(f"Removed {removed_count} noise patterns")
    
    return cleaned


def remove_header_footer_noise(text: str, num_lines: int = 2) -> str:
    """Remove first and last N lines (often contain headers/footers)"""
    lines = text.split('\n')
    
    if len(lines) <= num_lines * 2:
        return text
    
    cleaned_lines = lines[num_lines:-num_lines]
    logger.debug(f"Removed {num_lines} header and {num_lines} footer lines")
    
    return '\n'.join(cleaned_lines)


def clean_whitespace(text: str) -> str:
    """Clean excessive whitespace while preserving paragraph structure"""
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Fix common unicode issues
    replacements = {
        '\u00a0': ' ',      # Non-breaking space
        '\u2019': "'",      # Right single quote
        '\u201c': '"',      # Left double quote
        '\u201d': '"',      # Right double quote
        '\u2013': '-',      # En dash
        '\u2014': '-',      # Em dash
        '\u2026': '...',    # Ellipsis
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Remove excessive spaces
    text = re.sub(r' +', ' ', text)
    
    # Remove tabs
    text = text.replace('\t', ' ')
    
    # Clean up line breaks (keep paragraph breaks)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    
    # Remove spaces at start/end of lines
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    return text.strip()


def remove_short_lines(text: str, min_length: int = 20) -> str:
    """Remove very short lines (often navigation or junk) but keep paragraph structure"""
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        if not line.strip():
            cleaned_lines.append('')
        elif len(line.strip()) >= min_length:
            cleaned_lines.append(line)
        else:
            logger.debug(f"Removed short line: {line[:50]}...")
    
    return '\n'.join(cleaned_lines)


def clean_text(text: str, remove_headers: bool = True) -> str:
    """Complete text cleaning pipeline"""
    if not text:
        return ""
    
    logger.info("Starting text cleaning...")
    original_length = len(text)
    
    if remove_headers:
        text = remove_header_footer_noise(text, num_lines=4)
    
    text = remove_noise_patterns(text)
    text = clean_whitespace(text)
    text = remove_short_lines(text, min_length=20)
    text = clean_whitespace(text)
    
    cleaned_length = len(text)
    removed_percent = ((original_length - cleaned_length) / original_length * 100) if original_length > 0 else 0
    
    logger.info(f"Cleaning complete: {original_length} → {cleaned_length} chars ({removed_percent:.1f}% removed)")
    
    return text


# ============================================
# FILE DISCOVERY
# ============================================

def discover_files() -> Dict[str, List[Path]]:
    """
    Discover all supported files in the raw directory
    Groups files by their base name (without extension)
    """
    if not RAW_DIR.exists():
        return {}
    
    all_files = []
    for ext in SUPPORTED_EXTENSIONS:
        all_files.extend(RAW_DIR.glob(f"*{ext}"))
    
    # Group files by base name (stem)
    # Example: "acne.pdf" and "acne.txt" both belong to "acne"
    file_groups = {}
    
    for file_path in all_files:
        base_name = file_path.stem
        if base_name not in file_groups:
            file_groups[base_name] = []
        file_groups[base_name].append(file_path)
    
    return file_groups


def validate_file(file_path: Path) -> Tuple[bool, str]:
    """Validate that a file exists and is readable"""
    if not file_path.exists():
        return False, "File does not exist"
    
    if not file_path.is_file():
        return False, "Not a file"
    
    if file_path.stat().st_size == 0:
        return False, "File is empty"
    
    if file_path.stat().st_size > 100 * 1024 * 1024:  # 100 MB
        return False, "File too large (>100MB)"
    
    return True, "OK"


# ============================================
# MAIN EXTRACTION PIPELINE
# ============================================

def main(dry_run: bool = False):
    """
    Main extraction pipeline
    
    Args:
        dry_run: If True, only show what would be processed without actually processing
    """
    logger.info("=" * 60)
    logger.info("DOCUMENT EXTRACTION & CLEANING")
    logger.info("=" * 60)
    
    
    # Check if raw directory exists
    if not RAW_DIR.exists():
        logger.error(f"Raw data directory not found: {RAW_DIR}")
        logger.info(f"Creating directory: {RAW_DIR}")
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        logger.warning("Please add your PDF/TXT files to this directory")
        return
    
    # Discover files
    file_groups = discover_files()
    
    if not file_groups:
        logger.warning(f"No PDF or TXT files found in {RAW_DIR}")
        logger.info("Please add your documents and run again")
        return
    
    total_files = sum(len(files) for files in file_groups.values())
    logger.info(f"Found {len(file_groups)} document group(s) with {total_files} total file(s)")
    logger.info("")
    
    # Show what will be processed
    logger.info("Files to process:")
    for base_name, files in sorted(file_groups.items()):
        logger.info(f"  📁 {base_name}:")
        for file_path in files:
            is_valid, msg = validate_file(file_path)
            status = "✓" if is_valid else "✗"
            logger.info(f"      {status} {file_path.name} ({file_path.stat().st_size:,} bytes) - {msg}")
    logger.info("")
    
    if dry_run:
        logger.info("DRY RUN - No files will be processed")
        return
    
    # Statistics
    stats = {
        'processed': 0,
        'failed': 0,
        'skipped': 0,
        'total_chars_before': 0,
        'total_chars_after': 0,
        'files_per_group': {}
    }
    
    # Process each file group
    for base_name, files in tqdm(sorted(file_groups.items()), desc="Processing files"):
        logger.info(f"Processing: {base_name}")
        logger.info(f"  Files: {[f.name for f in files]}")
        
        # Extract text from all files in this group
        combined_text = ""
        valid_files = 0
        
        for file_path in files:
            # Validate file
            is_valid, msg = validate_file(file_path)
            if not is_valid:
                logger.warning(f"  Skipping {file_path.name}: {msg}")
                stats['skipped'] += 1
                continue
            
            logger.info(f"  Extracting: {file_path.name}")
            
            # Extract based on file type
            if file_path.suffix.lower() == '.pdf':
                text = extract_from_pdf_pymupdf(file_path)
            elif file_path.suffix.lower() == '.txt':
                text = extract_from_txt(file_path)
            else:
                logger.warning(f"  Unsupported file type: {file_path.suffix}")
                stats['skipped'] += 1
                continue
            
            if text:
                combined_text += text + "\n\n"
                stats['total_chars_before'] += len(text)
                valid_files += 1
            else:
                logger.warning(f"  No text extracted from {file_path.name}")
                stats['skipped'] += 1
        
        if not combined_text:
            logger.error(f"  No text extracted for {base_name}")
            stats['failed'] += 1
            continue
        
        # Clean combined text
        logger.info(f"  Cleaning text...")
        cleaned_text = clean_text(combined_text, remove_headers=True)
        
        if not cleaned_text:
            logger.error(f"  No text remaining after cleaning for {base_name}")
            stats['failed'] += 1
            continue
        
        stats['total_chars_after'] += len(cleaned_text)
        stats['files_per_group'][base_name] = valid_files
        
        # Save to processed directory
        output_path = PROCESSED_DIR / f"{base_name}.txt"
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_text)
        
        logger.info(f"  ✓ Saved: {output_path.name} ({len(cleaned_text):,} chars)")
        logger.info("")
        
        stats['processed'] += 1
    
    # Final summary
    logger.info("=" * 60)
    logger.info("EXTRACTION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"✓ Successfully processed: {stats['processed']} group(s)")
    logger.info(f"❌ Failed: {stats['failed']}")
    logger.info(f"⊘ Skipped: {stats['skipped']} file(s)")
    logger.info(f"📄 Total characters before cleaning: {stats['total_chars_before']:,}")
    logger.info(f"📄 Total characters after cleaning: {stats['total_chars_after']:,}")
    
    if stats['total_chars_before'] > 0:
        removed_percent = ((stats['total_chars_before'] - stats['total_chars_after']) / stats['total_chars_before'] * 100)
        logger.info(f"🧹 Noise removed: {removed_percent:.1f}%")
    
    logger.info(f"💾 Saved to: {PROCESSED_DIR}")
    logger.info("")
    
    # Per-group breakdown
    if stats['files_per_group']:
        logger.info("Files processed per group:")
        for group_name, count in sorted(stats['files_per_group'].items()):
            logger.info(f"  {group_name}: {count} file(s)")
        logger.info("")


if __name__ == "__main__":
    main()