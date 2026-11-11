# Development and database scripts

Run commands below from the repository root. Script defaults also resolve that
root from their own location; callers may keep using the existing parameters.

| Task | PowerShell command |
| --- | --- |
| Start local API and frontend | `.\scripts\dev\start-local.ps1` |
| Start production frontend locally | `.\scripts\dev\start-local.ps1 -Production` |
| Apply learning feature migrations | `.\scripts\database\apply-learning-features.ps1` |
| Prepare migration SQL for inspection | `.\scripts\database\apply-learning-features.ps1 -SqlOnly` |
| Apply optional question tester migration | `.\scripts\database\apply-question-testers.ps1` |
| Back up local PostgreSQL | `.\scripts\database\backup-database.ps1` |
| Verify a backup in a new disposable database | `.\scripts\database\verify-restore.ps1 -Backup <backup-file>` |

`database/legacy/` preserves the old individual phase migration helpers. They are
not a substitute for the complete setup instructions. Moving scripts does not
apply migrations, change the database or start services.

Android and Windows client build scripts stay beside their respective projects:
[Android](../android-app/) and [desktop client](../desktop-client/).
