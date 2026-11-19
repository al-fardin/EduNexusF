$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Import-Module (Join-Path $project 'scripts\dev\local-services.psm1') -Force
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('EduNexus launcher QA ' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
$node = (Get-Command node.exe).Source
$checks = 0
function Check([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:checks++
}
function Rejects([scriptblock]$Operation, [string]$Pattern) {
    $message = $null
    try { & $Operation } catch { $message = $_.Exception.Message }
    Check ($message -and $message -match $Pattern) "Expected failure matching '$Pattern'; received '$message'."
}
try {
    $echoFile = Join-Path $temporary 'echo arguments.js'
    [IO.File]::WriteAllText($echoFile, 'console.log(JSON.stringify({args:process.argv.slice(2),value:process.env.EDUNEXUS_LAUNCHER_TEST}));')
    $env:EDUNEXUS_LAUNCHER_TEST = 'parent'
    $arguments = @('space value','quote"value','C:\trailing\')
    Invoke-LocalCommand $node (@($echoFile) + $arguments) $temporary (Join-Path $temporary 'echo') @{ EDUNEXUS_LAUNCHER_TEST='child' }
    $echo = [IO.File]::ReadAllText((Join-Path $temporary 'echo.log')) | ConvertFrom-Json
    Check (($echo.args -join '|') -ceq ($arguments -join '|')) 'Windows arguments changed.'
    Check ($echo.value -eq 'child' -and $env:EDUNEXUS_LAUNCHER_TEST -eq 'parent') 'Child environment leaked into parent.'
    Rejects { Invoke-LocalCommand $node @('-e','process.exit(7)') $temporary (Join-Path $temporary 'failure') } 'exit 7'
    Rejects { Invoke-LocalCommand $node @('-e','setInterval(()=>{},1000)') $temporary (Join-Path $temporary 'timeout') @{} 1 } 'timed out'
    Rejects { Wait-LocalHttp 'http://127.0.0.1:1' ([pscustomobject]@{ Id=2147483647; Executable='missing'; StartedUtc='0' }) 1 } 'exited during startup'

    $self = Get-Process -Id $PID
    $record = Get-LocalProcessRecord $self
    Check ((Get-VerifiedLocalProcess $record).Id -eq $PID) 'Owned process identity failed.'
    $record.StartedUtc = '0'
    Check (-not (Get-VerifiedLocalProcess $record)) 'Reused PID was accepted.'
    Stop-LocalProcess $record
    Check ([bool](Get-Process -Id $PID)) 'Stale record controlled another process.'

    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    try { Rejects { Assert-LocalPort $port $null } "Port $port is in use" }
    finally { $listener.Stop() }

    $statePath = Join-Path $temporary 'state.json'
    Save-LocalState $statePath ([pscustomobject]@{ Version=1; Project=$project; Api=$null; Web=$null })
    Check ((Read-LocalState $statePath $project).Version -eq 1) 'State round trip failed.'
    Rejects { Read-LocalState $statePath ($project + '-different') } 'another workspace'
    [IO.File]::WriteAllText($statePath, '{')
    Rejects { Read-LocalState $statePath $project } 'Cannot read'

    $treeFile = Join-Path $temporary 'tree.js'
    [IO.File]::WriteAllText($treeFile, 'const {spawn}=require("node:child_process");const c=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});console.log(c.pid);setInterval(()=>{},1000);')
    $tree = Start-LocalProcess $node @($treeFile) $temporary (Join-Path $temporary 'tree')
    $treeRecord = Get-LocalProcessRecord $tree
    try {
        $childId = 0
        for ($i=0; $i -lt 30; $i++) {
            $stream = [IO.File]::Open((Join-Path $temporary 'tree.log'), [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
            $reader = [IO.StreamReader]::new($stream)
            try { $line = $reader.ReadToEnd().Trim() } finally { $reader.Dispose() }
            if ($line) { $childId = [int]$line; break }
            Start-Sleep -Milliseconds 100
        }
        Check ($childId -gt 0) 'Test child never started.'
        Check ($childId -in @(Get-LocalProcessFamily $tree | ForEach-Object { $_.Id })) 'Owned child was not discovered.'
        Stop-LocalProcess $treeRecord
        Check (-not (Get-Process -Id $tree.Id -ErrorAction SilentlyContinue)) 'Managed parent remained running.'
        Check (-not (Get-Process -Id $childId -ErrorAction SilentlyContinue)) 'Managed child remained running.'
        Check ([bool](Get-Process -Id $PID)) 'Unrelated process was affected.'
    } finally {
        try { Stop-LocalProcess $treeRecord } finally {
            if (-not $tree.HasExited) { $tree.Kill(); [void]$tree.WaitForExit(5000) }
            $tree.Dispose()
        }
    }
    Write-Output "PASS: $checks launcher checks (arguments, environment, failures, occupied ports, state and process ownership)."
} finally {
    Remove-Item Env:EDUNEXUS_LAUNCHER_TEST -ErrorAction SilentlyContinue
    # Only remove the unique fixture directory created by this test.
    $resolved = [IO.Path]::GetFullPath($temporary)
    if ($resolved.StartsWith([IO.Path]::GetTempPath(), [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolved) -like 'EduNexus launcher QA *') {
        Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Continue
    }
}
