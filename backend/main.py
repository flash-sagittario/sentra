import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from google import genai

load_dotenv()

app = FastAPI()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_PUBLISHABLE_KEY = os.environ["SUPABASE_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


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

    # Step 1: embed the query text
    embed_response = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=query_text,
        config={"task_type": "RETRIEVAL_QUERY", "output_dimensionality": 768}
    )
    query_embedding = embed_response.embeddings[0].values

    # Step 2 & 3: call the RPC endpoint directly via REST, bypassing the SDK's
    # postgrest client so we control exactly which token goes where.
    # apikey = publishable key (identifies the project), Authorization = the
    # user's own JWT (this is what RLS on `chunks` evaluates against).
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/match_chunks",
        headers={
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={"query_embedding": query_embedding, "match_count": 5},
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return {"chunks": response.json()}
