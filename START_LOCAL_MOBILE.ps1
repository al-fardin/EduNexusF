param([int]$WebPort=3000,[int]$ApiPort=8080)
$ErrorActionPreference='Stop'
$project=$PSScriptRoot
$logs=Join-Path $project 'release-builds\mobile-server'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
if (-not (Test-Path (Join-Path $project '.env'))) {
    Copy-Item -LiteralPath (Join-Path $project '.env.example') -Destination (Join-Path $project '.env')
    $randomBytes=New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
    Add-Content -LiteralPath (Join-Path $project '.env') -Value ("`nJWT_SECRET="+[Convert]::ToBase64String($randomBytes)+"`nJWT_ACCESS_EXPIRE=24h")
}
if (-not (Test-Path (Join-Path $project 'frontend\node_modules'))) { throw 'Run npm ci in frontend first.' }
function IsListening([int]$Port) { return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) }
if (-not (IsListening $ApiPort)) {
    $env:APP_PORT=[string]$ApiPort
    $apiExe=Join-Path $logs 'edunexus-api.exe'
    Push-Location $project
    try { & go build -o $apiExe ./apps/api; if ($LASTEXITCODE -ne 0) { throw 'API build failed.' } } finally { Pop-Location }
    $apiProcess=Start-Process -FilePath $apiExe -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'api-out.log') -RedirectStandardError (Join-Path $logs 'api-error.log')
    $apiProcess.Id | Set-Content (Join-Path $logs 'api.pid')
}
if (-not (IsListening $WebPort)) {
    $env:BACKEND_API_URL="http://127.0.0.1:$ApiPort"
    $env:NEXT_PUBLIC_API_URL='/api'
    $node=(Get-Command node).Source
    $webMode=if(Test-Path (Join-Path $project 'frontend\.next\BUILD_ID')){'start'}else{'dev'}
    $webProcess=Start-Process -FilePath $node -ArgumentList @('node_modules/next/dist/bin/next',$webMode,'--hostname','0.0.0.0','--port',"$WebPort") -WorkingDirectory (Join-Path $project 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'web-out.log') -RedirectStandardError (Join-Path $logs 'web-error.log')
    $webProcess.Id | Set-Content (Join-Path $logs 'web.pid')
}
for ($attempt=0;$attempt -lt 30;$attempt++) {
    try { $health=Invoke-WebRequest "http://127.0.0.1:$WebPort/api/health" -UseBasicParsing -TimeoutSec 2; if ($health.StatusCode -eq 200) { break } } catch { }
    Start-Sleep -Milliseconds 500
}
if (-not $health -or $health.StatusCode -ne 200) { throw "Servers did not become ready. Check $logs" }
$addresses=Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback'}
foreach($address in $addresses) { Write-Output "Phone browser: http://$($address.IPAddress):$WebPort";Write-Output "APK download: http://$($address.IPAddress):$WebPort/downloads/EduNexus-debug.apk" }
Write-Output 'Use the same Wi-Fi network. Keep this computer and Docker running.'
