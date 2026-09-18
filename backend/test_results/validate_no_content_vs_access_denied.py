"""
Sentra W4.3 - Confirm RLS handles no-content vs access-denied
Issue: #23

Extends W4.2's harness (Section 5A leak matrix, issue #22). W4.2 already
confirms restricted chunks never leak into a response. W4.3 checks a
narrower thing: from the client's point of view, can you tell the
difference between "nothing relevant exists anywhere" and "something
relevant exists but you are not allowed to see it"?

Under Model C, RLS filters candidate rows before the nearest-neighbor
search runs. That means there is no separate "denied" code path: a
cross-domain query just gets answered from whatever rows the caller's
role IS allowed to see (own role plus public), same as a genuinely
irrelevant query would. Two response categories are tested here:

  no_content     - queries about topics that do not exist anywhere in
                   the 30-doc corpus, for any role. Nothing relevant
                   exists, full stop.
  access_denied  - queries that closely match another role's exclusive
                   domain, asked by a role that cannot see that domain.
                   Relevant content exists, but is not visible to caller.

Note: because retrieval here is plain nearest-neighbor (no similarity
floor confirmed in the endpoint), neither category is guaranteed to come
back with an empty chunks list, low-similarity chunks from the caller's
own allowed set can still surface. That is fine. What actually matters
for this task is verified below:

  1. No restricted-role chunk ever appears in either category (leak
     check, same rule as W4.2).
  2. The two categories return an identical JSON key shape, so nothing
     in the response format itself signals "this was blocked" versus
     "nothing matched".
  3. Same HTTP status code (200) for both categories, no 403/404 that
     would leak the existence of restricted content.

Usage:
    export ADMIN_JWT=... HR_JWT=... LEGAL_JWT=... EMPLOYEE_JWT=...
    export SENTRA_API_URL=http://localhost:8000   # optional, defaults to this
    python validate_no_content_vs_access_denied.py

Output:
    Prints PASS/FAIL per case to the terminal.
    Also writes two files next to the script:
      - w43_test_results_<timestamp>.csv   (full per-case log, same shape
        as the W4.2 CSV, plus a category column and returned JSON keys)
      - w43_summary_<timestamp>.md         (ready to paste into the
        GitHub issue comment when closing #23)
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

# Topics that do not exist anywhere in the 30-doc corpus, for any role.
# Used to approximate the "no_content" case.
NO_CONTENT_QUERIES = [
    "What is the company's office fish tank maintenance schedule?",
    "Does Northlane sponsor an employee fantasy football league?",
    "What is the policy on bringing a skydiving instructor to the office?",
]

# Queries aimed squarely at one role's exclusive domain. Used against
# every role that does NOT own that domain, to approximate the
# "access_denied" case (relevant content exists, caller can't see it).
DOMAIN_QUERIES = {
    "admin": "What is the process for approving a new vendor contract?",
    "hr": "What is the company's parental leave policy?",
    "legal": "What are the confidentiality obligations in our standard NDA template?",
}


@dataclass
class TestCase:
    category: str   # "no_content" or "access_denied"
    role: str
    domain: str      # the domain the query targets ("none" for no_content)
    query: str


def build_cases():
    cases = []

    for role in ROLES:
        for query in NO_CONTENT_QUERIES:
            cases.append(TestCase("no_content", role, "none", query))

    for role in ROLES:
        for domain, query in DOMAIN_QUERIES.items():
            if domain == role:
                continue
            cases.append(TestCase("access_denied", role, domain, query))

    return cases


def run_query(role: str, query: str):
    headers = {"Authorization": f"Bearer {TEST_TOKENS[role]}"}
    resp = requests.post(QUERY_ENDPOINT, json={"query": query}, headers=headers, timeout=30)
    return resp


def chunk_roles(response_json):
    return [c["role"] for c in response_json.get("chunks", [])]


def evaluate_leak(tc: TestCase, returned_roles):
    allowed = {tc.role, "public"}
    leaked = [r for r in returned_roles if r not in allowed]
    return len(leaked) == 0, leaked


def main():
    cases = build_cases()
    results = []
    csv_rows = []

    for i, tc in enumerate(cases, start=1):
        resp = run_query(tc.role, tc.query)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        returned_roles = chunk_roles(data)
        no_leak, leaked = evaluate_leak(tc, returned_roles)
        response_keys = sorted(data.keys())

        passed = no_leak and resp.status_code == 200
        results.append((tc, passed, leaked, returned_roles, response_keys, resp.status_code, len(returned_roles)))

        status = "PASS" if passed else "FAIL"
        print(f"[{status}] category={tc.category:<14} role={tc.role:<9} domain={tc.domain:<7} "
              f"chunks={len(returned_roles)} keys={response_keys} query={tc.query!r}")
        if leaked:
            print(f"         leaked roles: {leaked}")

        csv_rows.append({
            "case_id": f"W4.3-{i:02d}",
            "category": tc.category,
            "role": tc.role,
            "domain": tc.domain,
            "query": tc.query,
            "http_status": resp.status_code,
            "result": status,
            "chunk_count": len(returned_roles),
            "leaked_roles": ";".join(leaked) if leaked else "",
            "returned_roles": ";".join(returned_roles),
            "response_keys": ";".join(response_keys),
            "raw_response": json.dumps(data),
        })

    total = len(results)
    passed_count = sum(1 for r in results if r[1])
    print(f"\n{passed_count}/{total} passed.")

    # --- shape-parity check across the two categories ---
    no_content_keysets = {tuple(r[4]) for r in results if r[0].category == "no_content"}
    access_denied_keysets = {tuple(r[4]) for r in results if r[0].category == "access_denied"}
    same_shape = no_content_keysets == access_denied_keysets and len(no_content_keysets) == 1

    print("\nResponse shape parity (no_content vs access_denied):")
    print(f"  no_content keys seen:    {no_content_keysets}")
    print(f"  access_denied keys seen: {access_denied_keysets}")
    print(f"  IDENTICAL SHAPE: {'YES' if same_shape else 'NO, response format leaks category'}")

    failures = [r for r in results if not r[1]]
    if failures:
        print("\nFailure detail:")
        for tc, _, leaked, returned, keys, http_status, count in failures:
            print(f"  category={tc.category} role={tc.role} domain={tc.domain} "
                  f"query={tc.query!r} leaked={leaked} http_status={http_status}")

    # --- write output files ---
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    csv_path = f"w43_test_results_{ts}.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
        writer.writeheader()
        writer.writerows(csv_rows)

    md_path = f"w43_summary_{ts}.md"
    with open(md_path, "w") as f:
        f.write("# W4.3 - Confirm RLS handles no-content vs access-denied\n\n")
        f.write(f"Run: {ts}\n\n")
        f.write(f"**{passed_count}/{total} cases passed.**\n\n")
        f.write("## Leak check\n\n")
        f.write("No restricted-role chunk should ever appear, in either category.\n\n")
        if failures:
            f.write("### Failures\n\n")
            for tc, _, leaked, returned, keys, http_status, count in failures:
                f.write(f"- category={tc.category}, role={tc.role}, domain={tc.domain}, "
                        f"query={tc.query!r}, leaked={leaked}, http_status={http_status}\n")
        else:
            f.write("No leaks detected across any case.\n")
        f.write("\n## Response shape parity\n\n")
        f.write(f"- no_content response keys: `{sorted(no_content_keysets)}`\n")
        f.write(f"- access_denied response keys: `{sorted(access_denied_keysets)}`\n")
        f.write(f"- **Identical shape: {'YES' if same_shape else 'NO'}**\n")
        if not same_shape:
            f.write("\nThe response format currently differs between the two categories, "
                    "which means a client could distinguish a denied query from an empty "
                    "one. This should be fixed before Model C is called leak-proof.\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
