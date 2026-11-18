"use client";
import katex from "katex";
import { imageProblem } from "@/lib/question-images";
import Image from "next/image";
import type { QuestionImage } from "@/services/exams";

// Only KaTeX-generated markup enters HTML. Authored prose stays React text.
// Trust remains disabled, including for links, external images and HTML commands.
export function QuestionText({ text }: { text: string }) {
  const pieces = text.split(/(\$\$[\s\S]+?\$\$|(?<!\\)\$(?!\s)[^$\n]+?\$)/g);
  return (
    <span className="en-question-math">
      {pieces.map((piece, i) => {
        const display = piece.startsWith("$$") && piece.endsWith("$$"),
          inline = !display && piece.startsWith("$") && piece.endsWith("$");
        if (!display && !inline) return <span key={i}>{piece}</span>;
        const source = piece.slice(display ? 2 : 1, display ? -2 : -1);
        try {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(source, {
                  displayMode: display,
                  trust: false,
                  throwOnError: true,
                  maxExpand: 100,
                  maxSize: 20,
                  output: "htmlAndMathml",
                  strict: "warn",
                }),
              }}
            />
          );
        } catch {
          return <span key={i}>{piece}</span>;
        }
      })}
    </span>
  );
}
export function QuestionPicture({ image }: { image?: QuestionImage }) {
  if (!image || imageProblem(image)) return null;
  return (
    <>
      <Image
        src={image.data}
        alt={image.alt}
        width={image.width}
        height={image.height}
        unoptimized
        className="my-2 h-auto max-h-80 max-w-full rounded-lg border border-border object-contain"
      />
      <span
        aria-hidden="true"
        className="en-question-image-description hidden text-sm"
      >
        {image.alt}
      </span>
    </>
  );
}
