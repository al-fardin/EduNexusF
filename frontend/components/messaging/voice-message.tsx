"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Play, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { examError } from "@/services/exams";
export function VoiceMessage({
  path,
  duration,
  type,
}: {
  path: string;
  duration: number;
  type: string;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState(1);
  const audio = useRef<HTMLAudioElement>(null);
  const object = useRef("");
  const abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
      if (object.current) URL.revokeObjectURL(object.current);
    },
    [],
  );
  async function load() {
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await api.get<Blob>(path, {
        responseType: "blob",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      object.current = URL.createObjectURL(new Blob([response.data], { type }));
      setUrl(object.current);
    } catch (e) {
      if (!controller.signal.aborted) setError(examError(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="en-voice-message">
      <Mic size={23} />
      <div>
        {url ? (
          <audio
            ref={audio}
            src={url}
            controls
            preload="metadata"
            aria-label="Voice message"
          />
        ) : (
          <button
            type="button"
            aria-label="Load voice message"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Play size={18} />
            )}
            <span>
              Voice message · {Math.floor(duration / 60000)}:
              {(Math.floor(duration / 1000) % 60).toString().padStart(2, "0")}
            </span>
          </button>
        )}
        {error && <small role="alert">{error}</small>}
      </div>
      {url && (
        <button
          type="button"
          aria-label={`Playback speed ${speed} times`}
          onClick={() => {
            const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
            setSpeed(next);
            if (audio.current) audio.current.playbackRate = next;
          }}
        >
          {speed}×
        </button>
      )}
    </div>
  );
}
