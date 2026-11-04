param([string]$Container='edunexus-postgres',[string]$Database='edunexus',[string]$User='postgres',[string]$OutputDirectory=(Join-Path $PSScriptRoot '..\release-builds\database-backups'))
$ErrorActionPreference='Stop'
if($Database -notmatch '^[a-z][a-z0-9_]*$'){throw 'Invalid database name.'}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss';$remote="/tmp/edunexus-$stamp.dump";$target=Join-Path $OutputDirectory "$Database-$stamp.dump"
& docker exec $Container pg_dump -U $User -d $Database -Fc -f $remote
if($LASTEXITCODE -ne 0){throw 'Database backup failed.'}
& docker cp "${Container}:$remote" $target
if($LASTEXITCODE -ne 0){throw 'Could not copy database backup.'}
$digest=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$target.sha256",$digest)
Write-Output ([IO.Path]::GetFullPath($target))
