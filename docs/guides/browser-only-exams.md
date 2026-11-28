# Browser-only exams

Native desktop monitoring, pairing, downloadable desktop applications and Windows
executable testers are retired. The native build workflow and client source are
removed. Existing database migrations and historical records remain available for
compatibility; no desktop routes or tester upload/run routes are registered.

Use desktop Chrome or Edge on Windows or Linux. Install the unpacked Exam Monitor
extension once. Localhost works on any port. For a LAN or hosted EduNexus address,
open the extension popup on that site and choose **Connect this EduNexus site**.
Host access is optional and requested for the selected host, with an additional
exact-origin allowlist in the bridge. Return to the exam; connection is checked
automatically. Installation still requires the browser's user-controlled steps.

Consent is required for the initial monitored exam entry. The server remembers
consent for the authenticated student and exam. Once an attempt is active,
unexpired and previously consented, its consent remains valid after the initial
15-minute entry window. Resume checks do not create attempts, extend deadlines or
grant access to another student's exam. Missing browser session storage can be
recovered from server admission status. The extension reconnects without a new
agreement. Completed/expired attempts do not grant reusable admission.

Monitoring records only the consented browser evidence supported by the extension.
It does not inspect operating-system processes or provide tamper-proof attestation.
Android/phone MCQ entry remains subject to the teacher's existing phone policy.

# Interface

The public landing page uses the reference's black/purple palette, orbital rings,
glowing geometry, pill navigation and translucent cards, with EduNexus copy and
functional links. It is implemented in CSS/SVG, not an embedded recording. The
original animation video was not available to compare exact timing. Reduced-motion
preferences and a pause control are supported. Authenticated users retain their
workspace at `/`; existing academic data and authorization rules are unaffected.

Login and registration share the orbital scene. Authentication shows an animated
status while the real request is pending, then hands off to the workspace loading
state. Invalid credentials return to the form with an error; the animation does
not imply successful login or add an artificial delay. Shared application tokens,
cards, navigation and page transitions follow the same purple identity, with light
and dark variants. New installations default to dark mode; saved preferences stay
unchanged. Ambient motion is subdued inside the workspace and disabled by the
system's reduced-motion preference.

Reference: https://dribbble.com/shots/25526636-Project-Management-Dark-night-mode-web3-landing-animation
