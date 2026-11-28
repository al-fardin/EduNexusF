# Security

Report suspected vulnerabilities privately through the repository's
[Security → Report a vulnerability](https://github.com/al-fardin/EduNexusF/security/advisories/new)
channel. Include the affected revision, minimal reproduction, impact and a
sanitized request/response. Do not post passwords, tokens, student records or
working exploits in public issues. Test only accounts and systems you control.

Use the latest `main` revision and review its CI results. A passing scan is not
proof that every attack is prevented. Deployment controls and limits are
documented in [the production security baseline](docs/quality/production-security.md).

Native desktop companions and teacher executable testers are retired.
Browser monitoring is consent-scoped and does not inspect OS processes.
The optional Docker runner belongs on a dedicated execution host.
