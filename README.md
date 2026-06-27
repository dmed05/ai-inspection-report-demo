# AI Inspection Report Demo

A secure, synthetic demonstration of an AI-assisted inspection workflow.

The public application runs entirely in fixture mode: it does not accept real
customer records, upload private media, or spend API credits. The server also
contains a protected reference API that demonstrates owner-scoped records,
restricted CORS, rate limiting, retention, and redacted logging.

## What I Built

I built a full-stack Node.js demonstration of a privacy-conscious inspection
report workflow. It includes a browser interface, synthetic report generation,
a protected reference API, owner-scoped data access, input validation, rate
limits, retention cleanup, credential-safe logging, automated tests, and local
and CI publication checks.

The public experience is fixture-backed and requires no external AI service or
production data, while the protected routes show the controls an AI-ready
operational application would need around its records.

## How It Supports Operational Work

I created this project to demonstrate how inspection information can be turned
into structured, reviewable findings without using real customer records in a
public demo. The architecture helps separate:

- safe product demonstration from protected operational records;
- authenticated ownership from user-supplied record identifiers;
- temporary application data from records that should expire;
- useful diagnostics from credentials that must never reach logs; and
- AI-assisted report preparation from final human review.

This gives me a testable reference implementation for evaluating security and
privacy controls before connecting an inspection workflow to real services.

## My Role and Design Decisions

I designed and implemented the server, browser demo, protected API, in-memory
store, security middleware, synthetic fixtures, test suite, and publication
gate.

The key design decision was to make the public path deterministic and
fixture-only. That keeps the portfolio demonstration usable without exposing
customer data, requiring credentials, or spending API credits.

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
