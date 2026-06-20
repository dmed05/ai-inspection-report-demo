import crypto from "node:crypto";

export function parseTokenMap(value = "") {
  const tokens = new Map();
  for (const item of value.split(",")) {
    const separator = item.indexOf(":");
    if (separator < 1) continue;
    const owner = item.slice(0, separator).trim();
    const token = item.slice(separator + 1).trim();
    if (owner && token.length >= 12) tokens.set(token, owner);
  }
  return tokens;
}

export function authenticate(header, tokenMap) {
  if (!header?.startsWith("Bearer ")) return null;
  const candidate = header.slice(7).trim();
  for (const [token, owner] of tokenMap.entries()) {
    const left = Buffer.from(candidate);
    const right = Buffer.from(token);
    if (left.length === right.length && crypto.timingSafeEqual(left, right)) {
      return owner;
    }
  }
  return null;
}

export function originAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  return allowedOrigins.has(origin);
}

export function redact(value) {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_[REDACTED]");
}

export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const buckets = new Map();

  return {
    allow(key) {
      const timestamp = now();
      const current = buckets.get(key);
      if (!current || timestamp - current.startedAt >= windowMs) {
        buckets.set(key, { startedAt: timestamp, count: 1 });
        return true;
      }
      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    }
  };
}
