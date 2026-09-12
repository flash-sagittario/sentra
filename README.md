[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [📝 Decisions & Roadmap](./DECISIONS.md)

---

# 🛡️ Sentra (SecureRAG)

An experimental, role-gated Retrieval-Augmented Generation (RAG) framework evaluating whether retrieval-layer authorization, implemented via Postgres Row-Level Security, reduces sensitive-information leakage in LLM applications compared to conventional application-layer access control.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend Runtime | FastAPI (Python) |
| Orchestration | LangChain |
| Vector Database | Supabase (Postgres + pgvector) |
| Authentication | Supabase Auth (JWT) |
| Embeddings | Google AI Studio (Gemini, `gemini-embedding-001`, truncated to 768 dims via MRL) |
| Generation | Google AI Studio (Gemini) |
| Fallback LLM | Groq (Llama), rate-limit overflow only |
| Document Storage | OCI Object Storage |
| Hosting | Vercel |

---

## 🧪 Evaluation Models

Sentra runs in three switchable configurations for comparison:

| Model | Description |
|---|---|
| **Model A** | No access control (dev-only baseline) |
| **Model B** | Application-layer check in FastAPI |
| **Model C** | Retrieval-layer enforcement via Postgres Row-Level Security *(default)* |

Each configuration is run against a fixed attack query set spanning direct bypass, role impersonation, prompt injection, semantic extraction, cross-domain querying, multi-turn escalation, and fabrication-under-denial; tracked across `Unauthorized Retrieval Rate`, `Retrieval Leakage`, `Generation Leakage`, `Retrieval Precision`,  and `Attack Success Rate`.

---

## 👥 User Roles & Document Access

- **Admin**: full access across all departments (HR, Legal, and Public/general).
- **HR**: HR-tagged documents **plus** Public/general documents.
- **Legal**: Legal-tagged documents **plus** Public/general documents.
- **Employee**: Public/general documents only.

### Access Matrix

| User Role | HR Data | Legal Data | Public Data |
|---|---|---|---|
| **Admin** | ✅ | ✅ | ✅ |
| **HR** | ✅ | ❌ | ✅ |
| **Legal** | ❌ | ✅ | ✅ |
| **Employee** | ❌ | ❌ | ✅ |

---

## 🔐 Demo Credentials

Use these seeded accounts to test role-based access locally:

| Role | Email | Password |
|---|---|---|
| Admin | admin@sentra.com | Admin@123 |
| HR | hr@sentra.com | Hr@12345 |
| Legal | legal@sentra.com | Legal@123 |
| Employee | employee@sentra.com | Employee@123 |

> **Note:** These accounts are for local development and evaluation only. Do not use these credentials in production.

---

## 📋 Project Resources

| Resource | Link |
|---|---|
| 📑 Scoping Document | [View](/docs/Scoping_Document.pdf) |
| 📄 Requirements | [View](/docs/requirements.txt) |
| 📋 Corpus Manifest | [View](/docs/corpus_manifest.csv) |
| 📊 Project Board | [View](https://github.com/users/flash-sagittario/projects/2/) |

--- 

| Milestone | Due | Focus |
|---|---|---|
| Month 1 | Sept 30, 2026 | Core RAG + ingestion + JWT auth + retrieval-time filtering (Model C) |
| Month 2 | Oct 31, 2026 | Web app (upload, chat, dashboards) + cloud deployment + Model A/B switch |
| Month 3 | Nov 30, 2026 | Audit logging + attack query set + evaluation script/results + report |

---

## 📚 Documentation

| Doc | Covers |
|---|---|
| [⚙️ Setup Guide](./SETUP.md) | Prerequisites, Supabase setup, environment variables, running the app locally. |
| [📡 API Reference](./API_REFERENCE.md) | All endpoints: auth, ingestion, retrieval, generation. |
| [🏗️ Architecture](./ARCHITECTURE.md) | Project structure, RAG pipeline, database schema, Model A/B/C switch logic. |
| [📝 Decisions](./DECISIONS.md) | Design rationale, known limitations, evaluation plan, future improvements. |

---
