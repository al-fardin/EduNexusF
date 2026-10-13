# EduNexus Phase 1 classroom-materials migration — no existing database tables are removed.
param([string]$Project = "F:\EduNexus")
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $Project
$migration = Join-Path $Project "database\migrations\000010_create_classroom_materials.up.sql"
if (-not (Test-Path -LiteralPath $migration)) { throw "Missing migration file: $migration" }
Write-Host "Checking Docker PostgreSQL..." -ForegroundColor Cyan
$exists = docker exec edunexus-postgres psql -U postgres -d edunexus -Atc "SELECT to_regclass('public.classroom_materials') IS NOT NULL;"
if ($LASTEXITCODE -ne 0) { throw "Database check failed. Start Docker Compose first." }
if ($exists.Trim() -eq "t") {
    Write-Host "Migration already applied; nothing to change." -ForegroundColor Green
    exit 0
}
Write-Host "Applying migration 000010 (additive, transactional)..." -ForegroundColor Cyan
docker cp $migration "edunexus-postgres:/tmp/edunexus_000010.sql"
if ($LASTEXITCODE -ne 0) { throw "Migration copy failed" }
docker exec edunexus-postgres psql -X -U postgres -d edunexus -v ON_ERROR_STOP=1 -1 -f "/tmp/edunexus_000010.sql"
if ($LASTEXITCODE -ne 0) { throw "Migration failed; database transaction was rolled back" }
Write-Host "Classroom materials migration applied successfully." -ForegroundColor Green
Write-Host "Now run: go run ./apps/api" -ForegroundColor Cyan
