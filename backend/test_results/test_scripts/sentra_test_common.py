"""
Sentra test helpers shared by W4.1, W4.2 and W4.3 (Model C).

Run from backend/test_results/test_scripts:
    source get_tokens.sh              # sets ADMIN_JWT, HR_JWT, LEGAL_JWT, EMPLOYEE_JWT
    python w4.1_test_matrix.py

Optional environment variables:
    SENTRA_API_URL     default http://localhost:8000
    TEST_ACCESS_MODEL  default C. The run stops if the API reports another model.

This file keeps its OWN copy of the Section 5A matrix. Do not import it from
backend/main.py: a test that reuses the code's rule can never catch a wrong rule.
Results are written to backend/test_results/csv_files/.
"""

import base64
import csv
import json
import os
import sys
import time
from datetime import datetime

import requests

BASE_URL = os.getenv("SENTRA_API_URL", "http://localhost:8000")
QUERY_ENDPOINT = f"{BASE_URL}/query"
EXPECTED_MODEL = os.getenv("TEST_ACCESS_MODEL", "C").upper()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "csv_files"))

ROLES = ["admin", "hr", "legal", "employee"]

# Section 5A access matrix: chunk tags each role may receive.
ALLOWED_TAGS = {
    "admin": {"admin", "hr", "legal", "public"},
    "hr": {"hr", "public"},
    "legal": {"legal", "public"},
    "employee": {"public"},
}

MIN_TOKEN_MINUTES = 10   # refuse to start if a JWT is about to expire
MAX_ATTEMPTS = 3         # retries for 429 / 503 (Gemini rate limits)
RETRY_SECONDS = 8


def _jwt_payload(token):
    try:
        part = token.split(".")[1]
        part += "=" * (-len(part) % 4)
        return json.loads(base64.urlsafe_b64decode(part))
    except Exception:
        return None


def load_tokens():
    """Read the 4 JWTs set by get_tokens.sh and check each one before any test runs."""
    tokens, problems = {}, []
    for role in ROLES:
        var = f"{role.upper()}_JWT"
        token = os.environ.get(var, "").strip()
        if not token:
            problems.append(f"{var} is not set")
            continue
        payload = _jwt_payload(token)
        if payload is None:
            problems.append(f"{var} is not a readable JWT")
            continue
        token_role = (payload.get("app_metadata") or {}).get("role")
        if token_role != role:
            problems.append(f"{var} has app_metadata.role = {token_role!r}, expected {role!r}")
        minutes_left = (payload.get("exp", 0) - time.time()) / 60
        if minutes_left <= 0:
            problems.append(f"{var} is expired")
        elif minutes_left < MIN_TOKEN_MINUTES:
            problems.append(f"{var} expires in {minutes_left:.0f} min (need at least {MIN_TOKEN_MINUTES})")
        tokens[role] = token
    if problems:
        print("Cannot start the run:")
        for p in problems:
            print(f"  - {p}")
        print("Fix: run 'source get_tokens.sh' in this shell, then try again.")
        sys.exit(1)
    print(f"Tokens OK for {', '.join(ROLES)}. Expected model: {EXPECTED_MODEL}")
    return tokens


def post_query(token, query):
    """POST /query. Returns (http_status, body_dict). Stops the whole run if the
    API reports a model other than EXPECTED_MODEL."""
    resp = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = requests.post(
                QUERY_ENDPOINT,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"query": query},
                timeout=90,
            )
        except requests.exceptions.ConnectionError:
            print(f"Cannot reach {QUERY_ENDPOINT}. Is uvicorn running?")
            sys.exit(1)
        if resp.status_code not in (429, 503):
            break
        if attempt < MAX_ATTEMPTS:
            time.sleep(RETRY_SECONDS * attempt)
    try:
        data = resp.json()
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    if resp.status_code == 200 and data.get("model") != EXPECTED_MODEL:
        print(f"Model mismatch: API reported {data.get('model')!r}, this run expects {EXPECTED_MODEL!r}.")
        print("Set ACCESS_MODEL in backend/.env, restart uvicorn, and run again.")
        sys.exit(1)
    return resp.status_code, data


def chunk_tags(data):
    """Tag of every returned chunk. A chunk with no role field becomes '?', which
    is never allowed, so it shows up as a leak instead of slipping through."""
    chunks = data.get("chunks")
    if not isinstance(chunks, list):
        return []
    return [(c.get("role") or "?") if isinstance(c, dict) else "?" for c in chunks]


def find_leaks(role, tags):
    return [t for t in tags if t not in ALLOWED_TAGS[role]]


def timestamp():
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def write_csv(filename, rows):
    os.makedirs(CSV_DIR, exist_ok=True)
    path = os.path.join(CSV_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return path


def write_text(filename, text):
    os.makedirs(CSV_DIR, exist_ok=True)
    path = os.path.join(CSV_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path
