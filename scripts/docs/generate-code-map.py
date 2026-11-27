"""Generate a tracked-source navigation index; never read private environment files."""
from __future__ import annotations

import argparse
import collections
import pathlib
import re
import subprocess
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "reference"
EXTENSIONS = {".go", ".ts", ".tsx", ".js", ".cjs", ".mjs", ".py", ".java", ".sql", ".ps1", ".psm1", ".sh", ".yml", ".yaml", ".json", ".xml", ".css", ".gradle", ".cmd", ".webmanifest", ".properties"}
PURPOSES = {
    "backend/apps/api/main.go": "API bootstrap: config → PostgreSQL → JWT → Fiber → listen",
    "backend/internal/platform/router/router.go": "Dependency wiring ও সব active module registration",
    "backend/internal/platform/server/server.go": "Fiber app, middleware, security headers ও production budgets",
    "frontend/app/layout.tsx": "Root layout, CSS ও application-wide providers",
    "frontend/lib/api.ts": "Axios transport, bearer token, shared refresh ও request progress",
    "frontend/app/api/[...path]/route.ts": "Same-origin development/fallback API proxy",
    "frontend/lib/offline-store.ts": "Account-scoped IndexedDB, revision checks ও upload leases",
    "frontend/lib/call-engine.ts": "WebRTC media, signaling, ICE, ownership ও cleanup",
    "frontend/lib/question-import.ts": "Question parsing, answer-key validation ও import preview",
    "frontend/lib/question-import-files.ts": "CSV/TSV/JSON/TXT/Aiken/DOCX/XLSX/PDF extraction",
    "frontend/lib/question-ocr.ts": "Browser OCR lifecycle, limits ও cancellation",
    "desktop-client/client.py": "Native exam UI, pairing, foreground telemetry ও lifecycle",
    "desktop-client/local_bridge.py": "Origin-restricted localhost HTTP bridge ও local approval",
    "desktop-client/test_runner.py": "Approved Windows tester jobs, protocol, hash ও bounded output",
    "desktop-client/windows_job.py": "Windows child-process lifetime/memory limits; security sandbox নয়",
    "docker-compose.yml": "Local PostgreSQL/Redis/MinIO infrastructure",
    "deploy/compose.yml": "Production PostgreSQL/migrate/API/frontend/Caddy/backup stack",
    "deploy/Caddyfile": "HTTPS gateway, direct /api forwarding, trusted metadata ও WebSocket routing",
    "scripts/dev/start-local.ps1": "Local infrastructure + native API/frontend start/status/stop",
    "scripts/dev/local-services.psm1": "Verified process ownership, logs, bounded commands ও readiness",
    "backend/sqlc.yaml": "SQL source → generated typed pgx query code configuration",
}
FEATURES = {
    "accommodations": "Optional individual exam/assignment timing",
    "activity": "Teacher action history ও audit context",
    "analytics": "Classroom learning analytics",
    "announcements": "Announcement drafts, scheduling ও publish workflow",
    "assignments": "Assignment authoring, versioned submission ও grading",
    "audience": "Everyone/odd/even/range/custom targeting",
    "bulk": "Bulk marks import, reminder ও submission bundle",
    "calendar": "Calendar events ও reminder scheduling",
    "classroom_details": "Class details ও leave-class flow",
    "classwork": "Combined coursework catalogue ও duplication",
    "content_schedules": "Optional release scheduling ও status",
    "gradebook": "Assignment/exam grade aggregation",
    "grading_tools": "Rubrics ও feedback templates",
    "institutions": "Optional institution workspace/settings",
    "institution_classes": "Institution class placement ও independence",
    "institution_invitations": "Institution invitations",
    "institution_members": "Institution membership ও roles",
    "personal_workspace": "Private notes, checklists ও resource references",
    "personal_files": "Private note attachments",
    "progress": "Student progress ও attendance summary",
    "progress_coursework": "Student coursework feedback view",
    "question_analysis": "Exam question-level analysis",
    "rechecks": "Student recheck request ও teacher response",
    "reports": "Academic report snapshots ও lifecycle",
    "roster_import": "Roll/section roster reconciliation",
    "schedule_conflicts": "Optional schedule conflict checks",
    "section_bulk": "Confirmed bulk section transfer",
    "sections": "Optional classroom sections",
    "semesters": "Terms, archive catalogue ও class rollover",
    "similarity": "Submission similarity review; plagiarism proof নয়",
    "staff_permissions": "Co-teacher permission enforcement",
    "storage": "Storage usage, quota ও file listing",
    "student_view": "Teacher student-audience preview",
    "task_inbox": "Cross-class actionable task inbox",
    "topics": "Classwork topics ও organization",
    "trash": "Soft-deleted classroom/content restore",
    "tutor": "Class-source OpenAI tutor, quota ও private history",
    "workspace": "Home classes/activity/upcoming/files aggregation",
    "answer_review": "Scheduled answer/key/explanation review",
    "bank_catalogue": "Question bank taxonomy/catalogue",
    "exam_sets": "Exam-set preview ও reviewed snapshot approval",
    "mcq": "Single/multiple/dropdown answer normalization",
    "mobile_access": "Teacher-enabled MCQ phone entry policy",
    "phase11": "Browser-monitor policy/evidence routes",
    "phase12_admission": "Exam admission ও monitor evidence authorization",
    "phase14_desktop": "Attempt-scoped native desktop pairing/telemetry",
    "phase14b_preflight": "Desktop preflight before an attempt starts",
    "phase3": "Coding execution ও student activity endpoints",
    "phase4": "Exam management, grades, results ও marksheet PDF",
    "question_bank": "Reusable classroom question bank",
    "question_duplicates": "Potential duplicate detection",
    "question_media": "Question/option image validation",
    "question_testers": "Optional teacher-provided Windows tester attachments/tickets",
    "readiness": "Exam publish-readiness validation",
    "recovery": "Attempt revision, resume ও concurrent-save controls",
    "runner_phase3": "Restricted per-run Docker code execution",
    "workspace_phase6": "Multi-file coding workspace execution",
    "accessible_materials": "Alt text, plain text, transcript ও WebVTT",
    "account_security": "Sessions, atomic refresh, MFA encryption/recovery/revocation",
}


