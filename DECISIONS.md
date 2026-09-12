[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [📝 Decisions & Roadmap](./DECISIONS.md)

---

# 📝 Decisions & Roadmap

## Design Decisions

### Embeddings: `gemini-embedding-001` (replaces `text-embedding-004`)
`text-embedding-004` was retired January 14, 2026. Replaced with `gemini-embedding-001`, output truncated to 768 dimensions via Matryoshka Representation Learning (MRL) to match the existing `pgvector` column type. Task-type flags (`RETRIEVAL_DOCUMENT` on ingestion, `RETRIEVAL_QUERY` on query calls) are set on the respective API calls.

### `department = 'public'`, not `employee`, for shared documents
Section 5A's access matrix grants HR, Legal, and Admin access to general/public documents in addition to their own department, only Employee is restricted to public-only. Tagging the shared document set (E1 - E8) as `department = employee` would incorrectly scope them to the Employee role alone under a naive `department = current_role` policy, blocking the other three roles unless an exception was added per-policy. Tagging them `public` instead lets a single RLS clause (`department = current_role OR department = 'public'`) correctly cover all four roles. Caught during corpus manifest review, before it was baked into the tagging of all 30 documents.

### Retrieval Precision = precision@5, with chunk count logged per domain
The demo corpus (30 documents) has uneven document lengths by design (E1, the Employee Handbook, is 4 pages against a 1–2 page norm for the rest of the corpus), which skews chunk counts across departments, Public carries roughly double the page count of Admin or Legal. At this corpus size that skew is large enough to measurably affect Retrieval Precision if measured naively, since an Employee-role query's candidate pool (Public-only) differs in size from other roles' pools. Retrieval Precision is therefore fixed at precision@5 (top 5 retrieved chunks) across all roles, and chunk count per domain is logged alongside the metric in the Section 5D results table, so the skew is visible rather than silent.

### E1 (Employee Handbook) length: left as-is, documented rather than rebalanced
Considered three options: leave it (document the imbalance), split it into two documents along its natural content seam, or trim it back to 1–2 pages. Chose to leave it: splitting or trimming risks re-touching a file that already passed content and formatting review, and the length itself is realistic (handbooks are naturally longer than single-purpose HR/Legal memos in real organizations). Addressed instead via the precision@5 + chunk-count-logging decision above, plus a "threats to validity" note planned for the final project report noting that document-length variance measurably affects chunk counts at this corpus scale (N=30) and would diminish at production scale.

---

## Known Limitations

- Small corpus size (30 documents) means per-document length variance has a measurable effect on per-domain chunk counts and, in turn, on cross-role Retrieval Precision comparisons. See "Retrieval Precision" decision above.
- No statistical significance testing across evaluation runs (explicitly out of scope, see Scoping Document Section 11).
- Field/chunk-level encryption tied to role is deferred to future work; encryption at rest plus RBAC/RLS-enforced retrieval is the current security thesis.

---

## Corpus Maintenance

When adding a new document to the corpus (Month 2/3 or later):

1. Decide which department it belongs to (`admin` / `hr` / `legal` / `public`).
2. Decide its sensitivity tier (`public` / `internal` / `confidential`).
3. Add one row to `docs/corpus_manifest.csv` with its filename, `department`, `sensitivity_level`, and page count.
4. Re-run the chunk count per domain (`SELECT department, COUNT(*) FROM chunks GROUP BY department`) and update the chunk-count column in the Section 5D results tracking.

---