"""
W4.1 - Run test matrix (4 roles x 4 queries)
Sentra / SecureRAG (Model C, RLS default)

Logs into each of the 4 test accounts via Supabase Auth, sends the same
4 queries to the /query endpoint as each role, and checks whether the
returned chunks respect role-based access.

Before running:
  pip install requests python-dotenv

Add these to your backend/.env (or a separate .env.test):
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_ANON_KEY=your-anon-key
  QUERY_URL=http://localhost:8000/query
  TEST_ADMIN_EMAIL=...
  TEST_ADMIN_PASSWORD=...
  TEST_HR_EMAIL=...
  TEST_HR_PASSWORD=...
  TEST_LEGAL_EMAIL=...
  TEST_LEGAL_PASSWORD=...
  TEST_EMPLOYEE_EMAIL=...
  TEST_EMPLOYEE_PASSWORD=...

Assumption to check: the /query response is read as either
response_json["chunks"] or response_json["sources"], with each chunk
carrying a "role" or "department" field. If your actual response shape
differs, adjust check_leak() to match (run one manual query and print
response.json() to see the real keys).
"""

import os
import csv
import json
from datetime import datetime
import requests
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(SCRIPT_DIR, ".env.test"), override=True)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
QUERY_URL = os.environ.get("QUERY_URL", "http://localhost:8000/query")
ACCESS_MODEL = os.environ.get("TEST_ACCESS_MODEL", "C")

TEST_ACCOUNTS = {
    "admin": {"email": os.environ["TEST_ADMIN_EMAIL"], "password": os.environ["TEST_ADMIN_PASSWORD"]},
    "hr": {"email": os.environ["TEST_HR_EMAIL"], "password": os.environ["TEST_HR_PASSWORD"]},
    "legal": {"email": os.environ["TEST_LEGAL_EMAIL"], "password": os.environ["TEST_LEGAL_PASSWORD"]},
    "employee": {"email": os.environ["TEST_EMPLOYEE_EMAIL"], "password": os.environ["TEST_EMPLOYEE_PASSWORD"]},
}

QUERIES = [
    ("Q1_admin_domain", "What is the process for approving a new vendor contract?"),
    ("Q2_hr_domain", "What is the company's parental leave policy?"),
    ("Q3_legal_domain", "What are the confidentiality obligations in our standard NDA template?"),
    ("Q4_public_domain", "How do I request time off through the HR portal?"),
]


def get_jwt(email, password):
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def run_query(jwt, query_text):
    resp = requests.post(
        QUERY_URL,
        headers={"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"},
        json={"query": query_text, "model": ACCESS_MODEL},
        timeout=60,
    )
    try:
        body = resp.json()
    except ValueError:
        body = resp.text
    return resp.status_code, body


def check_leak(role, response_json):
    """Flags any retrieved chunk whose role/department is outside {role, public}."""
    if not isinstance(response_json, dict):
        return []
    chunks = response_json.get("chunks") or response_json.get("sources") or []
    leaked = []
    for c in chunks:
        chunk_role = c.get("role") or c.get("department")
        if chunk_role and chunk_role not in (role, "public"):
            leaked.append(chunk_role)
    return leaked


def main():
    print(f"Logging in {len(TEST_ACCOUNTS)} test accounts...")
    tokens = {role: get_jwt(**creds) for role, creds in TEST_ACCOUNTS.items()}
    print("Logged in:", list(tokens.keys()))

    results = []
    for role, jwt in tokens.items():
        for qid, qtext in QUERIES:
            status, body = run_query(jwt, qtext)
            leaked = check_leak(role, body)
            if leaked:
                result = "FAIL - LEAK"
            elif status >= 400 and status != 403:
                result = f"FAIL - HTTP {status}"
            else:
                result = "PASS"
            results.append(
                {
                    "role": role,
                    "query_id": qid,
                    "query": qtext,
                    "http_status": status,
                    "leaked_roles": ";".join(leaked) if leaked else "",
                    "result": result,
                    "raw_response": json.dumps(body)[:500],
                }
            )
            print(f"[{role:>9}] {qid}: {result} (status={status}, leaked={leaked})")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join(SCRIPT_DIR, f"w41_test_matrix_results_{ts}.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        writer.writeheader()
        writer.writerows(results)

    print(f"\nResults written to {out_path}")
    passed = len(results) - len([r for r in results if r["result"] != "PASS"])
    print(f"{passed}/{len(results)} passed.")
    fails = [r for r in results if r["result"] != "PASS"]
    if fails:
        print("Failures:")
        for r in fails:
            print(f"  {r['role']} / {r['query_id']}: {r['result']}")


if __name__ == "__main__":
    main()
