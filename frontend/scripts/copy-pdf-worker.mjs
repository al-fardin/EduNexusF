import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(`${root}public/pdfjs`, { recursive: true });
await cp(
  `${root}node_modules/pdfjs-dist/build/pdf.worker.min.mjs`,
  `${root}public/pdfjs/pdf.worker.min.mjs`,
);
for (const dir of ["cmaps", "standard_fonts", "wasm"]) {
  await cp(
    `${root}node_modules/pdfjs-dist/${dir}`,
    `${root}public/pdfjs/${dir}`,
    { recursive: true },
  );
}
