Set-StrictMode -Version 2.0

function ConvertTo-LocalArgument([string]$Value) {
    $escaped = [regex]::Replace($Value, '(\\*)"', '$1$1\"')
    $escaped = [regex]::Replace($escaped, '(\\+)$', '$1$1')
    return '"' + $escaped + '"'
}

function Get-LocalProcessRecord($Process, [string]$Log = '') {
    # Start-Process can expose a null Path on Windows PowerShell 5.1. Query a
    # fresh process snapshot instead of persisting an unverifiable identity.
    $started = $Process.StartTime.ToUniversalTime().Ticks.ToString()
    $clock = [Diagnostics.Stopwatch]::StartNew()
    do {
        if ($Process.HasExited) { throw 'Managed process exited before its identity was recorded. Check its logs.' }
        $snapshot = Get-Process -Id $Process.Id -ErrorAction Stop
        try {
            if ($snapshot.StartTime.ToUniversalTime().Ticks.ToString() -ne $started) { throw 'Managed process identity changed.' }
            # The image may not be available in the first process snapshot even
            # though CreateProcess succeeded. Never persist an assumed path.
            if ($snapshot.Path) {
                return [pscustomobject]@{
                    Id = $snapshot.Id
                    Executable = $snapshot.Path
                    StartedUtc = $started
                    Log = $Log
                }
            }
        } finally { $snapshot.Dispose() }
        Start-Sleep -Milliseconds 50
    } while ($clock.Elapsed.TotalSeconds -lt 3)
    throw 'Cannot determine managed executable path.'
}

function Get-VerifiedLocalProcess($Record) {
    if (-not $Record) { return $null }
    try {
        $process = Get-Process -Id $Record.Id -ErrorAction SilentlyContinue
        if (-not $process) { return $null }
        if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne $Record.StartedUtc -or
            -not [string]::Equals($process.Path, $Record.Executable, [StringComparison]::OrdinalIgnoreCase)) {
            return $null
        }
    } catch { return $null }
    return $process
}

function Get-LocalProcessFamily($Process) {
    $family = @($Process)
    for ($index = 0; $index -lt $family.Count; $index++) {
        if ($family.Count -gt 100) { throw 'Unexpected process tree size.' }
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($family[$index].Id)" -ErrorAction Stop)) {
            $live = Get-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
            if ($live -and $live.StartTime.ToUniversalTime() -ge $Process.StartTime.ToUniversalTime()) {
                # Match the child snapshot too, rather than trusting a recycled
                # descendant PID between the CIM query and process lookup.
                if ($child.CreationDate -and [Math]::Abs(($live.StartTime.ToUniversalTime() - $child.CreationDate.ToUniversalTime()).TotalMilliseconds) -gt 2) { continue }
                if ($child.ExecutablePath -and -not [string]::Equals($child.ExecutablePath, $live.Path, [StringComparison]::OrdinalIgnoreCase)) { continue }
                $family += $live
            }
        }
    }
    return $family
}

function Stop-LocalProcess($Record) {
    $process = Get-VerifiedLocalProcess $Record
    if (-not $process) { return }
    Stop-LocalOwnedProcess $process
}

# Accept only a handle from our own Start-Process or verified state lookup.
function Stop-LocalOwnedProcess($Process) {
    # Snapshot children while the verified parent is alive, then stop it first
    # so a development supervisor cannot spawn a replacement during cleanup.
    $family = @(Get-LocalProcessFamily $Process)
    foreach ($entry in $family) {
        try {
            if (-not $entry.HasExited) {
                $entry.Kill()
                if (-not $entry.WaitForExit(5000)) { throw "Managed process $($entry.Id) did not stop." }
            }
        } finally { $entry.Dispose() }
    }
}

function Start-LocalRecordedProcess([string]$Executable, [string[]]$Arguments, [string]$Directory,
                                    [string]$Log, [hashtable]$Variables = @{}) {
    $process = Start-LocalProcess $Executable $Arguments $Directory $Log $Variables
    try { return Get-LocalProcessRecord $process $Log }
    catch {
        # No state record exists yet; cleanup must use our original process
        # handle rather than leave an untracked server occupying its port.
        if (-not $process.HasExited) { Stop-LocalOwnedProcess $process }
        throw
    } finally { $process.Dispose() }
}

