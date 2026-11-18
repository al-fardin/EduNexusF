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
  in the preview; section/image/grid/branching objects are not converted. A private
  Forms URL cannot be imported without a configured Google account integration.
- Aiken/plain text, DOCX paragraphs or selectable-text PDF (up to 20 pages), using
  consecutive `A.`, `B.` labels and an `ANSWER:` line. Separate questions by a blank
  line. PDF extraction depends on the source's text order; review every question.
  Scanned PDF/image OCR is not included.

Example:

```text
Select the prime numbers.
A. 2
B. 4
C. 3
ANSWER: A,C
```

Missing keys, invalid choices, oversized fields and invalid points are shown as
errors and cannot be selected. Correct the source and preview it again. Import
processing stays in the browser until an explicit API save. Archives have limits
on entry count and expanded XML size; XML entities are rejected.

Google references: [question editing/import](https://support.google.com/docs/answer/2839737?hl=en),
[quiz answer keys](https://support.google.com/docs/answer/7032287?hl=en),
[Forms API schema](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms).
