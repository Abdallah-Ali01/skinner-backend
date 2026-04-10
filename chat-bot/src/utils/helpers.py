from typing import List, Dict


def format_chat_history(raw_history: List[Dict]) -> List[Dict]:
    """
    Validate and normalize chat history entries.
    Each entry must have 'role' and 'content'.
    Filters out any malformed messages.
    """
    valid = []
    for msg in raw_history:
        role = msg.get("role", "")
        content = msg.get("content", "").strip()
        if role in ("user", "assistant") and content:
            valid.append({"role": role, "content": content})
    return valid


