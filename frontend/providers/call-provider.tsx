"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Minimize2,
  Maximize2,
  SwitchCamera,
  ScreenShare,
  Volume2,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  useCallStore,
  bindCallControls,
  callControls,
} from "@/store/call-store";
import { CallEngine } from "@/lib/call-engine";
function StreamVideo({
  stream,
  local = false,
}: {
  stream: MediaStream | null;
  local?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (node) {
      node.srcObject = stream;
      void node.play().catch(() => {});
    }
    return () => {
      if (node) node.srcObject = null;
    };
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={local ? "en-call-self" : ""}
      aria-label={local ? "Your camera" : "Participant video"}
    />
  );
}
function elapsed(start: string | null) {
  if (!start) return "00:00";
  const n = Math.max(
    0,
    Math.floor((Date.now() - new Date(start).getTime()) / 1000),
  );
  return `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
}
function CallOverlay() {
  const state = useCallStore();
  useEffect(() => {
    if (state.phase === "idle" || state.phase === "ended")
      window.EduNexusApp?.resetAudio?.();
  }, [state.phase]);
  const user = useAuthStore((s) => s.user?.id);
  const audio = useRef<HTMLAudioElement>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (state.phase !== "connected") return;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [state.phase]);
  useEffect(() => {
    const node = audio.current;
    if (!node) return;
    node.srcObject = state.remote;
    void node.play().catch(() => useCallStore.setState({ audioBlocked: true }));
    return () => {
      node.srcObject = null;
    };
  }, [state.remote]);
  useEffect(() => {
    if (state.phase !== "incoming" && state.phase !== "ringing") return;
    let context: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      context = new AudioContext();
      const ring = () => {
        if (!context || context.state !== "running") return;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.025, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.6,
        );
        gain.connect(context.destination);
        const tone = context.createOscillator();
        tone.frequency.value = state.phase === "incoming" ? 660 : 440;
        tone.connect(gain);
        tone.start();
        tone.stop(context.currentTime + 0.6);
      };
      void context
        .resume()
        .then(ring)
        .catch(() => {});
      timer = setInterval(ring, 2400);
    } catch {}
    return () => {
      if (timer) clearInterval(timer);
      void context?.close().catch(() => {});
    };
  }, [state.phase]);
  if (state.phase === "idle") {
    return state.error ? (
      <div className="en-call-notice" role="alert">
        <span>{state.error}</span>
        <button
          aria-label="Dismiss call notice"
          onClick={() => useCallStore.setState({ error: "" })}
        >
          <X size={17} />
        </button>
      </div>
    ) : null;
  }
  const call = state.call;
  const incoming = state.phase === "incoming";
  const ended = state.phase === "ended";
  const labels = {
    idle: "",
    preparing: "Preparing call…",
    incoming: `Incoming ${call?.media ?? "audio"} call`,
    ringing: "Ringing…",
    connecting: "Connecting…",
    connected: elapsed(call?.connected_at ?? null),
    reconnecting: "Reconnecting…",
    elsewhere: "Call open in another tab",
    ended:
      call?.reason === "missed"
        ? "Missed call"
        : call?.reason === "declined"
          ? "Call declined"
          : "Call ended",
  };
  return (
    <>
      <audio ref={audio} autoPlay />
      <section
        className={`en-call-window${state.minimized ? " en-call-minimized" : ""}`}
        role={state.minimized ? "region" : "dialog"}
        aria-label={incoming ? "Incoming call" : "Classroom call"}
        aria-modal={false}
        onKeyDown={(e) => {
          if (e.key === "Escape") useCallStore.setState({ minimized: true });
        }}
      >
        <header>
          <div>
            <strong>{call?.peer_name ?? "Classroom call"}</strong>
            <small>{call?.classroom_name}</small>
          </div>
          <button
            className="en-call-icon"
            aria-label={state.minimized ? "Expand call" : "Minimize call"}
            onClick={() =>
              useCallStore.setState({ minimized: !state.minimized })
            }
          >
            {state.minimized ? (
              <Maximize2 size={18} />
            ) : (
              <Minimize2 size={18} />
            )}
          </button>
        </header>
        <div className="en-call-stage">
          {call?.media === "video" &&
          state.remote &&
          state.phase !== "incoming" ? (
            <StreamVideo stream={state.remote} />
          ) : (
            <div
              className={`en-call-avatar${incoming ? " en-call-pulse" : ""}`}
            >
              {call?.peer_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("") || <Phone size={32} />}
            </div>
          )}
          {!state.minimized &&
            call?.media === "video" &&
            state.local &&
            !state.cameraOff && <StreamVideo stream={state.local} local />}
          <div className="en-call-status" role="status">
            {labels[state.phase]}
          </div>
        </div>
        {!state.minimized && state.error && (
          <p className="en-call-error" role="alert">
            {state.error}
          </p>
        )}
        {state.audioBlocked && state.remote && (
          <button
            className="en-call-audio"
            onClick={() => {
              void audio.current
                ?.play()
                .then(() => useCallStore.setState({ audioBlocked: false }));
            }}
          >
            <Volume2 size={18} />
            Play call audio
          </button>
        )}
        <footer>
          {incoming ? (
            <>
              <button
                className="en-call-control en-call-hangup"
                aria-label="Decline call"
                onClick={() => void callControls()?.end(true)}
              >
                <PhoneOff />
                <span>Decline</span>
              </button>
              <button
                className="en-call-control en-call-answer"
                aria-label="Answer call"
                onClick={() => void callControls()?.accept()}
              >
                {call?.media === "video" ? <Video /> : <Phone />}
                <span>Answer</span>
              </button>
            </>
          ) : ended ? (
            <button
              className="en-call-audio"
              onClick={() =>
                useCallStore.setState({ phase: "idle", call: null, error: "" })
              }
            >
              Close
            </button>
          ) : (
            <>
              {!state.minimized &&
                state.phase !== "elsewhere" &&
                state.local && (
                  <>
                    <button
                      className={`en-call-control${state.muted ? " is-off" : ""}`}
                      aria-label={
                        state.muted ? "Unmute microphone" : "Mute microphone"
                      }
                      onClick={() => callControls()?.mute()}
                    >
                      {state.muted ? <MicOff /> : <Mic />}
                      <span>{state.muted ? "Unmute" : "Mute"}</span>
                    </button>
                    {typeof window !== "undefined" &&
                      window.EduNexusApp?.setSpeaker && (
                        <button
                          className={`en-call-control${state.speaker ? " is-off" : ""}`}
                          aria-label={
                            state.speaker ? "Use earpiece" : "Use speaker"
                          }
                          onClick={() => {
                            window.EduNexusApp?.setSpeaker?.(!state.speaker);
                            useCallStore.setState({ speaker: !state.speaker });
                          }}
                        >
                          <Volume2 />
                          <span>Speaker</span>
                        </button>
                      )}
                    {call?.media === "video" && (
                      <>
                        <button
                          className={`en-call-control${state.cameraOff ? " is-off" : ""}`}
                          aria-label={
                            state.cameraOff
                              ? "Turn camera on"
                              : "Turn camera off"
                          }
                          onClick={() => callControls()?.camera()}
                        >
                          {state.cameraOff ? <VideoOff /> : <Video />}
                          <span>Camera</span>
                        </button>
                        <button
                          className="en-call-control"
                          aria-label="Switch camera"
                          disabled={state.sharing}
                          onClick={() => void callControls()?.flip()}
                        >
                          <SwitchCamera />
                          <span>Flip</span>
                        </button>
                        {typeof navigator !== "undefined" &&
                          !!navigator.mediaDevices?.getDisplayMedia && (
                            <button
                              className={`en-call-control en-call-screen${state.sharing ? " is-off" : ""}`}
                              aria-label={
                                state.sharing
                                  ? "Stop screen sharing"
                                  : "Share screen"
                              }
                              onClick={() => void callControls()?.share()}
                            >
                              <ScreenShare />
                              <span>
                                {state.sharing ? "Stop share" : "Share"}
                              </span>
                            </button>
                          )}
                      </>
                    )}
                  </>
                )}
              <button
                className="en-call-control en-call-hangup"
                aria-label="End call"
                onClick={() => void callControls()?.end()}
              >
                <PhoneOff />
                <span>
                  {state.phase === "ringing" || state.phase === "preparing"
                    ? "Cancel"
                    : "End"}
                </span>
              </button>
            </>
          )}
        </footer>
        {incoming && !state.minimized && (
          <p className="en-call-caption">
            {call?.caller_id === user
              ? ""
              : "Answering turns on your microphone"}
            {call?.media === "video" ? " and camera." : "."}
          </p>
        )}
      </section>
    </>
  );
}
export function CallProvider() {
  const user = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!user) return;
    const engine = new CallEngine(user);
    bindCallControls(engine);
    engine.mount();
    return () => {
      bindCallControls(null);
      engine.dispose();
    };
  }, [user]);
  return <CallOverlay />;
}
