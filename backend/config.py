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