[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🧪 Testing](./TESTING.md) · [📝 Decisions](./DECISIONS.md)

---

# ⚙️ Setup Guide

How to run Sentra locally: the FastAPI backend, the Supabase database, and the test scripts.

---

## 📋 Prerequisites

| Requirement | Notes |
|---|---|
| Python | 3.11 or newer (developed on 3.12). |
| Node.js | Only needed for the frontend. |
| Supabase project | Postgres with the `pgvector` extension enabled. |
| Google AI Studio API key | Used for embeddings and answer generation. |
| Git Bash (Windows) | The helper scripts are shell scripts. |

---

## 🔑 Environment Variables

Copy the template and fill in your own values:

```bash
cd backend
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL. |
| `SUPABASE_KEY` | Yes | The publishable key (`sb_publishable_...`). Model C uses it together with the caller's own JWT. |
| `SUPABASE_SERVICE_KEY` | Ingestion, Model A and B | The secret key (`sb_secret_...`, formerly called the service role key). It bypasses RLS, so keep it secret, never commit it, and do not set it on the public deployment. |
| `GEMINI_API_KEY` | Yes | Google AI Studio key. |
| `GEMINI_MODEL` | Yes | Generation model. Currently `gemini-3.5-flash-lite`. The server will not start without it. |
| `ACCESS_MODEL` | No | `A`, `B` or `C`. Defaults to `C`. |

Example `.env`:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_secret_...
GEMINI_API_KEY=<your-key>
GEMINI_MODEL=gemini-3.5-flash-lite
ACCESS_MODEL=C
```

`.env` is ignored by git. Only `.env.example` is committed.

---

## 📦 Install Dependencies

Create a virtual environment and install the packages. Do this before ingesting anything.

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# source venv/bin/activate        # macOS / Linux
pip install -r requirements.txt
```

Your prompt should now start with `(venv)`. Check that Python comes from the venv:

```bash
which python
```

Expected: a path ending in `venv/Scripts/python` (or `venv/bin/python`).

---

## 🗄️ Database Setup

1. In the Supabase dashboard, enable the `vector` extension (Database, Extensions).
2. Open the SQL editor and run the files in `backend/sql/` **in this order**:

   | Order | File | What it does |
   |---|---|---|
   | 1 | `create_tables.sql` | Creates `documents` and `chunks`, turns RLS on for both, and grants the roles the access they need. |
   | 2 | `add_chunk_filename.sql` | Adds `chunks.filename` and backfills existing rows. |
   | 3 | `match_chunks.sql` | Creates the vector search function used by `/query`. |
   | 4 | `rls_chunks_policy.sql` | Creates the Row-Level Security policy on `chunks` (Model C). |

3. Create the four demo users (Admin, HR, Legal, Employee) in Supabase Auth. Set each user's `role` in **`app_metadata`**, for example `{"role": "hr"}`. The RLS policy reads the role from there. `user_metadata` is not used for access, because users can edit it.
4. Check the roles were set:

   ```sql
   select email, raw_app_meta_data ->> 'role' as role from auth.users order by email;
   ```

5. Ingest the corpus (next section).

Access rules enforced by the RLS policy (Model C):

| Role | Sees |
|---|---|
| Admin | Admin, HR, Legal and public chunks. |
| HR | HR and public chunks. |
| Legal | Legal and public chunks. |
| Employee | Public chunks only. |

---

## 📥 Ingest the Corpus

Only **PDF** files are supported (Scoping Document FR-8).

1. Place the PDFs in `backend/corpus/`.
2. List each one in `backend/corpus_manifest.csv`. The `department` column must be exactly `admin`, `hr`, `legal` or `public`, in lowercase. A typo ingests without error, but no role except Admin will ever retrieve those chunks.
3. Make sure `SUPABASE_SERVICE_KEY` is set in `.env`. Ingestion writes to `documents` and `chunks`, which public clients cannot insert into.
4. Run:

```bash
cd backend
python ingest.py
```

This splits each document into chunks (800 characters, 100 overlap), embeds them with `gemini-embedding-001` (768 dimensions), and stores them with their `role` and `filename`.

**Re-ingesting:** files already listed in `documents` are skipped. To re-ingest a document, delete its rows first, then run `ingest.py` again:

```sql
delete from chunks where filename = '<file>.pdf';
delete from documents where filename = '<file>.pdf';
```

Check the result:

```sql
select role, count(*) from chunks group by role order by role;
```

---

## 🚀 Run the Backend

Make sure the venv is active (your prompt starts with `(venv)`), then:

```bash
cd backend
source venv/Scripts/activate      # Windows (Git Bash), skip if already active
# source venv/bin/activate        # macOS / Linux
uvicorn main:app --reload
```

## 🔐 Get Test Tokens

The demo accounts are listed in the [README](./README.md). This script logs in as all four roles and exports a token for each:

```bash
cd backend
source test_results/test_scripts/get_tokens.sh
```

It prints `ADMIN_JWT set`, `HR_JWT set`, `LEGAL_JWT set` and `EMPLOYEE_JWT set`. Tokens expire after one hour, so run it again when you get a 401.

---

## 🧪 Try a Query

```bash
curl -X POST http://localhost:8000/query \
  -H "Authorization: Bearer $HR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"query": "What disciplinary action was recommended in case 2026-014?"}'
```

Expected: an answer about the recommended termination, with `H3_conduct_investigation_summary.pdf` listed as the source.

Send the same request with `$EMPLOYEE_JWT`. Expected: `I could not find this in the documents available to your role.` and only `public` chunks in the response.

---

## 🔀 Switch Between Model A, B and C

Set `ACCESS_MODEL` in `.env` and restart the server. The model is chosen once per server start; the request body has no `model` field.

| Model | Behavior | Extra requirement |
|---|---|---|
| A | No access control. Development baseline only. | `SUPABASE_SERVICE_KEY`. |
| B | Application-layer filter in FastAPI. | `SUPABASE_SERVICE_KEY`. |
| C | Retrieval-layer enforcement through Postgres RLS. | None. Default. |

The same prompt and the same generation model are used for all three, so differences in results come from the authorization layer.

---
