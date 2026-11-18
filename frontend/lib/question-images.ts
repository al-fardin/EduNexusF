import type { QuestionImage } from "@/services/exams";
export function imageProblem(image: QuestionImage): string | null {
  if (
    !image ||
    typeof image.data !== "string" ||
    !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.data) ||
    image.data.length > 180000
  )
    return "Use an embedded PNG / JPEG up to 128 KB";
  if (
    typeof image.alt !== "string" ||
    !image.alt.trim() ||
    new TextEncoder().encode(image.alt).length > 500
  )
    return "Add a short image description (up to 500 bytes)";
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1 ||
    image.width > 4096 ||
    image.height > 4096 ||
    image.width * image.height > 4_000_000
  )
    return "Image dimensions are unsupported";
  return null;
}
export async function prepareQuestionImage(file: File): Promise<QuestionImage> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw Error("Choose PNG, JPEG or WebP up to 5 MB");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16_000_000)
      throw Error("Choose an image below 16 megapixels");
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Image processing is unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data =
      file.type === "image/png"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", 0.85);
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      if (data.length <= 174800) break;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > 174800)
      throw Error("Image is too detailed. Crop or reduce it before attaching");
    return {
      data,
      alt:
        file.name.replace(/\.[^.]+$/, "").slice(0, 150) ||
        "Question illustration",
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}
