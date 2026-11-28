# Documentation

## Guides

- [Current browser-only exams, consent recovery and animated interface](guides/browser-only-exams.md)
- [বাংলায় ৯৪টি commit-এর ব্যাখ্যা: PDF, snapshot 78ca06f](../output/pdf/edunexus-commit-history-bn.pdf)
- [বাংলায় সম্পূর্ণ codebase walkthrough: architecture, features, Docker ও presentation](guides/codebase-walkthrough-bn.md)
- [বাংলায় security controls, limitations ও কঠিন judge প্রশ্নোত্তর](guides/security-and-judge-bn.md)
- [Source/function/line maps: backend](reference/code-map-backend.md), [frontend](reference/code-map-frontend.md), [database and runtime](reference/code-map-data-runtime.md)
- [Learning features and deployment migrations](guides/learning-features.md)
- [Messaging, saved coursework and teacher history](guides/learning-workflows.md)
- [Classwork, grading, scheduling and notification workflows](guides/coursework-workflows.md)
- [Calendar, bulk tools, progress, search and language preferences](guides/academic-workspace.md)
- [Semesters, academic reviews and accessible materials](guides/semester-reviews.md)
- [Task inbox, moderation, storage, reports and account security](guides/workspace-security.md)
- [Class join approval, code expiry and student email invitations](guides/class-enrollment.md)
- [QR join, CSV invitations, progress, rubrics, scheduled content and class search](guides/classwork-and-onboarding.md)
- [Optional roll audiences: Everyone, odd/even, ranges and custom groups](guides/roll-audiences.md)
- [Optional sections, roster reconciliation, filters and student-view preview](guides/optional-sections.md)
- [Optional audience previews, bulk sections, personal timing, planner and restore](guides/optional-workflow-tools.md)
- [Private personal workspace and optional schedule conflict checks](guides/personal-workspace-and-conflicts.md)
- [Violet interface and messaging](guides/violet-messaging.md)
- [Audio/video calls and rich messages](guides/calling-and-rich-messages.md)
- [Android and mobile setup](guides/mobile-android.md)
- [Classroom workspace](WORKSPACE_UI.md)
- [Deployment](../deploy/README.md)

## বাংলা PDF library

বড় অক্ষরে পড়ার জন্য আলাদা PDF। আগে walkthrough ও security guide পড়ুন;
তারপর প্রয়োজনমতো file/function index ব্যবহার করুন।

- [01 - পুরো codebase walkthrough](../output/pdf/edunexus-codebase-walkthrough-bn.pdf)
- [02 - Security ও judge প্রশ্নোত্তর](../output/pdf/edunexus-security-and-judge-bn.pdf)
- [03 - Backend file/function index](../output/pdf/edunexus-backend-code-map-bn.pdf)
- [04 - Frontend file/function index](../output/pdf/edunexus-frontend-code-map-bn.pdf)
- [05 - Database, Docker ও clients index](../output/pdf/edunexus-database-docker-clients-code-map-bn.pdf)
- [06 - ৯৪টি commit-এর ব্যাখ্যা, বড় অক্ষরে](../output/pdf/edunexus-commit-history-large-bn.pdf)

প্রথম পাঁচটি PDF-এর source snapshot `88658db`; commit history `78ca06f`
পর্যন্ত। মূল Markdown-এর বিষয়বস্তু ও source links রাখা হয়েছে। পাশাপাশি রাখলে
PDF-গুলোর companion links কাজ করে; source links খুলতে internet প্রয়োজন।

## Verification

- [Code quality and checks](quality/code-quality.md)
- [Project bug review and interface cleanup — 2026-11-27](quality/project-review-2026-11-27.md)
- [Release verification](quality/release-verification.md)
- [Backup recovery, diagnostics and academic release checks](quality/academic-release-operations.md)
- [Semester checks and signed Android update procedure](quality/semester-release-verification.md)
- [Workspace/security release verification](quality/workspace-security-verification.md)

`legacy/` contains historical phase-specific instructions. `previews/` contains
design references; those files are not the running application. Generated API
documentation lives in [`backend/docs/`](../backend/docs/).
