import os

import httpx
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from google import genai
from prompts import build_prompt, append_sources

from config import ACCESS_MODEL
from prompts import build_prompt, append_sources, NO_INFO_REPLY

load_dotenv()

app = FastAPI()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_PUBLISHABLE_KEY = os.environ["SUPABASE_KEY"]
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")  # only required for Model A/B
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL = os.environ["GEMINI_MODEL"]

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Section 5A access matrix: which chunk tags each role may read.
# Must match backend/sql/rls_chunks_policy.sql.
ALLOWED_TAGS = {
    "admin": {"admin", "hr", "legal", "public"},
    "hr": {"hr", "public"},
    "legal": {"legal", "public"},
    "employee": {"public"},
}


# Public keys used to verify Supabase tokens. Fetched once and cached, so
# verification adds no network call per request.
_jwks_client = PyJWKClient(
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    headers={"apikey": SUPABASE_PUBLISHABLE_KEY},
)


def decode_role_from_jwt(access_token: str) -> str:
    """Verify the JWT signature and expiry, then read the role claim.
    Reads app_metadata (admin-only) to match the RLS policy, never
    user_metadata (user-editable)."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(access_token)
        payload = jwt.decode(
            access_token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload.get("app_metadata", {}).get("role", "")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/query")
async def query_chunks(payload: dict, authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    access_token = authorization.removeprefix("Bearer ")

    query_text = payload.get("query")
    if not query_text:
        raise HTTPException(status_code=400, detail="Missing 'query' field")

    embed_response = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=query_text,
        config={"task_type": "RETRIEVAL_QUERY", "output_dimensionality": 768}
    )
    query_embedding = embed_response.embeddings[0].values

    if ACCESS_MODEL == "C":
        # Retrieval-layer enforcement: pass the user's own JWT, Postgres RLS
        # on `chunks` filters results by role before they reach us.
        apikey = SUPABASE_PUBLISHABLE_KEY
        auth_header = f"Bearer {access_token}"
        match_count = 5
    else:
        # Models A and B bypass RLS with the service key; enforcement (or
        # the lack of it) happens here in Python instead of in Postgres.
        if not SUPABASE_SERVICE_KEY:
            raise HTTPException(status_code=500, detail="SUPABASE_SERVICE_KEY not configured, required for Model A/B")
        apikey = SUPABASE_SERVICE_KEY
        auth_header = f"Bearer {SUPABASE_SERVICE_KEY}"
        # over-fetch for Model B since it discards non-matching roles after the call
        match_count = 20 if ACCESS_MODEL == "B" else 5

    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/match_chunks",
        headers={
            "apikey": apikey,
            "Authorization": auth_header,
            "Content-Type": "application/json",
        },
        json={"query_embedding": query_embedding, "match_count": match_count},
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    chunks = response.json()

    if ACCESS_MODEL == "B":
        # Application-layer enforcement: filter to the caller's role (or
        # public docs) in Python, then trim back down to the usual top 5.
        user_role = decode_role_from_jwt(access_token)
        allowed = ALLOWED_TAGS.get(user_role, {"public"})
        chunks = [c for c in chunks if c.get("role") in allowed][:5]

    # Model A: no filtering at all, whatever comes back goes out (dev-only, insecure by design)

    if not chunks:
        return {"answer": NO_INFO_REPLY, "chunks": [], "model": ACCESS_MODEL}
 
    prompt = build_prompt(query_text, chunks)
    try:
        gen = gemini_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Generation failed: {e}")

    answer = append_sources(gen.text or NO_INFO_REPLY, chunks)
    if NO_INFO_REPLY in answer:
        answer = NO_INFO_REPLY

    return {"answer": answer, "chunks": chunks, "model": ACCESS_MODEL}