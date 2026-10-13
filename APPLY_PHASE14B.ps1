param([string]$Project = 'F:\EduNexus')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $Project
$migration = Join-Path -Path $Project -ChildPath 'database\migrations\000019_exam_desktop_preflight.up.sql'
if (-not (Test-Path -LiteralPath $migration)) { throw "Migration missing: $migration" }
$exists = docker exec edunexus-postgres psql -X -U postgres -d edunexus -Atc "SELECT to_regclass('public.classroom_exam_desktop_preflight') IS NOT NULL;"
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL unavailable. Run docker compose up -d first.' }
if ($exists.Trim() -eq 't') { Write-Host 'Phase 14B migration already applied.' -ForegroundColor Green; exit 0 }
docker cp $migration 'edunexus-postgres:/tmp/edunexus_000019.sql'
if ($LASTEXITCODE -ne 0) { throw 'Could not transfer migration into PostgreSQL container' }
docker exec edunexus-postgres psql -X -U postgres -d edunexus -v ON_ERROR_STOP=1 -1 -f '/tmp/edunexus_000019.sql'
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; transaction rolled back' }
Write-Host 'Phase 14B preflight schema created. Existing exams/submissions retained.' -ForegroundColor Green
