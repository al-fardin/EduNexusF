param([string]$SdkPath=(Join-Path $PSScriptRoot '..\release-builds\android-sdk'))
$ErrorActionPreference='Stop'
$adb=Join-Path $SdkPath 'platform-tools\adb.exe'
if(-not(Test-Path -LiteralPath $adb)){[pscustomobject]@{AdbAvailable=$false;ConnectedDevices=0;PhysicalChecksCompleted=$false} | ConvertTo-Json;exit 0}
$devices=@(& $adb devices 2>$null | Select-Object -Skip 1 | Where-Object {$_ -match '^([^\s]+)\s+device$'} | ForEach-Object {($_ -split '\s+')[0]})
if($devices.Count -ne 1){[pscustomobject]@{AdbAvailable=$true;ConnectedDevices=$devices.Count;PhysicalChecksCompleted=$false} | ConvertTo-Json;exit 0}
$device=$devices[0]
$sdk=(& $adb -s $device shell getprop ro.build.version.sdk | Out-String).Trim()
$package=(& $adb -s $device shell dumpsys package com.edunexus.mobile | Out-String)
$installed=$package -match 'versionCode=(\d+)'
$version=if($installed){[int]$Matches[1]}else{0}
$permission=$package -match 'android.permission.POST_NOTIFICATIONS: granted=true'
[pscustomobject]@{AdbAvailable=$true;ConnectedDevices=1;AndroidApi=$sdk;AppInstalled=$installed;InstalledVersionCode=$version;NotificationPermissionGranted=$permission;FirebaseConfigPresent=(Test-Path (Join-Path $PSScriptRoot 'google-services.json'));BackgroundDeliveryVerified=$false;PhysicalChecksCompleted=$false} | ConvertTo-Json