def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT).decode("utf-8")


def category(name: str) -> str:
    if ".bak" in name:
        return "Historical backup — active source নয়"
    if name.startswith("backend/internal/platform/database/sqlc/") or name.startswith("backend/docs/"):
        return "Generated"
    if name.startswith("frontend/public/monaco/") or name.startswith("frontend/app/vendor/"):
        return "Vendored"
    if "/tests/" in name or name.endswith("_test.go") or pathlib.PurePosixPath(name).name.startswith("test_"):
        return "Test"
    return "Source/config"


def purpose(name: str) -> str:
    if name in PURPOSES:
        return PURPOSES[name]
    if category(name) != "Source/config":
        return category(name)
    p = pathlib.PurePosixPath(name)
    stem = p.stem.replace("-", "_")
    if name.startswith("backend/internal/learning/") or name.startswith("backend/internal/exam/"):
        return FEATURES.get(stem, f"{p.parent.name} module: {stem}")
    for folder, label in [("/dto/", "Request/response data contract"), ("/repository/", "Database query adapter"), ("/handler/", "HTTP request/response adapter"), ("/service/", "Business logic"), ("/middleware/", "Request pipeline policy"), ("/security/", "Authentication/cryptographic helper"), ("/providers/", "Shared React lifecycle/context"), ("/services/", "Typed frontend API client"), ("/store/", "Client-side shared state"), ("/components/", "UI/interaction component"), ("/lib/", "Reusable browser/domain helper")]:
        if folder in name:
            return f"{label}: {stem}"
    if name.startswith("frontend/app/") and p.name == "page.tsx":
        return "Next.js page route: /" + str(p.parent.relative_to("frontend/app"))
    if p.suffix == ".css":
        return "Styles/layout/theme rules"
    if name.startswith("database/migrations/"):
        return "Schema migration " + ("rollback" if ".down." in name else "forward")
    if name.startswith("database/queries/"):
        return "Handwritten SQL query source for sqlc"
    return stem.replace("_", " ")


