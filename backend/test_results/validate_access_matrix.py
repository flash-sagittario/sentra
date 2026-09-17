"""
Sentra W4.2 - Section 5A Access Matrix Validation
Issue: #22

Expands on W4.1's 4-role x 4-query check (Issue #21). Tests every role
against every real domain, with multiple query phrasings per domain, and
reports a role x domain pass/fail matrix matching the Section 5A design.

Your corpus only has chunks tagged role = admin / hr / legal / public
(confirmed live). There is no employee-only private domain, employees
only ever get public chunks. DOMAIN_QUERIES has no "employee" key, and
the allowed check falls out correctly without a special case.

Rule under test (Section 5A): a role should only ever receive chunks
tagged role = <its own role> OR role = 'public'. Everything else is a leak.

Usage:
   get jwt first for all 4 roles:
   curl -X POST 'https://<project-ref_id>.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: <publishable_key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sentra.com","password":"<admin password>"}'

    export ADMIN_JWT=... HR_JWT=... LEGAL_JWT=... EMPLOYEE_JWT=...
    export SENTRA_API_URL=http://localhost:8000   # optional, defaults to this
    python validate_access_matrix.py

Output:
    Prints PASS/FAIL per case plus a summary matrix to the terminal.
    Also writes two files next to the script:
      - w42_test_matrix_results_<timestamp>.csv   (full per-case log, same
        shape as your W4.1 CSV, with the full untruncated raw response)
      - w42_summary_<timestamp>.md                (matrix table, ready to
        paste into the GitHub issue comment when closing #22)
"""

import os
import csv
import json
import requests
from dataclasses import dataclass
from datetime import datetime

BASE_URL = os.getenv("SENTRA_API_URL", "http://localhost:8000")
QUERY_ENDPOINT = f"{BASE_URL}/query"

ROLES = ["admin", "hr", "legal", "employee"]

TEST_TOKENS = {
    "admin": os.environ["ADMIN_JWT"],
    "hr": os.environ["HR_JWT"],
    "legal": os.environ["LEGAL_JWT"],
    "employee": os.environ["EMPLOYEE_JWT"],
}

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


@dataclass
class TestCase:
    role: str
    domain: str
    query: str
    expect_allowed: bool


def build_matrix():
    cases = []
    for role in ROLES:
        for domain, queries in DOMAIN_QUERIES.items():
            expect_allowed = (domain == role) or (domain == "public")
            for query in queries:
                cases.append(TestCase(role, domain, query, expect_allowed))
    return cases


def run_query(role: str, query: str):
    headers = {"Authorization": f"Bearer {TEST_TOKENS[role]}"}
    resp = requests.post(QUERY_ENDPOINT, json={"query": query}, headers=headers, timeout=30)
    return resp


def chunk_roles(response_json):
    return [c["role"] for c in response_json.get("chunks", [])]


def evaluate(tc: TestCase, returned_roles):
    allowed = {tc.role, "public"}
    leaked = [r for r in returned_roles if r not in allowed]
    if tc.expect_allowed:
        passed = len(returned_roles) > 0 and not leaked
    else:
        passed = not leaked
    return passed, leaked


def main():
    cases = build_matrix()
    results = []
    csv_rows = []

    for i, tc in enumerate(cases, start=1):
        resp = run_query(tc.role, tc.query)
        data = resp.json()
        returned_roles = chunk_roles(data)
        passed, leaked = evaluate(tc, returned_roles)
        results.append((tc, passed, leaked, returned_roles))

        status = "PASS" if passed else "FAIL"
        print(f"[{status}] role={tc.role:<9} domain={tc.domain:<9} "
              f"expect_allowed={tc.expect_allowed} query={tc.query!r}")
        if leaked:
            print(f"         leaked roles: {leaked}")

        csv_rows.append({
            "case_id": f"W4.2-{i:02d}",
            "role": tc.role,
            "domain": tc.domain,
            "query": tc.query,
            "expect_allowed": tc.expect_allowed,
            "http_status": resp.status_code,
            "result": status,
            "leaked_roles": ";".join(leaked) if leaked else "",
            "returned_roles": ";".join(returned_roles),
            "raw_response": json.dumps(data),  # full, not truncated
        })

    total = len(results)
    passed_count = sum(1 for _, p, _, _ in results if p)
    print(f"\n{passed_count}/{total} passed.")

    # Role x domain summary matrix
    matrix_lines = []
    header = "role".ljust(10) + "".join(d.ljust(10) for d in DOMAIN_QUERIES)
    matrix_lines.append(header)
    matrix_cells = {}
    for role in ROLES:
        row = role.ljust(10)
        for domain in DOMAIN_QUERIES:
            cell_results = [p for tc, p, _, _ in results if tc.role == role and tc.domain == domain]
            cell = "P" if all(cell_results) else "F"
            matrix_cells[(role, domain)] = cell
            row += cell.ljust(10)
        matrix_lines.append(row)

    print("\nSection 5A matrix summary (P = all phrasings passed, F = at least one failed):")
    for line in matrix_lines:
        print(line)

    failures = [r for r in results if not r[1]]
    if failures:
        print("\nFailure detail:")
        for tc, _, leaked, returned in failures:
            print(f"  role={tc.role} domain={tc.domain} query={tc.query!r} leaked={leaked}")

    # --- write output files ---
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    csv_path = f"w42_test_matrix_results_{ts}.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
        writer.writeheader()
        writer.writerows(csv_rows)

    md_path = f"w42_summary_{ts}.md"
    with open(md_path, "w") as f:
        f.write(f"# W4.2 - Section 5A Access Matrix Validation\n\n")
        f.write(f"Run: {ts}\n\n")
        f.write(f"**{passed_count}/{total} cases passed.**\n\n")
        f.write("| Role | " + " | ".join(DOMAIN_QUERIES) + " |\n")
        f.write("|------|" + "------|" * len(DOMAIN_QUERIES) + "\n")
        for role in ROLES:
            row_cells = [matrix_cells[(role, d)] for d in DOMAIN_QUERIES]
            f.write(f"| {role} | " + " | ".join(row_cells) + " |\n")
        if failures:
            f.write("\n## Failures\n\n")
            for tc, _, leaked, returned in failures:
                f.write(f"- role={tc.role}, domain={tc.domain}, query={tc.query!r}, leaked={leaked}\n")
        else:
            f.write("\nNo leaks detected across any role/domain combination.\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
