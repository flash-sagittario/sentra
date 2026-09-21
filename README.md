# 🛡️ Sentra (SecureRAG)

An experimental, role-gated Retrieval-Augmented Generation (RAG) framework evaluating whether retrieval-layer authorization, implemented via Postgres Row-Level Security, reduces sensitive-information leakage in LLM applications compared to conventional application-layer access control.

---

## 🚀 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.2.8 |
| Language (Frontend) | TypeScript | 6.0.3 |
| Build Tool | Vite | 8.2.2 |
| Styling | Tailwind CSS | 4.3.3 |
| Language (Backend) | Python | 3.12 |
| Backend Framework | FastAPI | 0.141.1 |
| Server | Uvicorn | 0.52.4 |
| Text Splitting | langchain-text-splitters (RecursiveCharacterTextSplitter) | 1.1.2 |
| PDF Parsing | pypdf (PdfReader, used directly) | 6.18.1 |
| Vector Database | Supabase (Postgres + pgvector) | pgvector 0.8.2, supabase-py 2.31.0 |
| Authentication | Supabase Auth (JWT) | supabase-auth 2.31.0 |
| Embeddings | gemini-embedding-001, truncated to 768 dims via MRL | google-genai 2.23.0 |
| Generation | gemini-3.5-flash-lite (Google AI Studio) | google-genai 2.23.0 |
| Config | python-dotenv | 1.2.3 |
| Document Storage | OCI Object Storage | - |
| Hosting | Vercel | - |

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

- **Admin**: full access across all departments (Admin, HR, Legal, and Public/general).
- **HR**: HR-tagged documents **plus** Public/general documents.
- **Legal**: Legal-tagged documents **plus** Public/general documents.
- **Employee**: Public/general documents only.

### Access Matrix

| User Role | Admin Data | HR Data | Legal Data | Public Data |
|---|---|---|---|---|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **HR** | ❌ | ✅ | ❌ | ✅ |
| **Legal** | ❌ | ❌ | ✅ | ✅ |
| **Employee** | ❌ | ❌ | ❌ | ✅ |

Admin-tagged documents (such as the vendor contract approval process) are visible to Admin only. Access is enforced inside the database with Row-Level Security.

**Verified on Model C:** the access-control tests W4.1 to W4.3 pass (16/16, 48/48 and 19/19, no leaks).

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
| 🗺️ Diagrams | [View](/docs/diagrams/) |
| 📝 Report | [View](/docs/reports/) |
| 🧪 Tests | [View](/backend/test_results/) |
| 🖼️ Screenshots | [View](/screenshots/) |
| 🛒 Postman Collection | [View](/docs/api/) |
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
| [⚙️ Setup Guide](./SETUP.md) | Prerequisites, environment variables, database setup, ingestion, running the backend, and running the tests. |
| [📡 API Reference](./API_REFERENCE.md) | The `/health` and `/query` endpoints: authentication, request and response, status codes, and access behavior. |
| [🏗️ Architecture](./ARCHITECTURE.md) | Project structure, pipeline status, query flow, database schema, Model A/B/C comparison, and test structure. |
| [📝 Decisions](./DECISIONS.md) | Design rationale, deviations from the scoping document, known limitations, and future work. |

---
