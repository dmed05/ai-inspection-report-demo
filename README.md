# AI Inspection Report Demo

A secure, synthetic demonstration of an AI-assisted inspection workflow.

The public application runs entirely in fixture mode: it does not accept real
customer records, upload private media, or spend API credits. The server also
contains a protected reference API that demonstrates owner-scoped records,
restricted CORS, rate limiting, retention, and redacted logging.

## Architecture

```text
browser
  ├─ GET /api/demo/reports ──────────────> synthetic fixtures
  └─ protected /api/reports
       ├─ allowed-origin check
       ├─ bearer token → owner mapping
       ├─ per-client rate limit
       ├─ input validation
       └─ owner-scoped in-memory store
```

## Run locally

Requires Node.js 20 or newer.

```bash
npm test
npm start
```

Open <http://localhost:5050>.

The default configuration exposes only fixture data. To exercise protected
routes locally:

```bash
DEMO_API_TOKENS='reviewer:local-development-token' \
ALLOWED_ORIGINS='http://localhost:5050' \
npm start
```

Example:

```bash
export DEMO_TOKEN='the token configured in DEMO_API_TOKENS'
curl -H "Authorization: Bearer ${DEMO_TOKEN}" \
  http://localhost:5050/api/reports
```

## Security decisions

- No OpenAI or cloud credentials are required for the public demo.
- No production names, addresses, photos, prompts, or reports are included.
- Public generation is deterministic and fixture-backed.
- Protected records are selected from the authenticated token, not a user ID
  supplied by the client.
- CORS is denied unless the request origin is explicitly allowed.
- Logs redact bearer tokens and common credential formats.
- Records expire according to `RETENTION_HOURS` (24 by default).
- The local and CI publication gates reject secrets and sensitive filenames.

This repository is a reference implementation, not a complete authentication
system. A production deployment should replace static tokens and in-memory
storage with an identity provider and encrypted database.

## Test coverage

Tests cover:

- fixture-only public access;
- missing and invalid authentication;
- cross-owner record isolation;
- restricted CORS;
- request rate limits;
- retention cleanup;
- credential redaction.

## License

MIT
