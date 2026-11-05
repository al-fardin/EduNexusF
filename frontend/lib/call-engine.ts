import {
  calling,
  type ClassroomCall,
  type CallSignal,
} from "@/services/calling";
import { useCallStore, type CallControls } from "@/store/call-store";
import { useAuthStore } from "@/store/auth-store";
import { clientId } from "@/lib/client-id";
import { examError } from "@/services/exams";
const set = useCallStore.setState;
function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}
export class CallEngine implements CallControls {
  session = clientId();
  private dead = false;
  private generation = 0;
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private remote: MediaStream | null = null;
  private screen: MediaStream | null = null;
  private pending: RTCIceCandidateInit[] = [];
  private outbound: { payload: RTCIceCandidateInit; request: string }[] = [];
  private flushing = false;
  private cursor = "0";
  private syncing = false;
  private polling = false;
  private timers: ReturnType<typeof setInterval>[] = [];
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private lostTimer: ReturnType<typeof setTimeout> | null = null;
  private facing = "user";
  private current: ClassroomCall | null = null;
  private access = useAuthStore.getState().accessToken;
  constructor(private user: string) {}
  mount() {
    void this.poll();
    this.timers.push(
      setInterval(() => void this.poll(), 3000),
      setInterval(() => void this.sync(), 1000),
      setInterval(() => {
        if (this.current?.owned && this.current.state !== "ended")
          void calling
            .action(this.session, this.current.id, "heartbeat")
            .catch(() => {});
      }, 10000),
    );
    window.addEventListener("edunexus:call", this.changed);
    window.addEventListener("pagehide", this.unload);
    window.addEventListener("online", this.changed);
    window.addEventListener("edunexus:end-call", this.nativeEnd);
  }
  dispose() {
    this.dead = true;
    this.generation++;
    this.timers.forEach(clearInterval);
    if (this.endTimer) clearTimeout(this.endTimer);
    if (this.lostTimer) clearTimeout(this.lostTimer);
    window.removeEventListener("edunexus:call", this.changed);
    window.removeEventListener("pagehide", this.unload);
    window.removeEventListener("online", this.changed);
    window.removeEventListener("edunexus:end-call", this.nativeEnd);
    this.unload();
    this.release();
    set({ call: null, phase: "idle", error: "", minimized: false });
  }
  private nativeEnd = (event: Event) => {
    if ((event as CustomEvent).detail === this.current?.id) void this.end();
  };
  private changed = () => {
    void this.poll();
    void this.sync();
  };
  private unload = () => {
    const auth = useAuthStore.getState();
    const token = auth.user?.id === this.user ? auth.accessToken : this.access;
    if (this.current?.owned && this.current.state !== "ended" && token)
      void fetch(
        `${(process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "")}/calling/${this.current.id}/action?session=${this.session}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "end" }),
          keepalive: true,
        },
      ).catch(() => {});
  };
  private release() {
    if (typeof window !== "undefined")
      window.EduNexusApp?.stopCallService?.(this.current?.id ?? "");
    if (this.lostTimer) clearTimeout(this.lostTimer);
    this.lostTimer = null;
    this.pc?.close();
    this.pc = null;
    stop(this.local);
    stop(this.remote);
    stop(this.screen);
    this.local = null;
    this.remote = null;
    this.screen = null;
    this.pending = [];
    this.outbound = [];
    this.cursor = "0";
    set({
      local: null,
      remote: null,
      muted: false,
      speaker: false,
      cameraOff: false,
      sharing: false,
      audioBlocked: false,
    });
  }
  private finish(call: ClassroomCall, error = "") {
    this.generation++;
    this.current = call;
    this.release();
    set({ call, phase: "ended", error, minimized: false });
    window.dispatchEvent(new Event("edunexus:call-history"));
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      if (this.current?.id === call.id) {
        this.current = null;
        set({ call: null, phase: "idle", error: "" });
      }
    }, 3500);
  }
  private adopt(call: ClassroomCall) {
    if (this.endTimer) clearTimeout(this.endTimer);
    if (this.current?.id !== call.id) {
      this.release();
      set({ minimized: false, error: "" });
    }
    this.current = call;
    set({ call });
    if (call.state === "ended") {
      this.finish(call);
      return;
    }
    if (call.state === "ringing")
      set({ phase: call.callee_id === this.user ? "incoming" : "ringing" });
    else if (!call.owned) set({ phase: "elsewhere" });
    else if (!this.pc) set({ phase: "elsewhere" });
    else if (this.pc.connectionState !== "connected")
      set({ phase: "connecting" });
  }
  private async poll() {
    const auth = useAuthStore.getState();
    if (
      auth.user?.id === this.user &&
      auth.accessToken &&
      auth.accessToken !== this.access
    ) {
      this.access = auth.accessToken;
      if (this.current?.owned && this.current.state !== "ended")
        window.EduNexusApp?.updateCallToken?.(this.current.id, this.access);
    }
    if (
      this.dead ||
      this.polling ||
      useCallStore.getState().phase === "preparing"
    )
      return;
    this.polling = true;
    try {
      const call = await calling.active(this.session);
      if (this.dead) return;
      if (call) {
        if (this.current?.id !== call.id) this.adopt(call);
        else {
          this.current = call;
          set({ call });
          if (call.state === "active" && !call.owned)
            set({ phase: "elsewhere" });
        }
      } else if (this.current && this.current.state !== "ended") {
        await this.sync();
      }
    } catch {
    } finally {
      this.polling = false;
    }
  }
  async start(thread: string, media: "audio" | "video") {
    if (
      this.dead ||
      (this.current && this.current.state !== "ended") ||
      useCallStore.getState().phase === "preparing"
    )
      return;
    this.current = null;
    this.release();
    if (this.endTimer) clearTimeout(this.endTimer);
    const generation = ++this.generation;
    set({ call: null, phase: "preparing", error: "", minimized: false });
    let stream: MediaStream | null = null;
    let created: ClassroomCall | null = null;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw Error("Calls need HTTPS or localhost.");
      if (!window.RTCPeerConnection)
        throw Error("Calling is not supported in this browser.");
      await calling.config();
      window.dispatchEvent(new Event("edunexus:before-call-media"));
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          media === "video"
            ? {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 },
              }
            : false,
      });
      if (this.dead || generation !== this.generation) {
        stop(stream);
        return;
      }
      created = await calling.create(this.session, thread, media, clientId());
      if (this.dead || generation !== this.generation) {
        stop(stream);
        void calling.action(this.session, created.id, "end").catch(() => {});
        return;
      }
      this.local = stream;
      this.current = created;
      set({ call: created, local: stream, phase: "ringing" });
      const config = await calling.config(this.session, created.id);
      if (this.dead || generation !== this.generation) return;
      this.peer(created, config.ice_servers);
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      await this.send("offer", this.pc!.localDescription!.toJSON());
      void this.sync();
    } catch (e) {
      stop(stream);
      if (created)
        void calling.action(this.session, created.id, "end").catch(() => {});
      if (!this.dead && generation === this.generation) {
        this.release();
        this.current = null;
        set({ call: null, phase: "idle", error: this.mediaError(e) });
      }
    }
  }
  async accept() {
    const call = this.current;
    if (!call || call.state !== "ringing" || call.callee_id !== this.user)
      return;
    const generation = ++this.generation;
    set({ phase: "preparing", error: "" });
    let claimed = false;
    let stream: MediaStream | null = null;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw Error("Calls need HTTPS or localhost.");
      await calling.action(this.session, call.id, "accept");
      claimed = true;
      this.current = { ...call, state: "active", owned: true };
      set({ call: this.current });
      const config = await calling.config(this.session, call.id);
      window.dispatchEvent(new Event("edunexus:before-call-media"));
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          call.media === "video"
            ? {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 },
              }
            : false,
      });
      if (this.dead || generation !== this.generation) {
        stop(stream);
        return;
      }
      const state = await calling.sync(this.session, call.id, "0");
      if (this.dead || generation !== this.generation) {
        stop(stream);
        return;
      }
      if (state.call.state === "ended" || !state.call.owned) {
        stop(stream);
        this.adopt(state.call);
        return;
      }
      this.current = state.call;
      this.local = stream;
      set({ call: state.call, local: stream, phase: "connecting" });
      this.peer(state.call, config.ice_servers);
      await this.consume(state.signals);
    } catch (e) {
      stop(stream);
      if (claimed)
        void calling.action(this.session, call.id, "end").catch(() => {});
      if (!this.dead && generation === this.generation) {
        if (claimed)
          this.finish(
            { ...call, state: "ended", reason: "failed" },
            this.mediaError(e),
          );
        else {
          set({ phase: "incoming", error: examError(e) });
          void this.sync();
        }
      }
    }
  }
  private peer(call: ClassroomCall, iceServers: RTCIceServer[]) {
    const pc = new RTCPeerConnection({ iceServers });
    const token = useAuthStore.getState().accessToken;
    if (token)
      window.EduNexusApp?.keepCallAlive?.(
        call.id,
        this.session,
        token,
        call.media === "video",
      );
    this.pc = pc;
    this.remote = new MediaStream();
    set({ remote: this.remote });
    this.local?.getTracks().forEach((track) => pc.addTrack(track, this.local!));
    pc.onicecandidate = (e) => {
      if (e.candidate && this.pc === pc) {
        this.outbound.push({
          payload: e.candidate.toJSON(),
          request: clientId(),
        });
        void this.flush();
      }
    };
    pc.ontrack = (e) => {
      if (this.pc !== pc) return;
      if (!this.remote!.getTracks().some((t) => t.id === e.track.id))
        this.remote!.addTrack(e.track);
      set({ remote: this.remote });
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc || this.dead) return;
      if (pc.connectionState === "connected") {
        if (this.lostTimer) clearTimeout(this.lostTimer);
        this.lostTimer = null;
        set({ phase: "connected", error: "" });
        void calling.action(this.session, call.id, "connected").catch(() => {});
      } else if (pc.connectionState === "failed") {
        void this.fail("Could not connect the call. Try again.");
      } else if (pc.connectionState === "disconnected") {
        set({ phase: "reconnecting" });
        if (!this.lostTimer)
          this.lostTimer = setTimeout(() => {
            if (pc.connectionState !== "connected")
              void this.fail("Connection lost.");
          }, 12000);
      }
    };
  }
  private async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (
        this.outbound.length &&
        !this.dead &&
        this.current?.state !== "ended"
      ) {
        const item = this.outbound[0];
        try {
          await this.send("ice", item.payload, item.request);
          if (this.outbound[0] === item) this.outbound.shift();
        } catch {
          return;
        }
      }
    } finally {
      this.flushing = false;
    }
  }
  private async send(kind: string, payload: unknown, request = clientId()) {
    const call = this.current;
    if (!call || this.dead || call.state === "ended") return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await calling.signal(this.session, call.id, kind, payload, request);
        return;
      } catch (e) {
        if (
          this.dead ||
          this.current?.id !== call.id ||
          this.current.state === "ended"
        )
          return;
        if (attempt === 2) throw e;
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * (attempt + 1)),
        );
      }
    }
  }
  private async consume(signals: CallSignal[]) {
    const pc = this.pc;
    if (!pc) return;
    for (const signal of signals) {
      if (this.pc !== pc || this.dead) return;
      if (signal.kind === "ice") {
        if (pc.remoteDescription) await pc.addIceCandidate(signal.payload);
        else this.pending.push(signal.payload);
      } else if (signal.kind === "offer") {
        if (!pc.remoteDescription) {
          await pc.setRemoteDescription(signal.payload);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
        }
        if (pc.localDescription?.type === "answer")
          await this.send("answer", pc.localDescription.toJSON());
      } else if (signal.kind === "answer" && !pc.remoteDescription) {
        await pc.setRemoteDescription(signal.payload);
      }
      if (pc.remoteDescription && this.pending.length) {
        for (const candidate of this.pending)
          await pc.addIceCandidate(candidate);
        this.pending = [];
      }
      this.cursor = signal.id;
    }
  }
  private async sync() {
    const call = this.current;
    if (this.dead || !call || call.state === "ended" || this.syncing) return;
    this.syncing = true;
    try {
      void this.flush();
      const state = await calling.sync(this.session, call.id, this.cursor);
      if (this.dead || this.current?.id !== call.id) return;
      this.current = state.call;
      set({ call: state.call });
      if (state.call.state === "ended") {
        this.finish(state.call);
        return;
      }
      if (!state.call.owned && state.call.state === "active") {
        this.release();
        set({ phase: "elsewhere" });
        return;
      }
      if (
        state.call.state === "active" &&
        this.pc?.connectionState !== "connected" &&
        useCallStore.getState().phase !== "preparing"
      )
        set({ phase: "connecting" });
      if (this.pc) await this.consume(state.signals);
    } catch (e) {
      if ((e as { response?: { status: number } }).response?.status === 403)
        await this.fail("This call is no longer available.");
      else if (
        e instanceof DOMException &&
        ["OperationError", "InvalidStateError", "SyntaxError"].includes(e.name)
      )
        await this.fail("Call setup failed. Try again.");
    } finally {
      this.syncing = false;
    }
  }
  private async fail(message: string) {
    const call = this.current;
    if (!call) return;
    this.generation++;
    this.release();
    void calling.action(this.session, call.id, "end").catch(() => {});
    this.finish({ ...call, state: "ended", reason: "failed" }, message);
  }
  async end(decline = false) {
    this.generation++;
    const call = this.current;
    this.release();
    if (!call) {
      set({ phase: "idle", error: "" });
      return;
    }
    try {
      await calling.action(
        this.session,
        call.id,
        decline
          ? "decline"
          : !call.owned && call.state === "active"
            ? "force-end"
            : "end",
      );
    } catch {}
    this.finish({
      ...call,
      state: "ended",
      reason: decline
        ? "declined"
        : call.state === "ringing"
          ? "cancelled"
          : "ended",
    });
  }
  mute() {
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    set({ muted: !this.local?.getAudioTracks()[0]?.enabled });
  }
  camera() {
    const track = this.local?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      set({ cameraOff: !track.enabled });
    }
  }
  async flip() {
    const pc = this.pc;
    if (!pc || !this.local?.getVideoTracks().length || this.screen) return;
    try {
      this.facing = this.facing === "user" ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.facing } },
        audio: false,
      });
      if (this.dead || this.pc !== pc) {
        stop(stream);
        return;
      }
      const track = stream.getVideoTracks()[0];
      track.enabled = !useCallStore.getState().cameraOff;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(track);
      this.local.getVideoTracks().forEach((t) => {
        this.local!.removeTrack(t);
        t.stop();
      });
      this.local.addTrack(track);
      set({ local: new MediaStream(this.local.getTracks()) });
    } catch (e) {
      set({ error: this.mediaError(e) });
    }
  }
  async share() {
    const pc = this.pc;
    if (!pc || this.current?.media !== "video") return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;
    if (this.screen) {
      await sender.replaceTrack(this.local?.getVideoTracks()[0] ?? null);
      stop(this.screen);
      this.screen = null;
      set({ sharing: false });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      if (this.dead || this.pc !== pc) {
        stop(stream);
        return;
      }
      this.screen = stream;
      const track = stream.getVideoTracks()[0];
      await sender.replaceTrack(track);
      track.onended = () => {
        if (this.screen === stream) void this.share();
      };
      set({ sharing: true });
    } catch (e) {
      if ((e as { name?: string }).name !== "NotAllowedError")
        set({ error: this.mediaError(e) });
    }
  }
  private mediaError(e: unknown) {
    const name = (e as { name?: string }).name;
    if (name === "NotAllowedError")
      return "Allow microphone and camera access to join the call.";
    if (name === "NotFoundError")
      return "A microphone or camera could not be found.";
    if (name === "NotReadableError")
      return "Your microphone or camera is in use by another app.";
    return examError(e);
  }
}
