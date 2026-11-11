param([int]$WebPort=3000,[int]$ApiPort=8080,[switch]$Production)
$ErrorActionPreference='Stop'
$project=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$logs=Join-Path $project 'release-builds\mobile-server'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
if (-not (Test-Path (Join-Path $project '.env'))) {
    Copy-Item -LiteralPath (Join-Path $project '.env.example') -Destination (Join-Path $project '.env')
    $randomBytes=New-Object byte[] 48
    $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
    Add-Content -LiteralPath (Join-Path $project '.env') -Value ("`nJWT_SECRET="+[Convert]::ToBase64String($randomBytes)+"`nJWT_ACCESS_EXPIRE=24h")
}
if (-not (Test-Path (Join-Path $project 'frontend\node_modules'))) { throw 'Run npm ci in frontend first.' }
function IsListening([int]$Port) {
    # A process can already answer HTTP while Windows has not exposed its listener.
    try { $probe=Invoke-WebRequest "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 2; if($probe.StatusCode){return $true} }
    catch { if($_.Exception.Response){return $true} }
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}
if (-not (IsListening $ApiPort)) {
    $env:APP_PORT=[string]$ApiPort
    $apiExe=Join-Path $logs 'edunexus-api.exe'
    Push-Location $project
    try { & go build -o $apiExe ./backend/apps/api; if ($LASTEXITCODE -ne 0) { throw 'API build failed.' } } finally { Pop-Location }
    $apiProcess=Start-Process -FilePath $apiExe -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'api-out.log') -RedirectStandardError (Join-Path $logs 'api-error.log')
    $apiProcess.Id | Set-Content (Join-Path $logs 'api.pid')
}
if (-not (IsListening $WebPort)) {
    $env:BACKEND_API_URL="http://127.0.0.1:$ApiPort"
    $env:NEXT_PUBLIC_API_URL='/api'
    $node=(Get-Command node).Source
    $webMode='dev'
    if($Production){
        Push-Location (Join-Path $project 'frontend')
        try { & npm.cmd run build; if($LASTEXITCODE -ne 0){throw 'Frontend build failed.'} } finally { Pop-Location }
        $webMode='start'
    }
    $nextEntry=Join-Path $project 'frontend\node_modules\next\dist\bin\next'
    $webProcess=Start-Process -FilePath $node -ArgumentList @(('"'+$nextEntry+'"'),$webMode,'--hostname','0.0.0.0','--port',"$WebPort") -WorkingDirectory (Join-Path $project 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'web-out.log') -RedirectStandardError (Join-Path $logs 'web-error.log')
    $webProcess.Id | Set-Content (Join-Path $logs 'web.pid')
}
for ($attempt=0;$attempt -lt 30;$attempt++) {
    try { $health=Invoke-WebRequest "http://127.0.0.1:$WebPort/api/health" -UseBasicParsing -TimeoutSec 2; if ($health.StatusCode -eq 200) { break } } catch { }
    Start-Sleep -Milliseconds 500
}
if (-not $health -or $health.StatusCode -ne 200) { throw "Servers did not become ready. Check $logs" }
# The API can be healthy while cached production HTML points to missing chunks.
# Validate the public page and every script/stylesheet it references as well.
$loginPage=Invoke-WebRequest "http://127.0.0.1:$WebPort/login" -UseBasicParsing -TimeoutSec 20
if($loginPage.StatusCode -ne 200 -or $loginPage.Content -notmatch '<title>EduNexus</title>'){throw 'The frontend login page did not become ready.'}
$assetPaths=[regex]::Matches($loginPage.Content,'(?:src|href)="(/_next/static/[^" ]+\.(?:js|css))"') | ForEach-Object {$_.Groups[1].Value} | Sort-Object -Unique
if(-not $assetPaths){throw 'The frontend returned no application assets.'}
foreach($assetPath in $assetPaths){
    $asset=Invoke-WebRequest ("http://127.0.0.1:$WebPort"+$assetPath) -Method Head -UseBasicParsing -TimeoutSec 10
    if($asset.StatusCode -ne 200){throw "Frontend asset unavailable: $assetPath"}
}
Write-Output 'Login page, frontend assets and backend health verified.'
$addresses=Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback'}
foreach($address in $addresses) { Write-Output "Phone browser: http://$($address.IPAddress):$WebPort";Write-Output "APK download: http://$($address.IPAddress):$WebPort/downloads/EduNexus-debug.apk" }
Write-Output 'Use the same Wi-Fi network. Keep this computer and Docker running.'
