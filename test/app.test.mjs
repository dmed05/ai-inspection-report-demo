import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createApp } from "../src/app.mjs";

async function withServer(env, fn) {
  const server = http.createServer(createApp(env));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("public API returns synthetic fixtures", async () => {
  await withServer({}, async (base) => {
    const response = await fetch(`${base}/api/demo/reports`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.reports[0].businessName, "Northstar Demo Cafe");
  });
});

test("protected API rejects unauthenticated requests", async () => {
  await withServer(
    { DEMO_API_TOKENS: "alice:alice-local-token" },
    async (base) => {
      const response = await fetch(`${base}/api/reports`);
      assert.equal(response.status, 401);
    }
  );
});

test("protected API isolates owners", async () => {
  await withServer(
    {
      DEMO_API_TOKENS:
        "alice:alice-local-token,bob:bob-local-token"
    },
    async (base) => {
      const created = await fetch(`${base}/api/reports`, {
        method: "POST",
        headers: {
          authorization: "Bearer alice-local-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          businessName: "Synthetic Site",
          summary: "Synthetic summary"
        })
      });
      const { report } = await created.json();

      const crossOwner = await fetch(`${base}/api/reports/${report.id}`, {
        headers: { authorization: "Bearer bob-local-token" }
      });
      assert.equal(crossOwner.status, 404);
    }
  );
});

test("disallowed origins are rejected", async () => {
  await withServer(
    { ALLOWED_ORIGINS: "https://portfolio.example" },
    async (base) => {
      const response = await fetch(`${base}/api/demo/reports`, {
        headers: { origin: "https://attacker.example" }
      });
      assert.equal(response.status, 403);
    }
  );
});
