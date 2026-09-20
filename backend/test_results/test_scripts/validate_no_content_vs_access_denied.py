"""
Sentra W4.3 (Issue #23): no-content vs access-denied under RLS, Model C.

From the client's side, can you tell "nothing relevant exists" apart from
"something relevant exists but you may not see it"? Checked here:
  1. No chunk outside the role's Section 5A tags in either category.
  2. Both categories return the same JSON key shape.
  3. Both return HTTP 200 (no 403/404 that would reveal restricted content).

access_denied cases are built from the matrix: a role is asked about every
domain it is NOT allowed. Admin can see every domain under Section 5A, so
Admin has no access_denied cases and appears only in no_content.

Run from backend/test_results/test_scripts:
    source get_tokens.sh
    python validate_no_content_vs_access_denied.py

Outputs (in ../csv_files/):
    w4.3_test_results_<timestamp>.csv
    w4.3_summary_<timestamp>.md
"""

import json
import sys
from dataclasses import dataclass

from sentra_test_common import (
    ROLES, ALLOWED_TAGS, EXPECTED_MODEL, load_tokens, post_query, chunk_tags,
    find_leaks, timestamp, write_csv, write_text,
)

NO_CONTENT_QUERIES = [
    "What is the company's office fish tank maintenance schedule?",
    "Does Northlane sponsor an employee fantasy football league?",
    "What is the policy on bringing a skydiving instructor to the office?",
]

DOMAIN_QUERIES = {
    "admin": "What is the process for approving a new vendor contract?",
    "hr": "What is the company's parental leave policy?",
    "legal": "What are the confidentiality obligations in our standard NDA template?",
}


@dataclass
class TestCase:
    category: str
    role: str
    domain: str
    query: str


def build_cases():
    cases = []
    for role in ROLES:
        for query in NO_CONTENT_QUERIES:
            cases.append(TestCase("no_content", role, "none", query))
    for role in ROLES:
        for domain, query in DOMAIN_QUERIES.items():
            if domain in ALLOWED_TAGS[role]:
                continue
            cases.append(TestCase("access_denied", role, domain, query))
    return cases


def main():
    tokens = load_tokens()
    cases = build_cases()
    results, rows = [], []

    for i, tc in enumerate(cases, start=1):
        status, data = post_query(tokens[tc.role], tc.query)
        tags = chunk_tags(data)
        leaked = find_leaks(tc.role, tags)
        keys = sorted(data.keys())
        passed = not leaked and status == 200
        results.append({"tc": tc, "passed": passed, "leaked": leaked, "keys": keys, "status": status})

        label = "PASS" if passed else "FAIL"
        print(f"[{label}] {tc.category:<13} role={tc.role:<8} domain={tc.domain:<6} "
              f"status={status} chunks={tags} keys={keys}")
        rows.append({
            "case_id": f"W4.3-{i:02d}",
            "category": tc.category,
            "role": tc.role,
            "domain": tc.domain,
            "query": tc.query,
            "http_status": status,
            "model": data.get("model", ""),
            "result": label,
            "chunk_count": len(tags),
            "leaked_roles": ";".join(leaked),
            "returned_roles": ";".join(tags),
            "response_keys": ";".join(keys),
            "raw_response": json.dumps(data),
        })

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    nc_keys = {tuple(r["keys"]) for r in results if r["tc"].category == "no_content"}
    ad_keys = {tuple(r["keys"]) for r in results if r["tc"].category == "access_denied"}
    same_shape = nc_keys == ad_keys and len(nc_keys) == 1

    print(f"\n{passed_count}/{total} passed.")
    print("\nResponse shape parity (no_content vs access_denied):")
    print(f"  no_content keys seen:    {nc_keys}")
    print(f"  access_denied keys seen: {ad_keys}")
    print(f"  IDENTICAL SHAPE: {'YES' if same_shape else 'NO, response format leaks category'}")

    failures = [r for r in results if not r["passed"]]
    ts = timestamp()
    csv_path = write_csv(f"w4.3_test_results_{ts}.csv", rows)

    md = [
        "# W4.3 - No-content vs access-denied under RLS (Model C, corrected)\n",
        f"Run: {ts}, model: {EXPECTED_MODEL}\n",
        f"**{passed_count}/{total} cases passed.**\n",
        "Admin can see every domain under Section 5A, so it has no access_denied cases.\n",
        "## Leak check\n",
    ]
    if failures:
        for r in failures:
            t = r["tc"]
            md.append(f"- category={t.category}, role={t.role}, domain={t.domain}, "
                      f"leaked={r['leaked']}, http_status={r['status']}")
    else:
        md.append("No leaks detected across any case.")
    md += [
        "\n## Response shape parity\n",
        f"- no_content response keys: `{sorted(nc_keys)}`",
        f"- access_denied response keys: `{sorted(ad_keys)}`",
        f"- **Identical shape: {'YES' if same_shape else 'NO'}**",
    ]
    if not same_shape:
        md.append("\nThe response format differs between the two categories, so a client could "
                  "tell a denied query from an empty one. Fix before calling Model C leak-proof.")
    md_path = write_text(f"w4.3_summary_{ts}.md", "\n".join(md) + "\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")
    sys.exit(0 if not failures and same_shape else 1)


if __name__ == "__main__":
    main()
