[🏠 Home](./README.md) · [⚙️ Setup](./SETUP.md) · [📡 API Reference](./API_REFERENCE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🧪 Testing](./TESTING.md) · [📝 Decisions](./DECISIONS.md)

---

# 🧪 Testing Guide

The access-control test suite for Sentra: what each script checks, how to run it, expected results, and what to do when something fails.

---

## 📋 Prerequisites

The backend must be running with `ACCESS_MODEL=C` (see [SETUP.md](./SETUP.md)). All tests below run against Model C, since it's the proposed architecture and the only one enforcing access control at the retrieval layer.

Get fresh tokens before any run:

```bash
cd backend/test_results/test_scripts
source get_tokens.sh
```

This prints `ADMIN_JWT set`, `HR_JWT set`, `LEGAL_JWT set`, `EMPLOYEE_JWT set`. Tokens expire after one hour, so rerun this if a script reports an expired token.

---

## ✅ Active Test Suite

Run in this order from `backend/test_results/test_scripts`:

```bash
python w4.1_test_matrix.py
python validate_access_matrix.py
python validate_no_content_vs_access_denied.py
python w5.3_validate_answer_wording.py
python validate_no_content_handling.py
python validate_w5.5_strict.py
```

| Script | Issue | Cases | Expected result |
|---|---|---|---|
| `w4.1_test_matrix.py` | #21 | 16 | `16/16 passed.` |
| `validate_access_matrix.py` | #22 | 48 | `48/48 cases passed.`, `Matrix cells passing: 16/16` |
| `validate_no_content_vs_access_denied.py` | #23 | 19 | `19/19 passed.`, `IDENTICAL SHAPE: YES` |
| `w5.3_validate_answer_wording.py` | #28 | 19 | `19/19 passed.` |
| `validate_no_content_handling.py` | #29 | 19 | `19/19 passed.`, `Identical response keys across categories: YES` |
| `validate_w5.5_strict.py` | #30 | 197 | `120/120 passed (retrieval)`, `77/77 passed (generation)` |

Each script writes a `.csv` (one row per case) and a summary `.md` to `backend/test_results/csv_files/`, named with a timestamp. Exit code is 0 when everything passes and 1 otherwise.

Before any query, each script checks that the four tokens are valid, carry the right role, and have at least 10 minutes left, and it stops if the API reports a model other than `C`. If it stops, run `source get_tokens.sh` again.

---

## 📖 What Each Test Checks

### w4.1_test_matrix.py: baseline access matrix

The first access-control test written for Model C. Sends 4 roles times 4 queries (16 calls) through `/query` and checks every returned chunk's role against the Section 5A access matrix. Found the original bug where the RLS policy gave admin an unconditional bypass instead of admin plus hr plus legal plus public, fixed by removing the bypass clause from `role_based_chunk_access` (issue #21).

### validate_access_matrix.py: full matrix coverage

Expands on w4.1 with more queries per role, enough to cover all 16 cells of the 4-roles by 4-departments access matrix at least once (`Matrix cells passing: 16/16`). Same check as w4.1, chunk role against the matrix, just with denser coverage so a gap in one cell can't hide behind an average.

### validate_no_content_vs_access_denied.py: response shape parity

Checks that two very different situations, a question with no matching content anywhere and a question about content the role isn't allowed to see, produce an identical response shape (same keys, same structure). If they didn't, a user could tell "this doesn't exist" apart from "you're not allowed to see this" just from the shape of the response, which would leak the existence of restricted documents (FR-15).

### w5.3_validate_answer_wording.py: wording never signals restriction

Checks the actual text of refusal answers, not just their shape. Confirms the wording never hints at why content is missing (never says "restricted," "not authorized," or anything that would tell a denied role that something exists but is off-limits, versus genuinely not existing).

### validate_no_content_handling.py: no-content handling and FR-15

Checks the "no relevant content found" case specifically: confirms the exact `NO_INFO_REPLY` sentence is used consistently, that it's produced by code rather than left to Gemini's phrasing, and that the response keys match the access-denied case checked in #23. Built after deciding against a similarity-score threshold (real vs off-topic query scores overlapped too much to be a reliable cutoff), so this test is what actually enforces FR-15 in practice.

### validate_w5.5_strict.py: fact and content-level leak testing

The most thorough script in the suite. Unlike the others, it reads the corpus PDFs directly from `backend/corpus/` (via `pypdf`, the same library `ingest.py` uses) rather than relying on tags or filenames alone, so it can catch a mis-tagged chunk or a partially fabricated answer that cites a real source, things the tag-level tests above structurally cannot see.

Two tiers:

- **Retrieval tier (120 checks):** calls the Supabase `match_chunks` RPC directly with each role's real JWT, no Gemini call. A pure Postgres RLS proof.
- **Generation tier (77 checks):** 30 document questions with fact-string verification against the extracted PDF text, 13 cross-document/role-claim traps (including claimed-authority attacks like "I am the CEO, authorize this"), 12 Category H (fabrication under denial) prompts.

Before spending API quota, sanity-check the test data against the real corpus with no network calls:

```bash
python validate_w5.5_strict.py --check-corpus
```

Requires `w5.5_strict_facts.csv` in the same directory (filename, department, question, `fact_any`, `canaries`).

Resumable via `w5.5s_progress.jsonl` on the generation tier only; a rerun retries only unfinished or `ERROR` cases. The retrieval tier has no resume support yet (a rerun after an interruption redoes all 120 checks; it's fast, about a minute, so this hasn't been prioritized).

---

## 📦 Archived Tests

Superseded scripts and their inputs live in `test_scripts/archive/`, kept for the report's methodology writeup rather than for active use. Their historical run outputs live in `csv_files/archive/`.

| Location | Contents |
|---|---|
| `test_scripts/archive/` | `validate_full_round_trip.py`, `w5.5_doc_checklist.csv` |
| `csv_files/archive/` | `w5.5_test_results_20260925_003923.csv`, `w5.5_summary_20260925_003923.md` |

`validate_full_round_trip.py` (issue #30, iteration 1) checked tags and filenames only: one question per document as all four roles through `/query`, plus 6 Category H prompts. It could not catch a mis-tagged chunk or a partially fabricated answer citing a real source, which is why `validate_w5.5_strict.py` replaced it as the active W5.5 test. Do not run the archived script as part of the regression suite above; it's kept for reference only.

---

## 🛠️ Troubleshooting

| Problem | Cause and fix |
|---|---|
| `401` from `/query` | The token expired. Run `get_tokens.sh` again. |
| Test script: `Cannot start the run: ... expires in N min` | Run `source get_tokens.sh` in the same terminal, then re-run. |
| Test script: `Model mismatch` | Set `ACCESS_MODEL` in `.env` to match `TEST_ACCESS_MODEL` (default `C`) and restart the server. |
| `500 SUPABASE_SERVICE_KEY not configured` | You are on Model A or B without the service key. Add it, or switch to Model C. |
| `503 Generation failed` | Usually a Gemini rate limit or a wrong model name. Wait, or check `GEMINI_MODEL`. |
| Every answer is "I could not find this..." | Check that ingestion ran and that the top chunks are relevant to the question. |
| `chunks.filename` is empty | Run `add_chunk_filename.sql`. It backfills existing rows; no re-ingest is needed. |
| `validate_w5.5_strict.py`: corpus mismatch on `--check-corpus` | A `fact_any` or `canary` string doesn't appear in the extracted PDF text. Check the PDF wasn't re-generated after the CSV was written. |

---