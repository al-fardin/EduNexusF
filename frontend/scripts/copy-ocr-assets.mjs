import { cp,mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
await mkdir(`${root}public/ocr/core`,{recursive:true});
await mkdir(`${root}public/ocr/lang`,{recursive:true});
await cp(`${root}node_modules/tesseract.js/dist/worker.min.js`,`${root}public/ocr/worker.min.js`);
for(const variant of ["lstm","simd-lstm","relaxedsimd-lstm"]){
 for(const ext of ["wasm","wasm.js"])await cp(`${root}node_modules/tesseract.js-core/tesseract-core-${variant}.${ext}`,`${root}public/ocr/core/tesseract-core-${variant}.${ext}`);
}
for(const language of ["eng","ben"])await cp(`${root}node_modules/@tesseract.js-data/${language}/4.0.0/${language}.traineddata.gz`,`${root}public/ocr/lang/${language}.traineddata.gz`);
