# MCQ authoring and imports

MCQ questions support single choice, multiple-answer checkboxes, dropdowns and a
true/false preset. Each has 2–20 choices, 1–100 points, answer explanation and an
optional section heading. Choices can shuffle per attempt while preserving their
original answer indices across refresh/recovery. Teachers can duplicate and reorder
questions and use the existing preview and question bank.

Checkbox grading awards full points for the exact correct set, otherwise zero.
Answers serialize as ascending zero-based indices separated by commas, e.g. `0,2`.
Single choice/dropdown retain the existing single-index format. Public exam questions
exclude both kinds of answer key and explanations. Existing result review release
rules still apply. Migration 57 centralizes database MCQ scoring for analytics,
gradebooks, progress, rechecks and auto marks; legacy questions keep their score.

## Import / reuse questions

Upload a file, paste content, or select an exam from the same class. Nothing is saved
until you review the preview, select valid questions and explicitly add/save them.
Imported exam questions are independent copies with fresh identifiers. Existing
teacher/classroom permissions protect exam reuse and question-bank writes.

Supported inputs (100 questions / 2 MB per import; exams still allow 40 questions):

- CSV/TSV using the downloadable CSV template. Columns: `question` (or `prompt`),
  `option_a` through `option_t`, `answer`, `points`, `selection`, `topic`,
  `difficulty`, `explanation`, `section`. Selection is `single`, `multiple` or
  `dropdown`. Answer letters are A–T or **one-based** choice numbers; separate
  checkbox answers by comma/semicolon/pipe. Quote CSV fields containing commas.
- XLSX with those same headers in the lowest-numbered worksheet. Convert formulas
  to values before import. Hidden sheets may be included in a workbook; review the
  preview carefully. No macros, formula evaluation or external links are executed.
- EduNexus question-bank JSON exports or JSON question arrays / `{questions:[...]}`.
  JSON answer indices are **zero-based**. Existing theory/coding question text and
  keys are supported; executable tester attachments are not copied by file import.
- Google Forms API JSON exports (`items[].questionItem.question.choiceQuestion`):
  RADIO, CHECKBOX and SELECT with grading answer keys. Unsupported items are flagged
  in the preview; section/image/grid/branching objects are not converted. This is
  offline JSON compatibility only. There is no Google account/API connection;
  author questions inside EduNexus.
- Aiken/plain text, DOCX paragraphs or selectable-text PDF (up to 20 pages), using
  consecutive `A.`, `B.` labels and an `ANSWER:` line. Separate questions by a blank
  line. PDF extraction depends on the source's text order; review every question.
  For scanned pages use the separate Scan / photo / PDF source described below.

Example:

```text
Select the prime numbers.
A. 2
B. 4
C. 3
ANSWER: A,C
```

Missing keys, invalid choices, oversized fields and invalid points are shown as
errors and cannot be selected. Expand Edit question in the preview to correct the
prompt, choices, answer key, points, explanation, topic or difficulty; it revalidates
immediately. You can also correct the source and preview it again. Import
processing stays in the browser until an explicit API save. Archives have limits
on entry count and expanded XML size; XML entities are rejected.

Google references: [question editing/import](https://support.google.com/docs/answer/2839737?hl=en),
[quiz answer keys](https://support.google.com/docs/answer/7032287?hl=en),
[Forms API schema](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms).


## Native authoring, images and equations

No Google account or Google API is needed. Use Image, equation and section in the
question editor. PNG/JPEG/WebP input is reduced locally to an embedded PNG/JPEG
(up to 128 KB each, with an editable accessible description). These images follow
normal exam/bank permissions and independent question copies, without public file
URLs. The server verifies actual raster content/dimensions and limits total question
JSON to 2 MB and total decoded image area to 32 megapixels per save/import. Repeated
option removal adjusts image indices and keys together.

Use `$...$` for inline LaTeX or `$$...$$` for displayed equations in prompts/options;
the editor includes an equation insertion field and rendered preview. KaTeX renders
accessible MathML with trust disabled, bounded expansion, and literal fallback for
invalid input. Authored HTML is always escaped. Dropdown questions retain a native
select, with diagram/equation reference cards when needed.

Required question is optional and defaults to off. It blocks incomplete manual
submission only: partial autosaves remain allowed, timed-out saved answers remain
available for grading, and a retry of an already accepted submit still returns its
stored receipt.

## Scan / photo / PDF

Select a PNG/JPEG/WebP image or a scanned PDF up to 10 MB. Choose English or Bengali
+ English and, for PDF, up to five consecutive pages. PDF pages render locally and
Tesseract reads them on-device. Worker/WASM and language assets are copied from
pinned npm packages during `npm ci`; there is no external OCR service or AI API key.
First use downloads these static assets from the EduNexus host; subsequent language
loads use Tesseract's browser cache. OCR still requires a browser with WebAssembly,
workers and enough memory; this does not promise full offline exam authoring.

The extracted text stays editable. Explicitly confirm that you reviewed it, then
preview questions; an actual ANSWER / উত্তর line supplies the key, otherwise fill
it manually. Equations, handwriting and unclear scans may need correction. Printed
Bengali choices ক./খ./গ. and উত্তর: keys are supported. Cancelling stops recognition,
cleans up its worker and ignores late initialization/results.

## Duplicate review

Repeated normalized question text is flagged within the import and against the
current exam. A debounced, teacher-only endpoint also checks the full question bank
without returning answer keys or modifying it. These are possible duplicates;
variants may intentionally share text. Matching rows are excluded by default;
Allow possible duplicate questions lets the teacher explicitly include them.
A failed bank check is shown without blocking other valid work. Existing bank
entries are never silently overwritten or deleted.
