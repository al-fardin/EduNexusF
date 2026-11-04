"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
function PDFPages({ bytes }: { bytes: ArrayBuffer }) {
  const document = useRef<PDFDocumentProxy | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let canceled = false;
    let destroy: () => void = () => {};
    void import("pdfjs-dist")
      .then(async (pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({
          data: new Uint8Array(bytes.slice(0)),
          isEvalSupported: false,
          enableXfa: false,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
        });
        destroy = () => void task.destroy();
        const pdf = await task.promise;
        if (canceled) {
          void pdf.destroy();
          return;
        }
        document.current = pdf;
        setPages(pdf.numPages);
      })
      .catch((e) => {
        if (!canceled) {
          setError(e instanceof Error ? e.message : "PDF preview unavailable");
          setBusy(false);
        }
      });
    return () => {
      canceled = true;
      document.current = null;
      destroy();
    };
  }, [bytes]);
  useEffect(() => {
    if (!pages) return;
    let canceled = false;
    let render: RenderTask | undefined;
    const pdf = document.current;
    if (!pdf) return;
    void pdf
      .getPage(page)
      .then(async (sheet) => {
        if (canceled || !canvas.current) return;
        const raw = sheet.getViewport({ scale: 1 });
        const width = Math.min(
          1400,
          Math.max(260, (container.current?.clientWidth ?? 700) - 24) *
            zoom *
            1.5,
        );
        const viewport = sheet.getViewport({ scale: width / raw.width });
        const target = canvas.current;
        target.width = Math.round(viewport.width);
        target.height = Math.round(viewport.height);
        target.style.width = `${viewport.width / 1.5}px`;
        target.style.height = `${viewport.height / 1.5}px`;
        render = sheet.render({ canvas: target, viewport });
        await render.promise;
        if (!canceled) setBusy(false);
      })
      .catch((e) => {
        if (!canceled) {
          setError(
            e instanceof Error ? e.message : "Could not render this page",
          );
          setBusy(false);
        }
      });
    return () => {
      canceled = true;
      render?.cancel();
    };
  }, [page, pages, zoom]);
  return (
    <>
      <div className="en-pdf-controls">
        <button
          className="en-icon-button"
          disabled={page <= 1 || busy}
          aria-label="Previous PDF page"
          onClick={() => {
            setBusy(true);
            setPage((p) => p - 1);
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Page {page} / {pages || "…"}
        </span>
        <button
          className="en-icon-button"
          disabled={page >= pages || busy}
          aria-label="Next PDF page"
          onClick={() => {
            setBusy(true);
            setPage((p) => p + 1);
          }}
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="en-icon-button"
          disabled={zoom <= 0.75 || busy}
          aria-label="Zoom out"
          onClick={() => {
            setBusy(true);
            setZoom((z) => Math.max(0.75, z - 0.25));
          }}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="en-icon-button"
          disabled={zoom >= 2 || busy}
          aria-label="Zoom in"
          onClick={() => {
            setBusy(true);
            setZoom((z) => Math.min(2, z + 0.25));
          }}
        >
          <ZoomIn size={18} />
        </button>
      </div>
      <div ref={container} className="en-pdf-canvas-scroll">
        {busy && <p role="status">Rendering page…</p>}
        {error && <p role="alert">{error}</p>}
        <canvas ref={canvas} aria-label={`PDF page ${page}`} />
      </div>
    </>
  );
}
export function ProtectedFilePreview({
  path,
  filename,
}: {
  path: string;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [url, setUrl] = useState("");
  const objectUrl = useRef("");
  const controller = useRef<AbortController | null>(null);
  const type = filename.toLowerCase().endsWith(".pdf")
    ? "pdf"
    : /\.(png|jpe?g|webp|gif|avif)$/.test(filename.toLowerCase())
      ? "image"
      : "";
  useEffect(
    () => () => {
      controller.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  function close() {
    controller.current?.abort();
    setOpen(false);
    setBytes(null);
    setUrl("");
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = "";
    }
  }
  async function show() {
    setOpen(true);
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const current = controller.current;
    try {
      const response = await api.get<Blob>(path, {
        responseType: "blob",
        signal: current.signal,
      });
      if (current.signal.aborted) return;
      if (response.data.size > 20 * 1024 * 1024)
        throw Error("This file is too large to preview. Download it instead.");
      if (type === "pdf") {
        const data = await response.data.arrayBuffer();
        if (current.signal.aborted) return;
        setBytes(data);
      } else {
        objectUrl.current = URL.createObjectURL(response.data);
        setUrl(objectUrl.current);
      }
    } catch (e) {
      if (!current.signal.aborted) setError(examError(e));
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }
  if (!type) return null;
  return (
    <>
      <button
        type="button"
        className="en-file-preview-button"
        aria-label={`Preview ${filename}`}
        onClick={() => void show()}
      >
        <Eye size={16} />
        <span>Preview</span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent className="en-file-preview-dialog">
          <DialogHeader>
            <DialogTitle>{filename}</DialogTitle>
            <DialogDescription>File preview</DialogDescription>
          </DialogHeader>
          {busy ? (
            <div className="en-file-preview-loading" role="status">
              Loading preview…
            </div>
          ) : error ? (
            <p role="alert" className="en-chat-error">
              {error}
            </p>
          ) : type === "pdf" && bytes ? (
            <PDFPages bytes={bytes} />
          ) : url ? (
            <div className="en-image-preview">
              <Image
                src={url}
                alt={filename}
                fill
                unoptimized
                sizes="90vw"
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
