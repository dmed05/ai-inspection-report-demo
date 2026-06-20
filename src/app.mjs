import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fixtureReports, generateFixtureReport } from "./fixtures.mjs";
import {
  authenticate,
  createRateLimiter,
  originAllowed,
  parseTokenMap,
  redact
} from "./security.mjs";
import { createReportStore } from "./store.mjs";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'",
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

async function readJson(req, maxBytes = 32_768) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createApp(env = process.env) {
  const allowedOrigins = new Set(
    (env.ALLOWED_ORIGINS || "http://localhost:5050")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const tokenMap = parseTokenMap(env.DEMO_API_TOKENS);
  const retentionHours = Math.max(1, Number(env.RETENTION_HOURS || 24));
  const store = createReportStore({
    retentionMs: retentionHours * 60 * 60 * 1000
  });
  const limiter = createRateLimiter({
    limit: Math.max(1, Number(env.RATE_LIMIT_PER_MINUTE || 30)),
    windowMs: 60_000
  });

  return async function app(req, res) {
    const requestUrl = new URL(req.url, "http://localhost");
    const origin = req.headers.origin;
    const client = req.socket.remoteAddress || "unknown";

    if (!originAllowed(origin, allowedOrigins)) {
      return sendJson(res, 403, { error: "origin_not_allowed" });
    }

    const corsHeaders = origin
      ? { "access-control-allow-origin": origin, vary: "Origin" }
      : {};

    if (!limiter.allow(client)) {
      return sendJson(res, 429, { error: "rate_limit_exceeded" }, corsHeaders);
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...corsHeaders,
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-max-age": "600"
      });
      return res.end();
    }

    try {
      if (req.method === "GET" && requestUrl.pathname === "/") {
        const html = await readFile(path.join(publicDir, "index.html"));
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy":
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer"
        });
        return res.end(html);
      }

      if (req.method === "GET" && requestUrl.pathname === "/app.js") {
        const script = await readFile(path.join(publicDir, "app.js"));
        res.writeHead(200, {
          "content-type": "text/javascript; charset=utf-8",
          "x-content-type-options": "nosniff"
        });
        return res.end(script);
      }

      if (req.method === "GET" && requestUrl.pathname === "/health") {
        return sendJson(res, 200, {
          ok: true,
          mode: "synthetic-fixtures",
          protectedApiConfigured: tokenMap.size > 0
        });
      }

      if (
        req.method === "GET" &&
        requestUrl.pathname === "/api/demo/reports"
      ) {
        return sendJson(res, 200, { reports: fixtureReports }, corsHeaders);
      }

      if (
        req.method === "POST" &&
        requestUrl.pathname === "/api/demo/generate"
      ) {
        const input = await readJson(req);
        return sendJson(
          res,
          200,
          { report: generateFixtureReport(input) },
          corsHeaders
        );
      }

      if (requestUrl.pathname.startsWith("/api/reports")) {
        const owner = authenticate(req.headers.authorization, tokenMap);
        if (!owner) {
          return sendJson(res, 401, { error: "unauthorized" }, corsHeaders);
        }

        if (req.method === "GET" && requestUrl.pathname === "/api/reports") {
          return sendJson(
            res,
            200,
            { reports: store.list(owner) },
            corsHeaders
          );
        }

        if (req.method === "POST" && requestUrl.pathname === "/api/reports") {
          const input = await readJson(req);
          const businessName = String(input.businessName || "").trim();
          const summary = String(input.summary || "").trim();
          if (!businessName || !summary) {
            return sendJson(
              res,
              400,
              { error: "businessName_and_summary_required" },
              corsHeaders
            );
          }
          const report = store.create(owner, {
            businessName: businessName.slice(0, 80),
            summary: summary.slice(0, 2_000)
          });
          return sendJson(res, 201, { report }, corsHeaders);
        }

        const match = requestUrl.pathname.match(/^\/api\/reports\/([^/]+)$/);
        if (req.method === "GET" && match) {
          const report = store.get(owner, decodeURIComponent(match[1]));
          if (!report) {
            return sendJson(res, 404, { error: "not_found" }, corsHeaders);
          }
          return sendJson(res, 200, { report }, corsHeaders);
        }
      }

      return sendJson(res, 404, { error: "not_found" }, corsHeaders);
    } catch (error) {
      console.error(redact(error?.stack || error));
      const status =
        error?.message === "request_too_large"
          ? 413
          : error instanceof SyntaxError
            ? 400
            : 500;
      return sendJson(res, status, { error: "request_failed" }, corsHeaders);
    }
  };
}