def symbols(name: str, source: str) -> list[tuple[str, int]]:
    patterns: list[str] = []
    ext = pathlib.PurePosixPath(name).suffix
    if ext == ".go":
        patterns = [r"^func\s+(?:\([^)]*\)\s*)?(\w+)", r"^type\s+(\w+)"]
    elif ext in {".ts", ".tsx", ".js", ".cjs", ".mjs"}:
        patterns = [r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)", r"^export\s+(?:const|class|type|interface)\s+(\w+)", r"^  (?:async\s+)?([A-Za-z_]\w*)\("]
    elif ext == ".py":
        patterns = [r"^\s*(?:async\s+)?(?:def|class)\s+(\w+)"]
    elif ext in {".ps1", ".psm1"}:
        patterns = [r"^function\s+([\w-]+)"]
    elif ext == ".java":
        patterns = [r"^\s*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[\w<>\[\].]+\s+(\w+)\(", r"^\s*(?:public\s+)?(?:final\s+)?class\s+(\w+)"]
    elif ext == ".sql":
        patterns = [r"(?im)^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNIQUE\s+)?(?:TABLE|FUNCTION|TRIGGER|INDEX|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)"]
    found = set()
    for pattern in patterns:
        for match in re.finditer(pattern, source, re.MULTILINE):
            if match.group(1) not in {"if", "for", "while", "catch", "switch"}:
                found.add((match.group(1), source.count("\n", 0, match.start()) + 1))
    return sorted(found, key=lambda item: (item[1], item[0]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--revision", default="HEAD", help="Committed source snapshot to index")
    args = parser.parse_args()
    sha = run("git", "rev-parse", "--verify", args.revision + "^{commit}").strip()
    remote = run("git", "remote", "get-url", "origin").strip().removesuffix(".git")
    entries = []
    for name in sorted(run("git", "ls-tree", "-r", "--name-only", "-z", sha).split("\0")):
        if not name or name.startswith(("archive/", "docs/")) or pathlib.PurePosixPath(name).name in {"package-lock.json", "go.sum", "go.work.sum"}:
            continue
        p = ROOT / name
        if p.suffix not in EXTENSIONS and p.name not in {"Caddyfile", "go.mod", "go.work"} and not p.name.endswith(".Dockerfile"):
            continue
        source = run("git", "show", f"{sha}:{name}").removeprefix("\ufeff")
        entries.append((name, source, category(name), symbols(name, source)))
    OUT.mkdir(parents=True, exist_ok=True)
    groups = {"backend": [], "frontend": [], "data-runtime": []}
    summary = collections.Counter()
    for entry in entries:
        key = "backend" if entry[0].startswith("backend/") else "frontend" if entry[0].startswith("frontend/") else "data-runtime"
        groups[key].append(entry)
        summary[entry[2]] += 1
    for key, items in groups.items():
        lines = [f"# EduNexus file ও symbol map — {key}", "", f"Source snapshot: [`{sha[:7]}`]({remote}/tree/{sha}).", "", "এই index structural navigation-এর জন্য। প্রতিটি function/type-এর পাশে তার source line-এর permalink আছে।", "Runtime registration পড়লে বোঝা যাবে কোন function কোন route-এ চলে। Blank line/import পুনরায় ব্যাখ্যা না করে মূল walkthrough-এর flow অনুসরণ করুন।", "", "[মূল walkthrough](../guides/codebase-walkthrough-bn.md) · [Security ও judge প্রশ্ন](../guides/security-and-judge-bn.md)", ""]
        current = None
        for name, source, kind, names in items:
            if kind == "Vendored":
                continue
            directory = str(pathlib.PurePosixPath(name).parent)
            if directory != current:
                current = directory
                lines.extend([f"## {directory}", ""])
            url = f"{remote}/blob/{sha}/{quote(name, safe='/')}"
            lines.extend([f"### [{name}]({url})", "", f"{len(source.splitlines())} physical lines · **{kind}** · {purpose(name)}", ""])
            if names:
                lines.append(" · ".join(f"[`{label}` L{number}]({url}#L{number})" for label, number in names))
                lines.append("")
        vendor = [name for name, _, kind, _ in items if kind == "Vendored"]
        if vendor:
            lines.extend(["## Vendored library files", "", "এগুলো third-party Monaco/shadcn distribution; application business logic নয়। নিজস্ব code-এর সঙ্গে line count মেশাবেন না।", ""])
            lines.extend(f"- [{name}]({remote}/blob/{sha}/{quote(name, safe='/')})" for name in vendor)
        (OUT / f"code-map-{key}.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"Indexed {len(entries)} tracked text source/config/test files at {sha[:7]}: {dict(summary)}")


if __name__ == "__main__":
    main()
