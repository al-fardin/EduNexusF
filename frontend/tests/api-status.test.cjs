const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { loadComponent } = require("./helpers/classroom-component-render.cjs");

function setup() {
  const values = new Map([["access_token", "old-access"], ["refresh_token", "old-refresh"]]);
  const events = [];
  const state = { accessToken: "old-access", setAccessToken(value) { this.accessToken = value; }, logout() {} };
  let finishRefresh, rejectRefresh, refreshCount = 0, finishSlow;
  const refresh = new Promise((resolve, reject) => { finishRefresh = resolve; rejectRefresh = reject; });
  const transport = axios.create({ adapter: async config => {
    if (config.url === "/auth/refresh") {
      refreshCount++;
      await refresh;
      return { config, status: 200, data: { data: { access_token: "new-access", refresh_token: "new-refresh" } } };
    }
    if (config.url === "/slow") await new Promise(resolve => { finishSlow = resolve; });
    if (config.url === "/forbidden") throw new axios.AxiosError("Forbidden", "ERR_BAD_REQUEST", config, null, { status: 403 });
    if (config.url === "/protected" && config.headers.Authorization === "Bearer old-access")
      throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, { status: 401 });
    return { config, status: 200, data: "ok" };
  } });
  const api = loadComponent("lib/api.ts", {
    axios: { ...axios, create: options => axios.create({ ...options, adapter: transport.defaults.adapter }) },
    "./return-path": { safeReturnPath: () => "/" },
    "@/store/auth-store": { useAuthStore: { getState: () => state } },
  }, "", {
    process: { env: {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: {
      localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
      dispatchEvent: event => events.push(event),
    },
  }).api;
  return { api, events, finishRefresh, rejectRefresh, refreshCount: () => refreshCount, finishSlow: () => finishSlow(), latest: () => events.filter(e => e.type === "edunexus:api-status").at(-1).detail };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test("token refresh keeps unrelated writes tracked and retries every waiting request", async () => {
  const s = setup();
  const slow = s.api.post("/slow", {});
  const requests = [s.api.post("/protected", {}), s.api.post("/protected", {})];
  await tick();
  assert.equal(s.refreshCount(), 1);
  s.finishRefresh();
  await Promise.all(requests);
  assert.equal(s.latest().active, 1);
  assert.equal(s.latest().writes, 1);
  s.finishSlow();
  await slow;
  assert.equal(s.latest().active, 0);
  assert.equal(s.latest().writes, 0);
});

test("a failed refresh does not leave the saving indicator active", async () => {
  const s = setup();
  const result = s.api.post("/protected", {});
  const rejected = assert.rejects(result);
  await tick();
  s.rejectRefresh(new axios.AxiosError("Unavailable", "ERR_BAD_RESPONSE", {}, null, { status: 503 }));
  await rejected;
  assert.equal(s.latest().active, 0);
  assert.equal(s.latest().writes, 0);
});

test("an HTTP error confirms the server is reachable", async () => {
  const s = setup();
  await assert.rejects(s.api.get("/forbidden"));
  assert.equal(s.events.filter(e => e.type === "edunexus:connection").at(-1).detail.reachable, true);
});
