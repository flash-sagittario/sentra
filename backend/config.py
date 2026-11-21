import os
from dotenv import load_dotenv

load_dotenv(override=True)  # .env always wins over any pre-existing shell var

VALID_MODELS = {"A", "B", "C"}

ACCESS_MODEL = os.getenv("ACCESS_MODEL", "C").upper()

if ACCESS_MODEL not in VALID_MODELS:
    raise ValueError(f"ACCESS_MODEL must be one of {VALID_MODELS}, got '{ACCESS_MODEL}'")

FRONTEND_ORIGINS = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

# Longest question /query accepts, in characters. gemini-embedding-001 silently truncates
# input past 2048 tokens; 2000 characters stays under that even for symbol-heavy or
# non-English text. Keep in sync with MAX_QUERY_CHARS in the frontend Composer.tsx.
MAX_QUERY_CHARS = 2000
