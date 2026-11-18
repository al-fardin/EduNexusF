export type ScanOptions = {
  language: "eng" | "eng+ben";
  startPage: number;
  endPage: number;
  signal: AbortSignal;
  onProgress: (page: number, progress: number) => void;
};
export type ScanText = { text: string; confidence: number; pages: number };
function check(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
}
async function abortable<T>(
  pending: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  check(signal);
  let abort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(new DOMException("Scan cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([pending, cancelled]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
export async function recognizeQuestionScan(
  file: File,
  options: ScanOptions,
): Promise<ScanText> {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Scan files must be at most 10 MB");
  const pdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!pdf && !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Choose a PDF, PNG, JPEG or WebP scan");
  if (
    !Number.isInteger(options.startPage) ||
    !Number.isInteger(options.endPage) ||
    options.startPage < 1 ||
    options.endPage < options.startPage ||
    options.endPage - options.startPage >= 5
  )
    throw Error("Choose up to five consecutive pages");
  check(options.signal);
  const { createWorker } = await import("tesseract.js");
  let pageNumber = options.startPage;
  const creating = createWorker(options.language, 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    workerBlobURL: false,
    logger: (message) => {
      if (!options.signal.aborted)
        options.onProgress(
          pageNumber,
          message.status === "recognizing text" ? message.progress : 0,
        );
    },
  });
  const worker = await abortable(
    creating.then((worker) => {
      if (options.signal.aborted) {
        void worker.terminate();
        throw new DOMException("Scan cancelled", "AbortError");
      }
      return worker;
    }),
    options.signal,
  );
  let terminated = false;
  const terminate = async () => {
    if (!terminated) {
      terminated = true;
      await worker.terminate();
    }
  };
  const abort = () => {
    void terminate();
  };
  options.signal.addEventListener("abort", abort, { once: true });
  let task:
    | ReturnType<(typeof import("pdfjs-dist"))["getDocument"]>
    | undefined;
  try {
    check(options.signal);
    const chunks: string[] = [],
      scores: number[] = [];
    const read = async (canvas: HTMLCanvasElement) => {
      check(options.signal);
      const { data } = await abortable(
        worker.recognize(canvas),
        options.signal,
      );
      check(options.signal);
      chunks.push(data.text);
      scores.push(data.confidence);
      options.onProgress(pageNumber, 1);
    };
    if (pdf) {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      task = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        isEvalSupported: false,
        enableXfa: false,
        maxImageSize: 16_000_000,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
        wasmUrl: "/pdfjs/wasm/",
      });
      const doc = await abortable(task.promise, options.signal);
      check(options.signal);
      if (options.endPage > doc.numPages)
        throw Error(`PDF has ${doc.numPages} pages`);
      for (
        pageNumber = options.startPage;
        pageNumber <= options.endPage;
        pageNumber++
      ) {
        check(options.signal);
        const page = await doc.getPage(pageNumber),
          base = page.getViewport({ scale: 1 }),
          scale = Math.min(2.5, 2000 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale }),
          canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
          await abortable(
            page.render({ canvas, viewport }).promise,
            options.signal,
          );
          await read(canvas);
        } finally {
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      }
    } else {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width * bitmap.height > 24_000_000)
          throw Error("Scan images must be below 24 megapixels");
        const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height)),
          canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        try {
          const ctx = canvas.getContext("2d");
          if (!ctx) throw Error("Image processing unavailable");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          await read(canvas);
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      } finally {
        bitmap.close();
      }
    }
    const text = chunks.join("\n\n");
    if (!text.trim())
      throw Error("No readable text found. Try a sharper, upright scan");
    return {
      text,
      confidence: scores.reduce((a, b) => a + b, 0) / scores.length,
      pages: scores.length,
    };
  } finally {
    options.signal.removeEventListener("abort", abort);
    await terminate();
    if (task) await task.destroy();
  }
}
