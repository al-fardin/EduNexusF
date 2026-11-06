const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const settle = () => new Promise((resolve) => setImmediate(resolve));
function harness() {
  let state = { phase: "idle", call: null };
  let mediaCalls = 0;
  let peers = [];
  const actions = [];
  const signals = [];
  const auth = { user: { id: "student" }, accessToken: "fixture-access" };
  const store = {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
    },
  };
  class Stream {
    constructor(tracks = []) {
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
    getAudioTracks() {
      return this.tracks.filter((t) => t.kind === "audio");
    }
    getVideoTracks() {
      return this.tracks.filter((t) => t.kind === "video");
    }
    addTrack(t) {
      this.tracks.push(t);
    }
    removeTrack(t) {
      this.tracks = this.tracks.filter((v) => v !== t);
    }
  }
  class Peer {
    constructor() {
      this.connectionState = "new";
      this.senders = [];
      peers.push(this);
    }
    addTrack(track) {
      this.senders.push({
        track,
        replaceTrack: async (next) => {
          this.senders.find((s) => s.track === track).track = next;
        },
      });
    }
    getSenders() {
      return this.senders;
    }
    async createOffer() {
      return { type: "offer", sdp: "v=0\r\n" };
    }
    async createAnswer() {
      return { type: "answer", sdp: "v=0\r\n" };
    }
    async setLocalDescription(value) {
      this.localDescription = { ...value, toJSON: () => value };
    }
    async setRemoteDescription(value) {
      this.remoteDescription = value;
    }
    async addIceCandidate() {
      assert.ok(
        this.remoteDescription,
        "ICE must wait for the remote description",
      );
    }
    close() {
      this.closed = true;
      this.connectionState = "closed";
    }
  }
  const track = (kind) => ({
    kind,
    id: randomUUID(),
    enabled: true,
    stopped: false,
    stop() {
      this.stopped = true;
    },
  });
  const stream = new Stream([track("audio"), track("video")]);
  let acquire = async () => stream;
  let active = null;
  const record = {
    id: "call",
    classroom_id: "class",
    conversation_id: "thread",
    caller_id: "student",
    callee_id: "teacher",
    peer_id: "teacher",
    peer_name: "Teacher",
    classroom_name: "Fixture",
    media: "video",
    state: "ringing",
    owned: true,
    created_at: new Date().toISOString(),
  };
  const calling = {
    config: async () => ({ ice_servers: [] }),
    active: async () => active,
    create: async () => ({ ...record }),
    action: async (session, id, action) => {
      actions.push(action);
    },
    signal: async (session, id, kind, payload) => {
      signals.push({ kind, payload });
    },
    sync: async () => ({ call: { ...record, state: "active" }, signals: [] }),
  };
  const window = new EventTarget();
  window.isSecureContext = true;
  window.RTCPeerConnection = Peer;
  const exports = {};
  const requireMock = (name) =>
    ({
      "@/services/calling": { calling },
      "@/store/call-store": { useCallStore: store },
      "@/store/auth-store": { useAuthStore: { getState: () => auth } },
      "@/lib/client-id": { clientId: randomUUID },
      "@/services/exams": { examError: (e) => e.message ?? "Error" },
    })[name];
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("lib/call-engine.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: requireMock,
      window,
      navigator: {
        mediaDevices: {
          getUserMedia: () => {
            mediaCalls++;
            return acquire();
          },
        },
      },
      RTCPeerConnection: Peer,
      MediaStream: Stream,
      Event,
      DOMException,
      process: { env: {} },
      fetch: async () => ({}),
      setInterval: () => 0,
      clearInterval: () => {},
      setTimeout: () => 0,
      clearTimeout: () => {},
      Date,
      console,
    },
  );
  return {
    engine: new exports.CallEngine("student"),
    stream,
    calling,
    actions,
    signals,
    peers,
    state: () => state,
    mediaCalls: () => mediaCalls,
    acquire: (fn) => (acquire = fn),
    active: (value) => (active = value),
    record,
  };
}
test("cancel during permission request stops late tracks without placing a call", async () => {
  const h = harness();
  let resolve;
  h.acquire(() => new Promise((done) => (resolve = done)));
  const start = h.engine.start("thread", "video");
  await settle();
  await h.engine.end();
  resolve(h.stream);
  await start;
  assert.ok(h.stream.getTracks().every((t) => t.stopped));
  assert.equal(h.peers.length, 0);
  assert.equal(h.signals.length, 0);
  assert.equal(h.state().phase, "idle");
  h.engine.dispose();
});
test("mute, camera toggle and hangup operate on tracks and release resources", async () => {
  const h = harness();
  await h.engine.start("thread", "video");
  assert.equal(h.signals[0].kind, "offer");
  h.engine.mute();
  assert.equal(h.stream.getAudioTracks()[0].enabled, false);
  h.engine.camera();
  assert.equal(h.stream.getVideoTracks()[0].enabled, false);
  await h.engine.end();
  assert.ok(h.stream.getTracks().every((t) => t.stopped));
  assert.equal(h.peers[0].closed, true);
  assert.equal(h.actions.at(-1), "end");
  h.engine.dispose();
});
test("a call owned by another tab never captures media or ends on disposal", async () => {
  const h = harness();
  h.active({ ...h.record, state: "active", owned: false });
  h.engine.mount();
  await settle();
  assert.equal(h.state().phase, "elsewhere");
  assert.equal(h.mediaCalls(), 0);
  h.engine.dispose();
  assert.equal(h.actions.length, 0);
});
test("declining an incoming call never opens the microphone", async () => {
  const h = harness();
  h.active({
    ...h.record,
    caller_id: "teacher",
    callee_id: "student",
    owned: false,
  });
  h.engine.mount();
  await settle();
  assert.equal(h.state().phase, "incoming");
  await h.engine.end(true);
  assert.equal(h.mediaCalls(), 0);
  assert.equal(h.actions.at(-1), "decline");
  h.engine.dispose();
});
test("ICE received before an offer is buffered until the remote description", async () => {
  const h = harness();
  h.active({
    ...h.record,
    caller_id: "teacher",
    callee_id: "student",
    owned: false,
  });
  h.calling.sync = async () => ({
    call: {
      ...h.record,
      caller_id: "teacher",
      callee_id: "student",
      state: "active",
      owned: true,
    },
    signals: [
      { id: "1", kind: "ice", payload: { candidate: "candidate:fixture" } },
      { id: "2", kind: "offer", payload: { type: "offer", sdp: "v=0\r\n" } },
    ],
  });
  h.engine.mount();
  await settle();
  await h.engine.accept();
  assert.equal(h.signals[0].kind, "answer");
  assert.equal(h.state().phase, "connecting");
  await h.engine.end();
  h.engine.dispose();
});
