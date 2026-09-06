[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [📝 Decisions & Roadmap](./DECISIONS.md)

---

# 🏗️ Architecture

## 📁 Project Structure

```
ticket-management-system/
├── frontend/                         # React (Vite) app
│   ├── src/
│   │   ├── assets/
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── backend/                          # FastAPI app
│   ├── venv/                      
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── Scoping_Document
│   ├── diagrams/                     
│   ├── api/                          # OpenAPI & Postman Collections
│   ├── roadmap/                      # Timeline and phases
│   └── reports/                      # Progress reports
├── screenshots/                      # UI preview
│   └── login-preview.png             
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