function Start-LocalProcess([string]$Executable, [string[]]$Arguments, [string]$Directory,
                            [string]$Log, [hashtable]$Variables = @{}) {
    $previous = @{}
    try {
        foreach ($name in $Variables.Keys) {
            $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
            [Environment]::SetEnvironmentVariable($name, $Variables[$name], 'Process')
        }
        $quoted = @($Arguments | ForEach-Object { ConvertTo-LocalArgument $_ })
        $options = @{ FilePath=$Executable; WorkingDirectory=$Directory; WindowStyle='Hidden'; PassThru=$true;
            RedirectStandardOutput="$Log.log"; RedirectStandardError="$Log.error.log" }
        if ($quoted.Count) { $options.ArgumentList = $quoted }
        $process = Start-Process @options
        # Windows PowerShell 5.1 needs the handle cached to retain ExitCode after
        # a short-lived native process exits.
        [void]$process.Handle
        return $process
    } finally {
        foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    }
}

function Invoke-LocalCommand([string]$Executable, [string[]]$Arguments, [string]$Directory,
                             [string]$Log, [hashtable]$Variables = @{}, [int]$TimeoutSeconds = 300) {
    $process = Start-LocalProcess $Executable $Arguments $Directory $Log $Variables
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
        $record = Get-LocalProcessRecord $process
        Stop-LocalProcess $record
        throw "Command timed out. Check $Log.log and $Log.error.log"
    }
    if ($process.ExitCode -ne 0) { throw "Command failed (exit $($process.ExitCode)). Check $Log.log and $Log.error.log" }
}

function Get-LocalPortOwners([int]$Port) {
    $owners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
    if ($owners.Count) { return $owners }
    # The native TCP table can lag immediately after a listener opens.
    $listeners = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if (@($listeners | Where-Object { $_.Port -eq $Port }).Count) { return @(0) }
    foreach ($address in @('127.0.0.1','::1')) {
        $client = [Net.Sockets.TcpClient]::new()
        try {
            $connection = $client.ConnectAsync($address, $Port)
            if ($connection.Wait(200) -and $client.Connected) { return @(0) }
        } catch { } finally { $client.Dispose() }
    }
    return @()
}

function Assert-LocalPort([int]$Port, $Record) {
    $owners = @(Get-LocalPortOwners $Port)
    if (-not $owners.Count) { return }
    $allowed = @()
    $managed = Get-VerifiedLocalProcess $Record
    if ($managed) { $allowed = @(Get-LocalProcessFamily $managed | ForEach-Object { $_.Id }) }
    foreach ($ownerId in $owners) {
        if ($ownerId -notin $allowed) {
            if ($ownerId -eq 0 -and $managed) { continue }
            if ($ownerId -eq 0) { throw "Port $Port is in use (PID not yet available). Stop that service or choose another -WebPort/-ApiPort." }
            $ownerProcess = Get-Process -Id $ownerId -ErrorAction SilentlyContinue
            $name = if ($ownerProcess) { $ownerProcess.ProcessName } else { 'unknown' }
            throw "Port $Port is in use by $name (PID $ownerId). Stop that service or choose another -WebPort/-ApiPort."
        }
    }
}

function Read-LocalState([string]$Path, [string]$Project) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try { $state = [IO.File]::ReadAllText($Path) | ConvertFrom-Json } catch { throw "Cannot read launcher state: $Path" }
    if ($state.Version -ne 1 -or -not [string]::Equals($state.Project, $Project, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Launcher state belongs to another workspace or version: $Path"
    }
    foreach ($name in @('Api','Web')) {
        if ($state.$name -and -not $state.$name.PSObject.Properties['Log']) {
            $state.$name | Add-Member -NotePropertyName Log -NotePropertyValue (Join-Path $state.Logs $name.ToLowerInvariant())
        }
    }
    return $state
}

function Save-LocalState([string]$Path, $State) {
    $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
    try {
        [IO.File]::WriteAllText($temporary, ($State | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporary -Destination $Path -Force
    } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
}

function Wait-LocalHttp([string]$Url, $Record, [int]$TimeoutSeconds = 120) {
    $clock = [Diagnostics.Stopwatch]::StartNew()
    while ($clock.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        if (-not (Get-VerifiedLocalProcess $Record)) { throw 'A server exited during startup. Check its logs.' }
        try {
            $response = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { return $response }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    throw "Readiness timed out: $Url"
}

Export-ModuleMember -Function *-Local*, Get-VerifiedLocalProcess
