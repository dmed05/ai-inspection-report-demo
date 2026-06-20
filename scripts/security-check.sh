#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

blocked_paths='(^|/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|credentials\.json$|.*service-account.*\.json$|uploads?/|reports?/|customer-data/)'
if git ls-files | rg -i "$blocked_paths" | rg -v '^\.env\.example$'; then
  echo "Blocked sensitive filename or directory is tracked." >&2
  exit 1
fi

secret_patterns='AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}'
if git grep -n -I -E "$secret_patterns" -- . \
  ':(exclude)scripts/security-check.sh' \
  ':(exclude)test/security.test.mjs' \
  ':(exclude).github/workflows/security.yml'; then
  echo "Potential credential found in tracked content." >&2
  exit 1
fi

echo "Security publication checks passed."
