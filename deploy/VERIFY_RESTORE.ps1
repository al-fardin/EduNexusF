param([Parameter(Mandatory=$true)][string]$Backup,[string]$Container='edunexus-postgres',[string]$User='postgres',[string]$Target=('edunexus_restore_'+(Get-Date -Format 'yyyyMMddHHmmss')))
$ErrorActionPreference='Stop'
# Restore only into a new, explicitly named verification database. Never replace
# the live database or silently drop an existing target.
if($Target -notmatch '^edunexus_restore_[a-z0-9_]+$'){throw 'Use a new edunexus_restore_ target.'}
$resolved=(Resolve-Path -LiteralPath $Backup).Path
if(Test-Path -LiteralPath "$resolved.sha256") {if((Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant() -ne ([IO.File]::ReadAllText("$resolved.sha256")).Trim()){throw 'Backup checksum mismatch.'}}
& docker exec $Container createdb -U $User $Target
if($LASTEXITCODE -ne 0){throw 'The target must be new. No database was overwritten.'}
& docker cp $resolved "${Container}:/tmp/edunexus-restore-check.dump"
if($LASTEXITCODE -ne 0){throw 'Could not copy restore file.'}
& docker exec $Container pg_restore -U $User -d $Target --exit-on-error --no-owner --no-acl /tmp/edunexus-restore-check.dump
if($LASTEXITCODE -ne 0){throw 'Restore verification failed; target retained for inspection.'}
& docker exec $Container psql -X -U $User -d $Target -v ON_ERROR_STOP=1 -c 'SELECT (SELECT count(*) FROM users) AS users,(SELECT count(*) FROM classrooms) AS classrooms,(SELECT count(*) FROM classroom_exams) AS exams;'
if($LASTEXITCODE -ne 0){throw 'Restored schema verification failed.'}
Write-Output "Verified restore: $Target (retained for inspection)."
