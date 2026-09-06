[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [📝 Decisions & Roadmap](./DECISIONS.md)

---

# 🛡️ Sentra (SecureRAG)

An experimental framework evaluating whether retrieval-layer authorization reduces sensitive-information leakage compared to conventional application-layer access control, built as a role-gated Retrieval-Augmented Generation (RAG) system.

7th Semester Major Project, batch: 2027, Cybersecurity Specialization.

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
| Embeddings & Generation | Google AI Studio (Gemini, `text-embedding-004`) |
| Fallback LLM | Groq (Llama), rate-limit overflow only |
| Document Storage | OCI Object Storage |
| Hosting | Render (backend) · Vercel (frontend) |

---

## 🧪 Evaluation Models

Sentra runs in three switchable configurations for comparison:

| Model | Description |
|---|---|
| **Model A** | No access control (dev-only baseline) |
| **Model B** | Application-layer check in FastAPI |
| **Model C** | Retrieval-layer enforcement via Postgres Row-Level Security *(default)* |

Each configuration is run against a fixed attack query set spanning direct bypass, role impersonation, prompt injection, semantic extraction, cross-domain querying, multi-turn escalation, and fabrication-under-denial — tracked across Unauthorized Retrieval Rate, Retrieval Leakage, Generation Leakage, and Attack Success Rate.

---

## 👥 User Roles

- **Admin**: full access across all document categories.
- **HR**: access to HR-tagged documents only.
- **Legal**: access to Legal-tagged documents only.
- **Employee**: access to general/employee-tagged documents only.

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
| 📄 Scoping Document | [View](/docs/Scoping_Document.pdf) |
| 🗓️ Weekly Development Plan | [View](/docs/roadmap/Weekly_Development_Plan.pdf) |
| 📑 Documentation | [View](/docs/roadmap/Sentra_Project_Documentation_Revised.pdf) |
| 📄 Requirements | [View](/docs/roadmap/requirements.txt) |

---

## 📚 Documentation

| Doc | Covers |
|---|---|
| [⚙️ Setup Guide](./SETUP.md) | Prerequisites, Supabase setup, environment variables, running the app locally. |
| [📡 API Reference](./API_REFERENCE.md) | All endpoints: auth, ingestion, retrieval, generation. |
| [🏗️ Architecture](./ARCHITECTURE.md) | Project structure, RAG pipeline, database schema, Model A/B/C switch logic. |
| [📝 Decisions & Roadmap](./DECISIONS.md) | Design rationale, known limitations, evaluation plan, future improvements. |

---
