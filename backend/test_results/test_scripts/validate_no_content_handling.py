"""
Sentra W5.4 (Issue #29): FR-15, No Content Found handling, Model C.

FR-15: the system returns the same "no relevant documents" response for an
authorized query with no matching content and for a query on restricted
content, so it never confirms restricted content exists.

W4.3 checks response SHAPE and chunk leaks. W5.3 checks that no banned
wording appears. Neither checks that the answer is the exact refusal
sentence. This script does, for every case W4.3 uses (imported from
validate_no_content_vs_access_denied.build_cases, so the case lists cannot
drift apart).

Per case, all of these must hold:
  1. HTTP status is 200.
  2. The answer equals EXPECTED_ANSWER exactly (typed below on purpose, NOT
     imported from prompts.py, so changing the constant in code breaks this
     test instead of silently passing).
  3. The answer has no "Sources:" line.
  4. No chunk outside the role's allowed tags.
Across cases: both categories return the same JSON keys.

Run from backend/test_results/test_scripts (server running):
    source get_tokens.sh
    python validate_no_content_handling.py

Outputs (in ../csv_files/):
    w5.4_test_results_<timestamp>.csv
    w5.4_summary_<timestamp>.md
"""

import json
import sys

from sentra_test_common import (
    EXPECTED_MODEL, load_tokens, post_query, chunk_tags, find_leaks,
    timestamp, write_csv, write_text,
)
from validate_no_content_vs_access_denied import build_cases

EXPECTED_ANSWER = "I could not find this in the documents available to your role."


def main():
    tokens = load_tokens()
    cases = build_cases()
    results, rows = [], []

    for i, tc in enumerate(cases, start=1):
        status, data = post_query(tokens[tc.role], tc.query)
        data = data if isinstance(data, dict) else {}
        answer = data.get("answer", "")
        tags = chunk_tags(data)
        leaked = find_leaks(tc.role, tags)
        keys = sorted(data.keys())

        problems = []
        if status != 200:
            problems.append(f"http_{status}")
        if answer != EXPECTED_ANSWER:
            problems.append("answer_not_exact")
        if "Sources:" in answer:
            problems.append("sources_line_present")
        if leaked:
            problems.append("chunk_leak")

        passed = not problems
        results.append({"tc": tc, "passed": passed, "problems": problems,
                        "answer": answer, "keys": keys})

        label = "PASS" if passed else "FAIL"
        print(f"[{label}] {tc.category:<13} role={tc.role:<8} domain={tc.domain:<6} "
              f"status={status} problems={problems} answer={answer[:60]!r}")
        rows.append({
            "case_id": f"W5.4-{i:02d}",
            "category": tc.category,
            "role": tc.role,
            "domain": tc.domain,
            "query": tc.query,
            "http_status": status,
            "model": data.get("model", ""),
            "result": label,
            "problems": ";".join(problems),
            "answer": answer,
            "response_keys": ";".join(keys),
            "raw_response": json.dumps(data),
        })

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    nc_keys = {tuple(r["keys"]) for r in results if r["tc"].category == "no_content"}
    ad_keys = {tuple(r["keys"]) for r in results if r["tc"].category == "access_denied"}
    same_shape = nc_keys == ad_keys and len(nc_keys) == 1

    print(f"\n{passed_count}/{total} passed.")
    print(f"Identical response keys across categories: {'YES' if same_shape else 'NO'}")

    failures = [r for r in results if not r["passed"]]
    ts = timestamp()
    csv_path = write_csv(f"w5.4_test_results_{ts}.csv", rows)

    md = [
        "# W5.4 - No Content Found handling, exact refusal answer (Model C)\n",
        f"Run: {ts}, model: {EXPECTED_MODEL}\n",
        f"**{passed_count}/{total} cases passed.**\n",
        f"Expected answer for every case: `{EXPECTED_ANSWER}`\n",
        "Cases are the same ones W4.3 and W5.3 use (imported from "
        "validate_no_content_vs_access_denied.build_cases).\n",
        "## Checks per case\n",
        "- HTTP 200",
        "- answer equals the expected sentence exactly",
        "- no Sources line",
        "- no chunk outside the role's allowed tags\n",
        "## Failures\n",
    ]
    if failures:
        for r in failures:
            t = r["tc"]
            md.append(f"- category={t.category}, role={t.role}, domain={t.domain}, "
                      f"problems={r['problems']}, answer={r['answer']!r}")
    else:
        md.append("None. Every answer in both categories was the exact refusal sentence.")
    md += [
        "\n## Response shape parity\n",
        f"- no_content keys: `{sorted(nc_keys)}`",
        f"- access_denied keys: `{sorted(ad_keys)}`",
        f"- **Identical shape: {'YES' if same_shape else 'NO'}**",
        "\n## Scope note\n",
        "Under Model C the database always returns the closest chunks the role may "
        "see, so the code-only path (no chunks, Gemini not called) is not reached "
        "here. It is reached under Model B when the role filter removes every chunk.",
    ]
    md_path = write_text(f"w5.4_summary_{ts}.md", "\n".join(md) + "\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")
    sys.exit(0 if not failures and same_shape else 1)


if __name__ == "__main__":
    main()
