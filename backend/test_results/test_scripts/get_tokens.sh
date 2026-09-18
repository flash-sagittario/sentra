#!/usr/bin/env bash
# Sentra - fetch fresh JWTs for all 4 test roles and export them.
#
# IMPORTANT: this script must be SOURCED, not executed, or the exports
# will only live inside a subshell and vanish immediately.
#
#   source get_tokens.sh
#
# Reads one file that must sit next to this script:
#   .env.test   -> SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY),
#                  plus TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD etc for all 4 roles.
#
# Nothing here prints the tokens to the terminal, they go straight into
# ADMIN_JWT / HR_JWT / LEGAL_JWT / EMPLOYEE_JWT in this shell session.

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Run this with 'source get_tokens.sh', not './get_tokens.sh'." >&2
    echo "Otherwise the exported variables disappear when the script exits." >&2
    return 1 2>/dev/null || exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${SCRIPT_DIR}/.env.test" ]]; then
    source "${SCRIPT_DIR}/.env.test"
else
    echo "ERROR: ${SCRIPT_DIR}/.env.test not found." >&2
    return 1 2>/dev/null || exit 1
fi

# Some setups name the key SUPABASE_ANON_KEY, others SUPABASE_PUBLISHABLE_KEY.
: "${SUPABASE_PUBLISHABLE_KEY:=${SUPABASE_ANON_KEY:-}}"

: "${SUPABASE_URL:?Set SUPABASE_URL in .env.test, e.g. https://<project-ref>.supabase.co}"
: "${SUPABASE_PUBLISHABLE_KEY:?Set SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) in .env.test}"

fetch_token() {
    local email="$1"
    local password="$2"
    curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
        -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))"
}

export ADMIN_JWT="$(fetch_token "${TEST_ADMIN_EMAIL}" "${TEST_ADMIN_PASSWORD}")"
export HR_JWT="$(fetch_token "${TEST_HR_EMAIL}" "${TEST_HR_PASSWORD}")"
export LEGAL_JWT="$(fetch_token "${TEST_LEGAL_EMAIL}" "${TEST_LEGAL_PASSWORD}")"
export EMPLOYEE_JWT="$(fetch_token "${TEST_EMPLOYEE_EMAIL}" "${TEST_EMPLOYEE_PASSWORD}")"

for name in ADMIN_JWT HR_JWT LEGAL_JWT EMPLOYEE_JWT; do
    if [[ -z "${!name}" ]]; then
        echo "WARNING: ${name} is empty, check credentials or Supabase response." >&2
    else
        echo "${name} set (expires in 1 hour)."
    fi
done
