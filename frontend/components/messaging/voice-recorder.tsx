"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, X } from "lucide-react";
export function VoiceRecorder({
  disabled,
  onReady,
  onError,
}: {
  disabled: boolean;
  onReady: (file: File, duration: number) => void;
  onError: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [starting, setStarting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const elapsed = useRef(0);
  const since = useRef(0);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const release = useCallback(() => {
    if (clock.current) clearInterval(clock.current);
    clock.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      if (recorder.current?.state !== "inactive")
        try {
          recorder.current?.stop();
        } catch {}
      release();
    };
  }, [release]);
  const duration = useCallback(() => {
    return (
      elapsed.current +
      (recorder.current?.state === "recording" ? Date.now() - since.current : 0)
    );
  }, []);
  const stop = useCallback(
    (cancel = false) => {
      cancelled.current = cancel;
      if (recorder.current && recorder.current.state !== "inactive") {
        elapsed.current = duration();
        recorder.current.stop();
      }
      release();
      setRecording(false);
      setPaused(false);
    },
    [duration, release],
  );
  useEffect(() => {
    const finish = () => {
      cancelled.current = true;
      if (recorder.current && recorder.current.state !== "inactive")
        stop(false);
    };
    window.addEventListener("edunexus:before-call-media", finish);
    return () =>
      window.removeEventListener("edunexus:before-call-media", finish);
  }, [stop]);
  async function start() {
    if (disabled || starting) return;
    setStarting(true);
    cancelled.current = false;
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw Error(
          "Voice messages need HTTPS or localhost in a supported browser.",
        );
      const input = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!mounted.current || cancelled.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const media = new MediaRecorder(
        input,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = media;
      chunks.current = [];
      elapsed.current = 0;
      since.current = Date.now();
      setSeconds(0);
      setPaused(false);
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
        if (
          chunks.current.reduce((sum, chunk) => sum + chunk.size, 0) >
          10 * 1024 * 1024
        ) {
          stop(true);
          onError("Recording exceeded 10 MB. Try a shorter message.");
        }
      };
      media.onstop = () => {
        const ms = Math.max(1, Math.min(120000, elapsed.current));
        if (!cancelled.current && mounted.current && chunks.current.length) {
          const type = media.mimeType.split(";")[0];
          const ext = type.includes("mp4")
            ? "m4a"
            : type.includes("ogg")
              ? "ogg"
              : "webm";
          onReady(
            new File(chunks.current, [`Voice-${Date.now()}.${ext}`].join(""), {
              type,
            }),
            ms,
          );
        }
        chunks.current = [];
        release();
      };
      media.onerror = () => {
        stop(true);
        onError("Recording stopped. Please try again.");
      };
      media.start(250);
      setRecording(true);
      clock.current = setInterval(() => {
        const value = duration();
        setSeconds(Math.floor(value / 1000));
        if (value >= 119000) stop();
      }, 200);
    } catch (e) {
      release();
      onError(
        (e as { name?: string }).name === "NotAllowedError"
          ? "Allow microphone access to record a voice message."
          : e instanceof Error
            ? e.message
            : "Recording could not start.",
      );
    } finally {
      if (mounted.current) setStarting(false);
    }
  }
  function pause() {
    const media = recorder.current;
    if (!media) return;
    if (media.state === "recording") {
      elapsed.current = duration();
      media.pause();
      stream.current?.getAudioTracks().forEach((t) => (t.enabled = false));
      setPaused(true);
    } else if (media.state === "paused") {
      since.current = Date.now();
      stream.current?.getAudioTracks().forEach((t) => (t.enabled = true));
      media.resume();
      setPaused(false);
    }
  }
  if (recording)
    return (
      <div
        className="en-voice-recording"
        role="group"
        aria-label="Voice recording"
      >
        <span className={paused ? "en-voice-dot is-paused" : "en-voice-dot"} />
        <time>
          {Math.floor(seconds / 60)}:
          {(seconds % 60).toString().padStart(2, "0")}
        </time>
        <span
          className={`en-voice-wave${paused ? " is-paused" : ""}`}
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <i key={n} style={{ animationDelay: `${n * 95}ms` }} />
          ))}
        </span>
        <button
          type="button"
          className="en-icon-button"
          aria-label={paused ? "Resume recording" : "Pause recording"}
          onClick={pause}
        >
          {paused ? <Play size={19} /> : <Pause size={19} />}
        </button>
        <button
          type="button"
          className="en-icon-button"
          aria-label="Finish recording"
          onClick={() => stop()}
        >
          <Square size={18} />
        </button>
        <button
          type="button"
          className="en-icon-button"
          aria-label="Cancel recording"
          onClick={() => stop(true)}
        >
          <X size={19} />
        </button>
      </div>
    );
  return (
    <button
      type="button"
      className="en-icon-button"
      aria-label="Record voice message"
      disabled={disabled || starting}
      onClick={() => void start()}
    >
      <Mic size={21} />
    </button>
  );
}
