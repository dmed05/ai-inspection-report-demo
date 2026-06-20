import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticate,
  createRateLimiter,
  originAllowed,
  parseTokenMap,
  redact
} from "../src/security.mjs";
import { createReportStore } from "../src/store.mjs";

test("authentication maps tokens to owners", () => {
  const tokens = parseTokenMap("alice:alice-local-token,bob:bob-local-token");
  assert.equal(authenticate("Bearer alice-local-token", tokens), "alice");
  assert.equal(authenticate("Bearer wrong-token", tokens), null);
  assert.equal(authenticate(undefined, tokens), null);
});

test("origins require an explicit allowlist match", () => {
  const allowed = new Set(["https://portfolio.example"]);
  assert.equal(originAllowed("https://portfolio.example", allowed), true);
  assert.equal(originAllowed("https://attacker.example", allowed), false);
  assert.equal(originAllowed(undefined, allowed), true);
});

test("rate limiter rejects requests beyond the configured window", () => {
  let timestamp = 100;
  const limiter = createRateLimiter({
    limit: 2,
    windowMs: 1_000,
    now: () => timestamp
  });
  assert.equal(limiter.allow("client"), true);
  assert.equal(limiter.allow("client"), true);
  assert.equal(limiter.allow("client"), false);
  timestamp = 1_101;
  assert.equal(limiter.allow("client"), true);
});

test("logs redact credential-shaped values", () => {
  assert.equal(
    redact("Authorization: Bearer abc.def-123"),
    "Authorization: Bearer [REDACTED]"
  );
  const fake = `sk-${"a".repeat(20)}`;
  assert.equal(redact(`key=${fake}`), "key=sk-[REDACTED]");
});

test("records are owner-scoped and expire", () => {
  let timestamp = 1_000;
  const store = createReportStore({
    retentionMs: 500,
    now: () => timestamp
  });
  const report = store.create("alice", {
    businessName: "Synthetic Site",
    summary: "Fixture"
  });
  assert.equal(store.get("bob", report.id), null);
  assert.equal(store.list("alice").length, 1);
  timestamp = 1_501;
  assert.equal(store.get("alice", report.id), null);
  assert.equal(store.size(), 0);
});
