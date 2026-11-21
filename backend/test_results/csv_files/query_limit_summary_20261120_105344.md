# Query length limit on /query (Model C)

Run: 20261120_105344, model: C

**9/9 cases passed.**

Limit under test: 2000 characters, counted after trimming.

## Checks per case

- HTTP status equals the expected status
- 422 cases: detail says too long and names the limit, no answer, no chunks
- 200 cases: non-empty answer

## Failures

None. The limit is enforced at 2000 characters for every role.

## Scope note

The 422 cases are rejected before the embedding call, so they use no Gemini quota. The two 200 cases run the full pipeline once each.
