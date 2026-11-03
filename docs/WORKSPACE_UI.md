# Classroom workspace

The home screen contains a compact heading, class filters and a shared classroom-card grid. Account status and email verification controls live in Profile. An unverified account sees one dismissible reminder after each successful login; dismissing it and refreshing does not open it again.

Teaching and joined-class lists use the same cards. The card surface opens the classroom; its separate, keyboard-accessible overflow menu contains details and the permitted actions. Teachers can copy codes, archive/restore and delete using the existing class services. Students can leave their own class; submitted work is retained and an active exam prevents leaving. Class details expose teacher display names to members, with an owner exception for archived classrooms; private teacher contact/account fields are not exposed.

Classroom tabs use the `tab` URL query. Classwork separates assignments and materials using `work`. Teacher announcement/material editors use `compose` and occupy their own content view; the stream is hidden while composing. Browser back/forward and refresh preserve these URL selections. Student exam recovery still resumes an interrupted attempt when opening the class without an explicit tab.

The classroom header shows the name and subject. Class code and teacher details are in its overflow menu. Stream/post management is contextual; empty pagination controls are hidden. Assignment creation uses a focused editor, and detailed exam/course administration stays available through disclosures.

Validation:
- Production Next.js build and TypeScript checks pass using an isolated build directory.
- Changed workspace/auth/material/stream files pass ESLint with no errors; existing unrelated exam-monitor hook lint errors remain outside this change.
- Go integration tests pass against the isolated `edunexus_features` database, including membership isolation, teacher privacy, retained history, archived-owner access and active-exam leave protection.
- Existing-data routes pass with database sessions forced read-only.
- Browser checks cover teacher class menus/details, posting and returning to stream, teacher Analytics/student Exam refresh persistence, student Materials refresh and permissions, verified/unverified login behavior, and repeated-login verification prompts.
- Desktop and phone screenshots are in the ignored `release-builds` directory. No real classroom data was edited during the UI workflow checks.

The Android shell loads this web UI, so these interface changes do not require a new APK.
