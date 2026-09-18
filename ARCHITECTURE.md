[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [📝 Decisions & Roadmap](./DECISIONS.md)

---

# 🏗️ Architecture

## 📁 Project Structure

```
sentra/
├── frontend/                         # React (Vite) app
│   ├── src/
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── backend/                          # FastAPI app
│   ├── .env.example                  # Template for required env vars
│   ├── config.py                     # Loads env vars, ACCESS_MODEL flag, etc.
│   ├── main.py                       # FastAPI app entrypoint, API routes
│   ├── ingest.py                     # Document ingestion pipeline (embeds + stores chunks)
│   ├── corpus_manifest.csv           # Doc metadata: filename, doc_id, department, sensitivity_level, title
│   ├── corpus/                       # Source documents (PDF) before ingestion
│   ├── venv/                         # Python virtual environment
│   ├── __pycache__/
│   └── test_results/
│       ├── csv_files/                # Test run outputs (W4.1, W4.2, W4.3, ...)
│       │   └── ...
│       └── test_scripts/             # Test runners
│           ├── get_tokens.sh         # Fetches fresh JWTs for all 4 test roles
│           └── ...
├── docs/
│   ├── Scoping_document.pdf
│   ├── requirements.txt
│   ├── diagrams/
│   ├── api/                          # OpenAPI & Postman Collections
│   └── reports/                      # Progress reports
├── screenshots/                      # UI preview
└── README.md
```

---

## 🌿 Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, protected — PR only |
| `dev` | Active development branch, local changes |
| `vercel` | Hosting demo version only |

**Workflow:** work happens directly on `dev`; `dev` is merged into `main` and cherry-picked to `vercel` keeping the branch stable and the hosted demo in sync.

---