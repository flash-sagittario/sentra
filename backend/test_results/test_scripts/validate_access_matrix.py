"""
Sentra W4.2 (Issue #22): Section 5A role x domain access matrix, Model C.

Every role is tested against every domain with 3 phrasings each.
Case rule (security): status must be 200 and no chunk outside the role's
allowed tags (Admin: admin/hr/legal/public, HR: hr/public, Legal: legal/public,
Employee: public). If the role is allowed the domain, some chunk must come back.

Cell rule (reachability): for a domain the role is allowed, at least one of the
3 phrasings must return a chunk tagged with that domain. This catches a role
that is silently under-permitted (for example Admin blocked from hr), which a
leak check alone can never see. One phrasing missing is a retrieval-quality
note, not an access failure.

Run from backend/test_results/test_scripts:
    source get_tokens.sh
    python validate_access_matrix.py

Outputs (in ../csv_files/):
    w4.2_test_matrix_results_<timestamp>.csv
    w4.2_summary_<timestamp>.md
"""

import json
import sys
from dataclasses import dataclass

from sentra_test_common import (
    ROLES, ALLOWED_TAGS, EXPECTED_MODEL, load_tokens, post_query, chunk_tags,
    find_leaks, timestamp, write_csv, write_text,
)

DOMAIN_QUERIES = {
    "admin": [
        "What is the process for approving a new vendor contract?",
        "How are new vendor contracts approved at Northlane?",
        "vendor contract approval process",
    ],
    "hr": [
        "What is the company's parental leave policy?",
        "How many weeks of paid parental leave do employees get?",
        "parental leave benefit",
    ],
    "legal": [
        "What are the confidentiality obligations in our standard NDA template?",
        "What must employees keep confidential under the NDA?",
        "NDA confidentiality obligations",
    ],
    "public": [
        "How do I request time off through the HR portal?",
        "How do I submit a floating holiday request?",
        "time off request process",
    ],
}
DOMAINS = list(DOMAIN_QUERIES)


@dataclass
class TestCase:
    role: str
    domain: str
    query: str
    expect_allowed: bool


def build_matrix():
    return [
        TestCase(role, domain, q, domain in ALLOWED_TAGS[role])
        for role in ROLES
        for domain, queries in DOMAIN_QUERIES.items()
        for q in queries
    ]


def cell_status(role, domain, results):
    cell = [r for r in results if r["tc"].role == role and r["tc"].domain == domain]
    if not all(r["passed"] for r in cell):
        return "F(fail)"
    if domain in ALLOWED_TAGS[role] and not any(r["hit"] for r in cell):
        return "F(no hit)"
    return "P"


def main():
    tokens = load_tokens()
    cases = build_matrix()
    results, rows = [], []

    for i, tc in enumerate(cases, start=1):
        status, data = post_query(tokens[tc.role], tc.query)
        tags = chunk_tags(data)
        leaked = find_leaks(tc.role, tags)
        passed = status == 200 and not leaked and (not tc.expect_allowed or len(tags) > 0)
        hit = tc.domain in tags
        results.append({"tc": tc, "passed": passed, "leaked": leaked, "tags": tags, "hit": hit})

        label = "PASS" if passed else "FAIL"
        print(f"[{label}] role={tc.role:<8} domain={tc.domain:<7} allowed={tc.expect_allowed!s:<5} "
              f"status={status} chunks={tags} query={tc.query!r}")
        rows.append({
            "case_id": f"W4.2-{i:02d}",
            "role": tc.role,
            "domain": tc.domain,
            "query": tc.query,
            "expect_allowed": tc.expect_allowed,
            "http_status": status,
            "model": data.get("model", ""),
            "result": label,
            "leaked_roles": ";".join(leaked),
            "returned_roles": ";".join(tags),
            "domain_chunk_returned": hit if tc.expect_allowed else "",
            "raw_response": json.dumps(data),
        })

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    cells = {(role, d): cell_status(role, d, results) for role in ROLES for d in DOMAINS}
    bad_cells = {k: v for k, v in cells.items() if v != "P"}

    print(f"\n{passed_count}/{total} cases passed.")
    print("\nSection 5A matrix (P = all phrasings safe and, where allowed, domain reachable):")
    print("role".ljust(10) + "".join(d.ljust(12) for d in DOMAINS))
    for role in ROLES:
        print(role.ljust(10) + "".join(cells[(role, d)].ljust(12) for d in DOMAINS))

    print(f"Matrix cells passing: {len(cells) - len(bad_cells)}/{len(cells)}")
    if bad_cells:
        print("FAILED CELLS: " + ", ".join(f"{role}/{d}={v}" for (role, d), v in bad_cells.items()))

    misses = [r for r in results if r["tc"].expect_allowed and not r["hit"] and r["passed"]]
    if misses:
        print("\nRetrieval notes (allowed, no leak, but this phrasing returned no chunk of its own domain):")
        for r in misses:
            print(f"  role={r['tc'].role} domain={r['tc'].domain} query={r['tc'].query!r} got={r['tags']}")

    ts = timestamp()
    csv_path = write_csv(f"w4.2_test_matrix_results_{ts}.csv", rows)

    md = [
        "# W4.2 - Section 5A Access Matrix Validation (Model C, corrected)\n",
        f"Run: {ts}, model: {EXPECTED_MODEL}\n",
        f"**{passed_count}/{total} cases passed. {len(cells) - len(bad_cells)}/{len(cells)} matrix cells passed.**\n",
        "P = every phrasing had no leak and, where the role is allowed the domain, at least one phrasing "
        "returned a chunk of that domain.\n",
        "| Role | " + " | ".join(DOMAINS) + " |",
        "|------|" + "------|" * len(DOMAINS),
    ]
    for role in ROLES:
        md.append(f"| {role} | " + " | ".join(cells[(role, d)] for d in DOMAINS) + " |")
    failures = [r for r in results if not r["passed"]]
    if bad_cells:
        md.append("\n## Failed cells\n")
        for (role, d), v in bad_cells.items():
            md.append(f"- {role} / {d}: {v}")
    if failures:
        md.append("\n## Failures\n")
        for r in failures:
            md.append(f"- role={r['tc'].role}, domain={r['tc'].domain}, query={r['tc'].query!r}, leaked={r['leaked']}")
    else:
        md.append("\nNo leaks detected across any role/domain combination.")
    if misses:
        md.append("\n## Retrieval notes (not access failures)\n")
        for r in misses:
            md.append(f"- role={r['tc'].role}, domain={r['tc'].domain}, query={r['tc'].query!r}, got={r['tags']}")
    md_path = write_text(f"w4.2_summary_{ts}.md", "\n".join(md) + "\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")
    sys.exit(0 if not failures and not bad_cells else 1)


if __name__ == "__main__":
    main()
