"""
Sentra W4.1 (Issue #21): 4 roles x 4 queries smoke test, Model C.

Corrected to Section 5A: Admin may receive admin, hr, legal and public chunks;
HR gets hr + public; Legal gets legal + public; Employee gets public only.

Run from backend/test_results/test_scripts:
    source get_tokens.sh
    python w4.1_test_matrix.py

Outputs (in ../csv_files/):
    w4.1_test_matrix_results_<timestamp>.csv
    w4.1_summary_<timestamp>.md
"""

import json
import sys

from sentra_test_common import (
    ROLES, EXPECTED_MODEL, load_tokens, post_query, chunk_tags, find_leaks,
    timestamp, write_csv, write_text,
)

QUERIES = [
    ("Q1_admin_domain", "admin", "What is the process for approving a new vendor contract?"),
    ("Q2_hr_domain", "hr", "What is the company's parental leave policy?"),
    ("Q3_legal_domain", "legal", "What are the confidentiality obligations in our standard NDA template?"),
    ("Q4_public_domain", "public", "How do I request time off through the HR portal?"),
]


def main():
    tokens = load_tokens()
    rows = []
    for role in ROLES:
        for qid, domain, qtext in QUERIES:
            status, body = post_query(tokens[role], qtext)
            tags = chunk_tags(body)
            leaked = find_leaks(role, tags)
            if status != 200:
                result = f"FAIL - HTTP {status}"
            elif leaked:
                result = "FAIL - LEAK"
            elif not tags:
                result = "FAIL - NO CHUNKS"
            else:
                result = "PASS"
            rows.append({
                "role": role,
                "query_id": qid,
                "query": qtext,
                "http_status": status,
                "model": body.get("model", ""),
                "chunk_count": len(tags),
                "returned_roles": ";".join(tags),
                "leaked_roles": ";".join(leaked),
                "domain_chunk_returned": domain in tags,
                "result": result,
                "raw_response": json.dumps(body),
            })
            print(f"[{role:>8}] {qid}: {result} (status={status}, chunks={tags})")

    ts = timestamp()
    total = len(rows)
    passed = sum(1 for r in rows if r["result"] == "PASS")
    fails = [r for r in rows if r["result"] != "PASS"]
    csv_path = write_csv(f"w4.1_test_matrix_results_{ts}.csv", rows)

    lines = [
        "# W4.1 - 4 roles x 4 queries (Model C, Section 5A corrected)\n",
        f"Run: {ts}, model: {EXPECTED_MODEL}\n",
        f"**{passed}/{total} cases passed.**\n",
        "| Role | Q1 admin | Q2 hr | Q3 legal | Q4 public |",
        "|------|------|------|------|------|",
    ]
    for role in ROLES:
        cells = [next(r["result"] for r in rows if r["role"] == role and r["query_id"] == q[0]) for q in QUERIES]
        lines.append(f"| {role} | " + " | ".join("PASS" if c == "PASS" else c for c in cells) + " |")
    if fails:
        lines.append("\n## Failures\n")
        for r in fails:
            lines.append(f"- {r['role']} / {r['query_id']}: {r['result']}, leaked={r['leaked_roles']}")
    else:
        lines.append("\nNo leaks detected. Every returned chunk was allowed for its role under Section 5A.")
    md_path = write_text(f"w4.1_summary_{ts}.md", "\n".join(lines) + "\n")

    print(f"\n{passed}/{total} passed.")
    print(f"Wrote {csv_path}")
    print(f"Wrote {md_path}")
    sys.exit(0 if not fails else 1)


if __name__ == "__main__":
    main()
