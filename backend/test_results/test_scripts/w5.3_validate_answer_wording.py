"""
Sentra W5.3 (Issue #28): FR-6, uniform response wording.

W4.3 (validate_no_content_vs_access_denied.py) already proves that a
no_content query and an access_denied query return the same HTTP status,
the same response JSON keys, and no leaked chunks. That is response
SHAPE parity, and it already passes.

What W4.3 does not check is response CONTENT: whether the generated
answer text itself ever gives away which category a query fell into,
for example by saying "denied" or "restricted" for an access_denied
case but not for a no_content case. FR-6 requires the two to be
indistinguishable, so this script adds that one missing check on top
of the same case list, instead of duplicating it.

Uses the exact same cases as W4.3 (imported from
validate_no_content_vs_access_denied.build_cases), so the two scripts
cannot drift onto different query sets over time.

Run from backend/test_results/test_scripts:
    source get_tokens.sh
    python validate_answer_wording.py

Outputs (in ../csv_files/):
    w5.3_test_results_<timestamp>.csv
    w5.3_summary_<timestamp>.md
"""

import json
import sys

from sentra_test_common import load_tokens, post_query, EXPECTED_MODEL, timestamp, write_csv, write_text
from validate_no_content_vs_access_denied import build_cases

# Wording that would betray a case's category if it appeared. Checked
# against every answer, no_content included, since neither category
# should ever produce it.
BANNED_WORDS = [
    "denied", "forbidden", "restricted", "not authorized", "unauthorized",
    "no permission", "access denied", "not allowed to", "do not have access",
    "don't have access", "you cannot view", "you are not permitted",
]


def find_banned_wording(answer_text):
    lowered = (answer_text or "").lower()
    return [w for w in BANNED_WORDS if w in lowered]


def main():
    tokens = load_tokens()
    cases = build_cases()
    results, rows = [], []

    for i, tc in enumerate(cases, start=1):
        status, data = post_query(tokens[tc.role], tc.query)
        answer = data.get("answer", "") if isinstance(data, dict) else ""
        banned = find_banned_wording(answer)
        passed = status == 200 and not banned
        results.append({"tc": tc, "passed": passed, "banned": banned, "answer": answer, "status": status})

        label = "PASS" if passed else "FAIL"
        print(f"[{label}] {tc.category:<13} role={tc.role:<8} domain={tc.domain:<6} "
              f"status={status} banned={banned} answer={answer[:70]!r}")
        rows.append({
            "case_id": f"W5.3-{i:02d}",
            "category": tc.category,
            "role": tc.role,
            "domain": tc.domain,
            "query": tc.query,
            "http_status": status,
            "model": data.get("model", "") if isinstance(data, dict) else "",
            "result": label,
            "banned_words_found": ";".join(banned),
            "answer": answer,
            "raw_response": json.dumps(data),
        })

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])

    # Distinct answers seen per category. This does not require the wording
    # to be identical across categories, only that neither category's
    # wording gives its category away (the banned-word check above), plus
    # it is useful evidence to read by eye in the summary.
    nc_answers = sorted({r["answer"] for r in results if r["tc"].category == "no_content"})
    ad_answers = sorted({r["answer"] for r in results if r["tc"].category == "access_denied"})
    shared = set(nc_answers) & set(ad_answers)

    print(f"\n{passed_count}/{total} passed.")
    print(f"Distinct no_content answers: {len(nc_answers)}")
    print(f"Distinct access_denied answers: {len(ad_answers)}")
    print(f"Answers shared by both categories: {len(shared)}")

    failures = [r for r in results if not r["passed"]]
    ts = timestamp()
    csv_path = write_csv(f"w5.3_test_results_{ts}.csv", rows)

    md = [
        "# W5.3 - Answer wording never reveals restricted vs empty (Model C)\n",
        f"Run: {ts}, model: {EXPECTED_MODEL}\n",
        f"**{passed_count}/{total} cases passed.**\n",
        "Cases are the same ones W4.3 uses (imported from "
        "validate_no_content_vs_access_denied.build_cases), so this checks "
        "answer wording on top of W4.3's already-passing shape check, not a "
        "separate query set.\n",
        "## Banned-wording check\n",
    ]
    if failures:
        for r in failures:
            t = r["tc"]
            md.append(f"- category={t.category}, role={t.role}, domain={t.domain}, "
                      f"banned_words={r['banned']}, answer={r['answer']!r}")
    else:
        md.append("No banned wording found in any answer, in either category.")
    md += [
        "\n## Answer text, by category\n",
        f"- Distinct no_content answers ({len(nc_answers)}):",
    ]
    md += [f"  - {a!r}" for a in nc_answers] or ["  - (none)"]
    md += [f"- Distinct access_denied answers ({len(ad_answers)}):"]
    md += [f"  - {a!r}" for a in ad_answers] or ["  - (none)"]
    md += [f"- Answers used by both categories: {len(shared)} of "
           f"{len(set(nc_answers) | set(ad_answers))} distinct answers total"]
    md_path = write_text(f"w5.3_summary_{ts}.md", "\n".join(md) + "\n")

    print(f"\nWrote {csv_path}")
    print(f"Wrote {md_path}")
    sys.exit(0 if not failures else 1)


if __name__ == "__main__":
    main()
