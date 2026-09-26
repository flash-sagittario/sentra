[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🧪 Testing](./TESTING.md) · [📝 Decisions](./DECISIONS.md)

---

# 📡 API Reference

The Sentra backend is a FastAPI app with two endpoints. Login is handled by Supabase, and ingestion is a command-line script, so neither is an endpoint of this API.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/health` | Check that the server is running. | None |
| `POST` | `/query` | Ask a question and get an answer built from the chunks your role may see. | Bearer JWT |

**Base URL (local):** `http://localhost:8000`. The deployed URL will be added after W8.1.

FastAPI also serves interactive docs at `/docs` while running locally.

---

## 🔐 Authentication

Users log in through Supabase Auth, not through this API. The login returns a JWT (`access_token`), and every `/query` call sends it in the `Authorization` header. The role (`admin`, `hr`, `legal` or `employee`) is read from the token's `app_metadata.role`.

Get a token:

```bash
curl -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <publishable-key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@sentra.com","password":"<password>"}'
```

Copy `access_token` from the response. For the four demo accounts, `source backend/test_results/test_scripts/get_tokens.sh` does this and sets `ADMIN_JWT`, `HR_JWT`, `LEGAL_JWT` and `EMPLOYEE_JWT`. Tokens expire after about one hour.

---

## `GET /health`

```bash
curl http://localhost:8000/health
```

Response `200`:

```json
{"status": "ok"}
```

---

## `POST /query`

Embeds the question, retrieves the 5 nearest chunks the caller's role may see, and generates an answer from them.

### Request

| Part | Value |
|---|---|
| Header | `Authorization: Bearer <access_token>` (required) |
| Header | `Content-Type: application/json` |
| Body | `{"query": "<your question>"}` (`query` is required) |

The request body has no `model` field. The access model is set on the server (see below).

```bash
curl -X POST http://localhost:8000/query \
  -H "Authorization: Bearer $HR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the company parental leave policy?"}'
```

### Response `200`

Shape only, the values are illustrative:

```json
{
  "answer": "<generated answer, followed by the source filenames>",
  "chunks": [
    {
      "id": "<uuid>",
      "document_id": "<uuid>",
      "content": "<chunk text>",
      "role": "hr",
      "filename": "<source>.pdf",
      "similarity": 0.83
    }
  ],
  "model": "C"
}
```

| Field | Meaning |
|---|---|
| `answer` | The generated answer, with the source files listed. When nothing relevant is found, it is the fixed sentence `I could not find this in the documents available to your role.` with no source list. |
| `chunks` | The chunks used to build the answer, nearest first. |
| `chunks[].role` | The chunk's tag: `admin`, `hr`, `legal` or `public`. |
| `chunks[].similarity` | Cosine similarity between the question and the chunk. Higher is closer. |
| `model` | The access model the server is running: `A`, `B` or `C`. Reports the server setting, not a request choice. |

### Status codes

| Code | When |
|---|---|
| `200` | Success. Also returned when the role has nothing relevant to see (see "Access behavior"). |
| `400` | `query` is missing or empty. |
| `401` | The `Authorization` header does not start with `Bearer `, or, in Model B, the token's signature is invalid or the token has expired. |
| `422` | The `Authorization` header is missing, or the body is not valid JSON. |
| `500` | Model A or B is selected and `SUPABASE_SERVICE_KEY` is not configured, or an unhandled error such as a failed embedding call. |
| `503` | Answer generation failed, usually a Gemini rate limit or a wrong `GEMINI_MODEL`. |
| Other | If the database search call fails, its status and message are passed through as returned by Supabase. In Model C, an invalid or expired token shows up here as `401`. |

### How each model retrieves

| Model | Database call | Filtering | Chunks returned |
|---|---|---|---|
| **C** (default) | Uses the caller's own JWT | Postgres RLS filters inside the search | Always 5 at demo scale (no vector index) |
| **B** | Uses the service key | FastAPI keeps chunks whose `role` the caller may read, from 20 fetched | Up to 5, can be fewer |
| **A** | Uses the service key | None (dev baseline only) | 5 from the whole corpus |

Set with `ACCESS_MODEL` in `.env` and a server restart. See the [Setup guide](./SETUP.md).

---

## 🛡️ Access behavior

What each role can receive in `chunks`:

| Role | Chunk tags returned |
|---|---|
| Admin | `admin`, `hr`, `legal`, `public` |
| HR | `hr`, `public` |
| Legal | `legal`, `public` |
| Employee | `public` |

- There is **no `403` for restricted content.** A question about a domain the role cannot see returns `200`, with the same JSON keys as any other response, built only from chunks the role is allowed to see. Nothing in the response reveals that restricted content exists. This was confirmed by the W4.3 tests.
- Retrieval has no similarity floor, so a question with no relevant content also returns 5 chunks from the caller's allowed set.
- A question with no matching content and a question about restricted content get the same fixed answer sentence, with no source list. Under Model B, `chunks` can be an empty list when the role filter removes everything, and the fixed sentence is returned without calling the language model.
- Each request is independent. No conversation history is sent or stored, and the role is checked again on every call.
- The client cannot change how many chunks are returned.
- A token with a forged or altered role is rejected. Model B verifies the token signature in FastAPI. Model C passes the token to Supabase, which verifies it.

---

## 🚧 Not yet implemented

| Feature | Scoping reference |
|---|---|
| Document upload endpoint | FR-2, FR-3 |
| Delete or replace a document | FR-14 |
| Audit log and an admin view of it | FR-7, FR-10 |
| CORS configuration for browser access from the frontend | Needed before the chat UI calls `/query` |
| Role-scope caching (validate and cache the role's permitted scope right after login) | FR-12 |

---
