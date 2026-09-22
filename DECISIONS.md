[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [📝 Decisions](./DECISIONS.md)

---

## Design Decisions

### Embeddings: `gemini-embedding-001` (replaces `text-embedding-004`)
`text-embedding-004` was retired January 14, 2026. Replaced with `gemini-embedding-001`, output truncated to 768 dimensions via Matryoshka Representation Learning (MRL) to match the existing `pgvector` column type. Task-type flags (`RETRIEVAL_DOCUMENT` on ingestion, `RETRIEVAL_QUERY` on query calls) are set on the respective API calls.

### Shared documents are tagged `public`, not `employee`
Section 5A's access matrix grants HR, Legal, and Admin access to general documents in addition to their own department. Only Employee is restricted to public documents alone. Tagging the shared document set (E1 to E8) as `employee` would scope them to the Employee role only, blocking the other three roles unless an exception was added. Tagging them `public` lets one simple rule cover all four roles. Caught during corpus manifest review, before it was applied to all 30 documents.

The manifest column is called `department`. In the database, the same value is stored in the `role` column of the `chunks` table.

### Access matrix
Each chunk carries one tag: `admin`, `hr`, `legal` or `public`. What each role can read:

| Role | Can read |
|---|---|
| Admin | admin, hr, legal, public |
| HR | hr, public |
| Legal | legal, public |
| Employee | public |

### The role comes from a server-controlled field
A user's role is read from a field that only the server can change, never from a field the user can edit. Otherwise a user could grant themselves any role. Both Model B and Model C read the role from the same place.

### Access model is set per server start, not per request
The request body has no `model` field. The `ACCESS_MODEL` setting selects Model A, B or C when the server starts, and the response `model` field only reports that setting. This means a caller cannot switch to a weaker model by changing a request. The Month 3 evaluation harness restarts the server for each model. The public deployment runs Model C only.

### Model B verifies the token signature
Model B checks the signature and expiry of the login token itself, so it does not trust the role claim inside an unverified token. Verification happens locally instead of through a Supabase call, so Model B does not pay a network round trip that Model C does not. This keeps the latency comparison (RQ4) fair.

### Restricted questions get the same response as empty results
The API does not return a distinct "access denied" message. A question that matches nothing and a question that only matches content the caller cannot see get the same kind of response, with the same shape. A distinct denial would itself confirm that restricted content exists. This is a deliberate design choice.

### Chunk size is counted in characters
`RecursiveCharacterTextSplitter` counts characters unless given a token counter. The pipeline uses 800 characters with 100 overlap (roughly 200 tokens). Ingestion and all access-control tests were verified on this setting, so the project documents say characters. Changing it means re-ingesting the corpus and rerunning the tests.

### One generation model, no fallback
`gemini-3.5-flash-lite` generates every answer in Models A, B and C, so the authorization layer is the only variable in the study. A Groq fallback was dropped to avoid a second SDK and key.

### Retrieval Precision = precision@5, with chunk count logged per domain
The demo corpus (30 documents) has uneven document lengths by design (E1, the Employee Handbook, is 4 pages against a 1 to 2 page norm for the rest of the corpus). This skews chunk counts across departments: Public carries roughly double the page count of Admin or Legal. At this corpus size the skew is large enough to measurably affect Retrieval Precision if measured naively, since an Employee-role query's candidate pool (Public-only) differs in size from other roles' pools. Retrieval Precision is therefore fixed at precision@5 (top 5 retrieved chunks) across all roles, and chunk count per domain is logged alongside the metric in the Section 5D results table, so the skew is visible rather than silent.

### E1 (Employee Handbook) length: left as-is, documented rather than rebalanced
Considered three options: leave it (document the imbalance), split it into two documents along its natural content seam, or trim it back to 1 to 2 pages. Chose to leave it: splitting or trimming risks re-touching a file that already passed content and formatting review, and the length itself is realistic (handbooks are naturally longer than single-purpose HR or Legal memos in real organizations). Addressed instead through the precision@5 and chunk-count-logging decision above, plus a "threats to validity" note planned for the final project report. The note will say that document-length variance measurably affects chunk counts at this corpus scale (N=30) and would diminish at production scale.

---

## Known Limitations

- Small corpus size (30 documents) means per-document length variance has a measurable effect on per-domain chunk counts and, in turn, on cross-role Retrieval Precision comparisons. See the "Retrieval Precision" decision above.
- No statistical significance testing across evaluation runs (explicitly out of scope, see Scoping Document Section 11).
- Field or chunk-level encryption tied to role is deferred to future work. Encryption at rest plus RBAC and RLS-enforced retrieval is the current security thesis.
- Model B can return fewer than 5 chunks, while Model C always returns 5 permitted chunks. This affects the Precision@5 comparison and will be covered in the threats-to-validity note.

---

## Future Work

- Count chunk size in tokens instead of characters. This needs a re-ingest and a rerun of the access-control tests.
- Field or chunk-level encryption tied to role.

---

## Corpus Maintenance

When adding a new document to the corpus (Month 2/3 or later):

1. The file must be a PDF (FR-8).
2. Decide which department it belongs to (`admin` / `hr` / `legal` / `public`).
3. Add one row to `backend/corpus_manifest.csv` with its filename and `department`. Ingestion reads only these two fields.
4. Run ingestion, then re-run the chunk count per domain and update the chunk-count column in the Section 5D results tracking:
   ```sql
   select role, count(*) from chunks group by role order by role;
   ```
5. Re-run the access-control tests (see the Setup guide) if the new document changes what a role can retrieve.

---
