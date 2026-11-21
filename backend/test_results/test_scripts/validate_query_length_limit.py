"""
Sentra: query length limit on /query (Model C).

The backend refuses a question longer than MAX_QUERY_CHARS (2000 characters,
counted after trimming) with HTTP 422 and a readable message, instead of letting
gemini-embedding-001 silently truncate it. An empty question is a 400.

The limit is typed below on purpose, NOT imported from config.py, so changing
the constant in code breaks this test instead of silently passing.

Per case, all of these must hold:
  1. HTTP status equals the expected status.
  2. Rejected cases (422): the detail says "too long" and names the limit, and the
     response has no "answer" and no "chunks" (nothing was retrieved or generated).
  3. Accepted cases (200): the answer is a non-empty string.

Cases:
  - exactly 2000 characters           -> 200 (the boundary is allowed)
  - 2000 characters + 100 spaces      -> 200 (spaces are trimmed, not counted)
  - 2001 characters, every role       -> 422
  - 5000 characters                   -> 422
  - empty / spaces only               -> 400

Run from backend/test_results/test_scripts (server running):
    source get_tokens.sh
    python validate_query_length_limit.py

Outputs (in ../csv_files/):
    query_limit_test_results_<timestamp>.csv
    query_limit_summary_<timestamp>.md
"""

import json
import sys
from dataclasses import dataclass

from sentra_test_common import (
    EXPECTED_MODEL, load_tokens, post_query, timestamp, write_csv, write_text,
)

LIMIT = 2000
BASE = "What does the company policy say about annual leave and how do I request it? "


def question(n: int) -> str:
    """A question of exactly n characters that starts and ends with a non-space."""
    return (BASE * (n // len(BASE) + 1))[: n - 1] + "?"


@dataclass
class Case:
    name: str
    role: str
    query: str
    expected_status: int


def build_cases():
    return [
        Case("exactly_2000", "employee", question(LIMIT), 200),
        Case("2000_plus_spaces", "employee", question(LIMIT) + " " * 100, 200),
        Case("2001_employee", "employee", question(LIMIT + 1), 422),
        Case("2001_hr", "hr", question(LIMIT + 1), 422),
        Case("2001_legal", "legal", question(LIMIT + 1), 422),
        Case("2001_admin", "admin", question(LIMIT + 1), 422),
        Case("5000_employee", "employee", question(5000), 422),
        Case("empty_employee", "employee", "", 400),
        Case("spaces_only_employee", "employee", "   ", 400),
    ]


def main():
    tokens = load_tokens()
    results, rows = [], []

    for i, tc in enumerate(build_cases(), start=1):
        status, data = post_query(tokens[tc.role], tc.query)
        data = data if isinstance(data, dict) else {}
        detail = data.get("detail", "")
        detail = detail if isinstance(detail, str) else json.dumps(detail)

        problems = []
        if status != tc.expected_status:
            problems.append(f"status_{status}_expected_{tc.expected_status}")
        if tc.expected_status == 422:
            if "too long" not in detail or str(LIMIT) not in detail:
                problems.append("detail_message_wrong")
            if "answer" in data or "chunks" in data:
                problems.append("answer_or_chunks_returned")
        if tc.expected_status == 200:
            if not isinstance(data.get("answer"), str) or not data["answer"].strip():
                problems.append("answer_empty")

        passed = not problems
        results.append({"tc": tc, "passed": passed, "problems": problems,
                        "status": status, "detail": detail})

        label = "PASS" if passed else "FAIL"
        print(f"[{label}] {tc.name:<22} role={tc.role:<8} chars={len(tc.query):<5} "
              f"status={status} expected={tc.expected_status} problems={problems}")
        rows.append({
            "case_id": f"LIMIT-{i:02d}",
            "name": tc.name,
            "role": tc.role,
            "query_chars": len(tc.query),
            "expected_status": tc.expected_status,
            "http_status": status,
            "result": label,
            "problems": ";".join(problems),
            "detail": detail,
            "raw_response": json.dumps(data),
        })

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    failures = [r for r in results if not r["passed"]]
    print(f"\n{passed_count}/{total} passed.")

    ts = timestamp()
    csv_path = write_csv(f"query_limit_test_results_{ts}.csv", rows)

    md = [
        "# Query length limit on /query (Model C)\n",
        f"Run: {ts}, model: {EXPECTED_MODEL}\n",
        f"**{passed_count}/{total} cases passed.**\n",
        f"Limit under test: {LIMIT} characters, counted after trimming.\n",
        "## Checks per case\n",
        "- HTTP status equals the expected status",
        "- 422 cases: detail says too long and names the limit, no answer, no chunks",
        "- 200 cases: non-empty answer\n",
        "## Failures\n",
    ]
    if failures:
        for r in failures:
            t = r["tc"]
            md.append(f"- {t.name} (role={t.role}): problems={r['problems']}, "
                      f"status={r['status']}, detail={r['detail']!r}")
    else:
        md.append("None. The limit is enforced at 2000 characters for every role.")
    md += [
        "\n## Scope note\n",
        "The 422 cases are rejected before the embedding call, so they use no Gemini quota. "
        "The two 200 cases run the full pipeline once each.",
    ]
    md_path = write_text(f"query_limit_summary_{ts}.md", "\n".join(md) + "\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")
    sys.exit(0 if not failures else 1)


if __name__ == "__main__":
    main()
