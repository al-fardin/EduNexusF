# EduNexus · Phase 1 — Stream & Materials

This package starts from the user's latest `EduNexus_Latest.zip` **after** the unified classroom-role fix. Existing account, classroom, announcement, join, and membership API behavior is retained. Frontend uses the vintage design palette already approved.

## Newly implemented

- Teachers upload a file to a classroom, giving it a title and optional description.
- Files are stored locally in private `uploads/materials/<class_uuid>/<random_uuid>` (not in the public directory).
- File metadata and corresponding `material` stream post are created in a PostgreSQL transaction.
- Members can view materials in **Classwork** and download securely from **Classwork** or **Stream**.
- Only that classroom's active members can read its materials. Only teachers in that classroom can upload or delete files.
- Teachers may delete a material from Classwork; its stream entry and on-disk file are removed.
- Files limited to 15 MB; supported: PDF, TXT, MD, CSV, PNG, JPG, WEBP, DOC/DOCX, PPT/PPTX, XLS/XLSX, ZIP.
- No account-level student/teacher role change required; uses existing classroom membership role rules.

## Install safely on Windows (PowerShell)

1. Stop existing Go backend and Next.js dev server with `Ctrl+C` in their respective terminals.
2. Extract this ZIP **into** `F:\EduNexus`, replacing source files when asked. Do **not** delete your existing `.env`, `frontend/.env.local`, Postgres volumes, or existing `uploads` folder.
3. Open PowerShell, run:

```powershell
cd "F:\EduNexus"
docker compose up -d
powershell -ExecutionPolicy Bypass -File .\APPLY_PHASE1.ps1 -Project "F:\EduNexus"
go run ./apps/api
```

4. In a **second** PowerShell terminal:

```powershell
cd "F:\EduNexus\frontend"
# First time only, if needed:
# Copy-Item .env.local.example .env.local
npm ci
npm run dev
```

5. Sign in at http://localhost:3000, open a class you **created**, choose **Classwork** or **Stream**, and upload a file. Open the same class as a joined student to test download.

## New REST endpoints

All require `Authorization: Bearer <access_token>` and valid classroom membership.

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/classrooms/:id/materials` | Teacher membership — multipart `title`, `description`, `file` |
| GET | `/classrooms/:id/materials` | Any active class member |
| GET | `/classrooms/:id/materials/:materialID/download` | Any active class member |
| DELETE | `/classrooms/:id/materials/:materialID` | Teacher membership |

New migration: `database/migrations/000010_create_classroom_materials.up.sql`. Run **once** against the existing database; `APPLY_PHASE1.ps1` checks for existing table first and is safe to rerun. No existing data is reset.

**Storage warning:** This phase stores files locally on the machine running Go. Back up `uploads/materials` along with PostgreSQL before moving servers. Set `MATERIAL_UPLOAD_DIR` on the backend if you need another location. Cloud storage and virus scanning are not implemented yet; do not deploy to untrusted public users without storage/AV hardening. Direct deletion of a material using the old generic Stream-delete API can leave an orphan local file; use the Classwork Delete button.

## Not implemented in Phase 1

Exam scheduling, live coding/editor/runner, risk scoring, automated/AI grading, public marksheet and private individual result details. Existing exam/attendance/results placeholders remain as placeholders. These require their own DB/API/UI phases; no claim of completed implementation is made here.

## Validation limitations

Frontend TypeScript type checking passed in the work environment. Go source was formatted and parsed, but compiling and full integration tests may require Go 1.26.4, PostgreSQL, and matching local dependencies. The production Next.js build was not verified in this environment.
