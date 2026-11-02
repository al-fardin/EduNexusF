param([string]$Project = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$migration = Join-Path $Project 'database\migrations\000022_question_testers.up.sql'
if (-not (Test-Path -LiteralPath $migration)) { throw "Migration missing: $migration" }
docker cp $migration 'edunexus-postgres:/tmp/edunexus_000022.sql'
if ($LASTEXITCODE -ne 0) { throw 'Start the EduNexus PostgreSQL container first.' }
docker exec edunexus-postgres psql -X -U postgres -d edunexus -v ON_ERROR_STOP=1 -1 -f '/tmp/edunexus_000022.sql'
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; transaction rolled back.' }
Write-Host 'Optional question testers are ready.' -ForegroundColor Green
