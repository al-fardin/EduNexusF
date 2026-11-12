param([string]$ServerUrl='', [string]$SdkPath=(Join-Path $PSScriptRoot '..\release-builds\android-sdk'))
$ErrorActionPreference='Stop'
$validOrigin=$false
try {$origin=[Uri]$ServerUrl;$validOrigin=$origin.IsAbsoluteUri -and $origin.Scheme -eq 'https' -and -not $origin.UserInfo -and -not $origin.Query -and -not $origin.Fragment -and $origin.AbsolutePath -eq '/'}catch{}
$signing=[bool]($env:EDUNEXUS_ANDROID_KEYSTORE -and (Test-Path -LiteralPath $env:EDUNEXUS_ANDROID_KEYSTORE) -and $env:EDUNEXUS_ANDROID_STOREPASS -and $env:EDUNEXUS_ANDROID_KEYPASS)
$firebase=Test-Path -LiteralPath (Join-Path $PSScriptRoot 'google-services.json')
$tools=Test-Path -LiteralPath (Join-Path $SdkPath 'build-tools\36.0.0\apksigner.bat')
[pscustomobject]@{HttpsOriginConfigured=$validOrigin;ReleaseSigningConfigured=$signing;FirebaseFilePresent=$firebase;AndroidBuildToolsPresent=$tools;ReleaseInputsPresent=($validOrigin -and $signing -and $tools);PushInputsPresent=($firebase -and $validOrigin);ReleaseArtifactVerified=$false;BackgroundDeliveryVerified=$false} | ConvertTo-Json
