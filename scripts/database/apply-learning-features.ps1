param(
    [string]$Project = ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))),
    [string]$PsqlPath = '',
    [string]$DatabaseUrl = '',
    [switch]$SqlOnly
)
$ErrorActionPreference = 'Stop'
$migrationDirectory = Join-Path $Project 'database\migrations'
$outputDirectory = Join-Path $Project 'release-builds'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$sqlPath = Join-Path $outputDirectory 'learning-features.sql'
$sql = [System.Text.StringBuilder]::new()
[void]$sql.AppendLine('\set ON_ERROR_STOP on')
[void]$sql.AppendLine('BEGIN;')
[void]$sql.AppendLine("SELECT pg_advisory_xact_lock(hashtextextended('edunexus-learning-migrations',0));")
[void]$sql.AppendLine('CREATE TABLE IF NOT EXISTS edunexus_feature_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());')
foreach ($number in 21..41) {
    $matches = @(Get-ChildItem -LiteralPath $migrationDirectory -Filter ($number.ToString('000000') + '_*.up.sql'))
    if ($matches.Count -ne 1) { throw "Expected one migration for $number" }
    $migration = $matches[0]
    if ($migration.Name -notmatch '^\d{6}_[a-z_]+\.up\.sql$') { throw 'Unexpected migration name' }
    [void]$sql.AppendLine("SELECT NOT EXISTS(SELECT 1 FROM edunexus_feature_migrations WHERE name='$($migration.Name)') AS apply_migration \gset")
    [void]$sql.AppendLine('\if :apply_migration')
    [void]$sql.AppendLine([IO.File]::ReadAllText($migration.FullName))
    [void]$sql.AppendLine("INSERT INTO edunexus_feature_migrations(name) VALUES('$($migration.Name)');")
    [void]$sql.AppendLine('\endif')
}
[void]$sql.AppendLine('COMMIT;')
[IO.File]::WriteAllText($sqlPath, $sql.ToString(), [System.Text.UTF8Encoding]::new($false))
if ($SqlOnly) { Write-Output $sqlPath; exit 0 }
if ($PsqlPath) {
    if (-not $DatabaseUrl) { throw 'Provide -DatabaseUrl when using -PsqlPath.' }
    & $PsqlPath -X -d $DatabaseUrl -v ON_ERROR_STOP=1 -f $sqlPath
} else {
    docker cp $sqlPath 'edunexus-postgres:/tmp/edunexus-learning-features.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Start the EduNexus PostgreSQL container first, or supply -PsqlPath and -DatabaseUrl.' }
    docker exec edunexus-postgres psql -X -U postgres -d edunexus -v ON_ERROR_STOP=1 -f '/tmp/edunexus-learning-features.sql'
}
if ($LASTEXITCODE -ne 0) { throw 'Learning feature migration failed; changes were rolled back.' }
Write-Host 'Learning feature migrations applied.' -ForegroundColor Green
