[CmdletBinding()]
param(
    [ValidateRange(1024,65535)][int]$WebPort = 3000,
    [ValidateRange(1024,65535)][int]$ApiPort = 8080,
    [switch]$Production,
    [ValidateSet('Start','Status','Stop')][string]$Action = 'Start',
    [switch]$Restart,
    [switch]$SkipInfrastructure
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
Import-Module (Join-Path $PSScriptRoot 'local-services.psm1') -Force
if ($WebPort -eq $ApiPort) { throw 'API and frontend need different ports.' }
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$frontend = Join-Path $project 'frontend'
$logs = Join-Path $project 'release-builds\local-server'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$statePath = Join-Path $logs "state-$ApiPort-$WebPort.json"
$identity = [Security.Cryptography.SHA256]::Create()
try { $digest = [BitConverter]::ToString($identity.ComputeHash([Text.Encoding]::UTF8.GetBytes("$project|$ApiPort|$WebPort".ToLowerInvariant()))).Replace('-','') }
finally { $identity.Dispose() }
$mutex = [Threading.Mutex]::new($false, "Local\EduNexus-$digest")
$locked = $false
$newProcesses = @()
$runLogs = $null
try {
    try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another launcher is working on these ports. Try again when it finishes.' }
    $state = Read-LocalState $statePath $project
    if ($Action -eq 'Status') {
        foreach ($name in @('Api','Web')) {
            $port = if ($name -eq 'Api') { $ApiPort } else { $WebPort }
            $record = if ($state) { $state.$name } else { $null }
            $process = Get-VerifiedLocalProcess $record
            $status = if ($process) { "managed PID $($process.Id)" } elseif (@(Get-LocalPortOwners $port).Count) { 'occupied by another service' } else { 'stopped' }
            Write-Output "${name}: port $port - $status"
            if ($record) { Write-Output "  Log: $($record.Log).log" }
        }
        if ($state) { Write-Output "Logs: $($state.Logs)" }
        return
    }
    if ($Action -eq 'Stop' -or $Restart) {
        if ($state) {
            [void](Get-VerifiedLocalProcess $state.Web)
            [void](Get-VerifiedLocalProcess $state.Api)
            Stop-LocalProcess $state.Web
            Stop-LocalProcess $state.Api
            Remove-Item -LiteralPath $statePath
            $state = $null
        }
        if ($Action -eq 'Stop') { Write-Output 'Managed API/frontend stopped. Database services remain running.'; return }
    }
    $mode = if ($Production) { 'start' } else { 'dev' }
    if ($state -and $state.Mode -ne $mode) { throw 'Mode changed. Use -Restart to rebuild and switch modes.' }
    $apiRecord = if ($state) { $state.Api } else { $null }
    $webRecord = if ($state) { $state.Web } else { $null }
    Assert-LocalPort $ApiPort $apiRecord
    Assert-LocalPort $WebPort $webRecord
    foreach ($command in @('go.exe','node.exe','npm.cmd')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Missing $command. Install Go and Node.js, then reopen PowerShell." }
    }
    $go = (Get-Command go.exe).Source
    $node = (Get-Command node.exe).Source
    $npmEntry = Join-Path (Split-Path (Get-Command npm.cmd).Source) 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path -LiteralPath $npmEntry)) { throw 'npm CLI is missing. Repair the Node.js installation.' }
    $bothRunning = (Get-VerifiedLocalProcess $apiRecord) -and (Get-VerifiedLocalProcess $webRecord)
    $runLogs = if ($bothRunning) { $state.Logs } else { Join-Path $logs ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8)) }
    New-Item -ItemType Directory -Path $runLogs -Force | Out-Null
    Write-Output "Logs: $runLogs"
    if (-not $SkipInfrastructure) {
        if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) { throw 'Docker Desktop is required. Install it and start the engine.' }
        $docker = (Get-Command docker.exe).Source
        Write-Output '[1/4] Starting PostgreSQL, Redis and MinIO...'
        try { Invoke-LocalCommand $docker @('info','--format','{{.ServerVersion}}') $project (Join-Path $runLogs 'docker-engine') @{} 20 }
        catch { throw "Docker Desktop engine is unavailable. Start Docker Desktop and try again. Logs: $runLogs" }
        Invoke-LocalCommand $docker @('compose','-f',(Join-Path $project 'docker-compose.yml'),'up','-d','--wait','--wait-timeout','90') $project (Join-Path $runLogs 'infrastructure') @{} 120
    } else { Write-Output '[1/4] Using existing database infrastructure.' }
    $envPath = Join-Path $project '.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        $template = [IO.File]::ReadAllText((Join-Path $project '.env.example'))
        $bytes = New-Object byte[] 48
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $setting = 'JWT_SECRET=' + [Convert]::ToBase64String($bytes)
        if ($template -match '(?m)^JWT_SECRET=') { $template = [regex]::Replace($template, '(?m)^JWT_SECRET=[^\r\n]*', $setting) }
        else { $template += "`n$setting`n" }
        [IO.File]::WriteAllText($envPath, $template, [Text.UTF8Encoding]::new($false))
    }
    $nextEntry = Join-Path $frontend 'node_modules\next\dist\bin\next'
    if (-not (Test-Path -LiteralPath $nextEntry)) {
        Write-Output 'Installing locked frontend dependencies...'
        Invoke-LocalCommand $node @($npmEntry,'ci') $frontend (Join-Path $runLogs 'dependencies') @{} 600
    }
    if (-not (Test-Path (Join-Path $frontend 'public\ocr\worker.min.js')) -or -not (Test-Path (Join-Path $frontend 'public\pdfjs\pdf.worker.min.mjs'))) {
        Invoke-LocalCommand $node @($npmEntry,'run','postinstall') $frontend (Join-Path $runLogs 'assets')
    }
    $previousLogs = if ($state) { $state.Logs } else { $null }
    $state = [pscustomobject]@{ Version=1; Project=$project; Mode=$mode; Api=$apiRecord; Web=$webRecord; Logs=$runLogs; PreviousLogs=$previousLogs }
    Write-Output '[2/4] Preparing API...'
    if (-not (Get-VerifiedLocalProcess $state.Api)) {
        $apiExe = Join-Path $runLogs 'edunexus-api.exe'
        Invoke-LocalCommand $go @('build','-o',$apiExe,'./backend/apps/api') $project (Join-Path $runLogs 'api-build') @{} 300
        $process = Start-LocalProcess $apiExe @() $project (Join-Path $runLogs 'api') @{ APP_PORT=[string]$ApiPort }
        $state.Api = Get-LocalProcessRecord $process (Join-Path $runLogs 'api')
        $newProcesses += $state.Api
        Save-LocalState $statePath $state
    }
    [void](Wait-LocalHttp "http://127.0.0.1:$ApiPort/health/ready" $state.Api)
    $identityResponse = Invoke-RestMethod "http://127.0.0.1:$ApiPort/health" -TimeoutSec 5
    if ($identityResponse.data.service -ne 'EduNexus API') { throw 'The API health response is not EduNexus.' }
    Write-Output '[3/4] Preparing frontend...'
    $webEnvironment = @{ BACKEND_API_URL="http://127.0.0.1:$ApiPort"; NEXT_PUBLIC_API_URL='/api'; EDUNEXUS_NEXT_DIST_DIR=".next-local-$WebPort" }
    if (-not (Get-VerifiedLocalProcess $state.Web)) {
        if ($Production) { Invoke-LocalCommand $node @($nextEntry,'build') $frontend (Join-Path $runLogs 'web-build') $webEnvironment 600 }
        $process = Start-LocalProcess $node @($nextEntry,$mode,'--hostname','0.0.0.0','--port',[string]$WebPort) $frontend (Join-Path $runLogs 'web') $webEnvironment
        $state.Web = Get-LocalProcessRecord $process (Join-Path $runLogs 'web')
        $newProcesses += $state.Web
        Save-LocalState $statePath $state
    }
    Write-Output '[4/4] Verifying login, assets and API proxy...'
    [void](Wait-LocalHttp "http://127.0.0.1:$WebPort/api/health/ready" $state.Web)
    $page = Wait-LocalHttp "http://127.0.0.1:$WebPort/login" $state.Web
    if ($page.Content -notmatch '<title>EduNexus</title>') { throw 'Frontend identity check failed.' }
    $assets = @([regex]::Matches($page.Content, '(?:src|href)="(/_next/static/[^" ]+\.(?:js|css))"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
    if (-not $assets.Count) { throw 'Frontend returned no application assets.' }
    foreach ($asset in $assets) { [void](Invoke-WebRequest "http://127.0.0.1:$WebPort$asset" -Method Head -UseBasicParsing -TimeoutSec 15) }
    Save-LocalState $statePath $state
    Write-Output "Ready: http://localhost:$WebPort/login"
    Write-Output "API: http://127.0.0.1:$ApiPort"
    foreach ($address in @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback' })) {
        Write-Output "Phone (same Wi-Fi): http://$($address.IPAddress):$WebPort"
        if (Test-Path -LiteralPath (Join-Path $frontend 'public\downloads\EduNexus-debug.apk')) {
            Write-Output "APK download: http://$($address.IPAddress):$WebPort/downloads/EduNexus-debug.apk"
        }
    }
    Write-Output "Logs: $runLogs"
} catch {
    foreach ($record in $newProcesses) { try { Stop-LocalProcess $record } catch { Write-Warning 'Could not stop a newly started process; check launcher status.' } }
    if ($runLogs) { [IO.File]::WriteAllText((Join-Path $runLogs 'startup-error.log'), $_.Exception.Message) }
    throw
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
