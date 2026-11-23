const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { NextResponse } = require("next/server");

function setup(fail = false) {
  const calls = [];
  const logs = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync("app/api/[...path]/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URL, Headers, console: { error: (...args) => logs.push(args) },
    process: { env: { BACKEND_API_URL: "http://127.0.0.1:8080" } },
    require: (name) => { assert.equal(name, "next/server"); return { NextResponse }; },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (fail) throw new Error("sensitive upstream URL?token=fixture-secret");
      return new Response("fixture", { headers: { "Cache-Control": "public, max-age=3600" } });
    },
  });
  const request = (path, method = "GET") => ({
    nextUrl: { pathname: path, search: "?page=2&filter=a%2Fb" },
    headers: new Headers({ Authorization: "Bearer fixture-only", Host: "web.example" }),
    method, body: method === "POST" ? new Response("fixture").body : null,
  });
  return { calls, exports, request, logs };
}

test("API proxy cannot change upstream authority or leak credentials to a supplied host", async () => {
  const { calls, exports, request } = setup();
  for (const path of ["/api//attacker.invalid/private", "/api/\\attacker.invalid/private", "/api///127.0.0.1:9999/private"]) {
    const response = await exports.GET(request(path));
    assert.equal(response.status, 400, path);
  }
  assert.equal(calls.length, 0, "unsafe path reached fetch");
});

test("API proxy preserves valid requests and prevents caching authenticated responses", async () => {
  const { calls, exports, request } = setup();
  const response = await exports.POST(request("/api/classrooms/example/messages", "POST"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "fixture");
  assert.equal(calls[0].url.href, "http://127.0.0.1:8080/classrooms/example/messages?page=2&filter=a%2Fb");
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer fixture-only");
  assert.equal(calls[0].options.headers.has("host"), false);
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(new TextDecoder().decode(calls[0].options.body), "fixture");
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("API proxy limits declared and chunked uploads before contacting upstream", async () => {
  for (const declared of [false, true]) {
    const { calls, exports, request } = setup();
    const req = request("/api/materials", "POST");
    if (declared) req.headers.set("content-length", String(19 * 1024 * 1024));
    let cancelled = false;
    req.body = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
      cancel() { cancelled = true; },
    });
    const response = await exports.POST(req);
    assert.equal(response.status, 413);
    assert.equal(calls.length, 0);
    if (!declared) assert.equal(cancelled, true);
  }
});

test("API proxy failures do not log capability-bearing upstream errors", async () => {
  const { exports, request, logs } = setup(true);
  const response = await exports.GET(request("/api/auth/verify-email"));
  assert.equal(response.status, 502);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(JSON.stringify(logs).includes("fixture-secret"), false);
  assert.deepEqual(logs, [["API proxy request failed"]]);
});
