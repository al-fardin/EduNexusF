param(
 [string]$SdkPath = (Join-Path $PSScriptRoot '..\release-builds\android-sdk'),
 [string]$ServerUrl = '',
 [switch]$Release,
 [string]$Keystore = '',
 [string]$KeyAlias = 'edunexus'
)
$ErrorActionPreference='Stop'
$SdkPath=[IO.Path]::GetFullPath($SdkPath)
# Oracle's javapath exposes javac but not keytool. Resolve the actual JDK.
$javaHome = $env:JAVA_HOME
if (-not $javaHome) {
 $javaProperties = (& java -XshowSettings:properties -version 2>&1 | Out-String)
 if ($javaProperties -match 'java.home = ([^\r\n]+)') { $javaHome=$Matches[1].Trim() }
}
if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\keytool.exe'))) { throw 'A complete JDK is required (set JAVA_HOME).' }

if (-not $ServerUrl) {
 $localAddress=Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback'} | Select-Object -First 1
 if (-not $localAddress) { throw 'Provide -ServerUrl with your workspace address.' }
 $ServerUrl="http://$($localAddress.IPAddress):3000"
}
$parsed=[Uri]$ServerUrl
if (-not $parsed.IsAbsoluteUri -or $parsed.UserInfo -or $parsed.Query -or $parsed.Fragment -or $parsed.AbsolutePath -ne '/') { throw 'Provide the workspace origin only.' }
if ($Release -and $parsed.Scheme -ne 'https') { throw 'Release builds require an HTTPS workspace.' }
if ($parsed.Scheme -notin @('http','https')) { throw 'Unsupported workspace URL.' }
$buildTools=Join-Path $SdkPath 'build-tools\35.0.0'
$androidJar=Join-Path $SdkPath 'platforms\android-35\android.jar'
if (-not (Test-Path $androidJar) -or -not (Test-Path "$buildTools\aapt2.exe")) { throw 'Install Android SDK platform 35 and build-tools 35.0.0 first.' }
$buildPath=Join-Path $PSScriptRoot ('build\'+[Guid]::NewGuid().ToString('N'))
foreach($folder in @('gen','classes','dex')) { New-Item -ItemType Directory -Path (Join-Path $buildPath $folder) -Force | Out-Null }
$manifest=[xml][IO.File]::ReadAllText((Join-Path $PSScriptRoot 'AndroidManifest.xml'))
$manifest.manifest.application.SetAttribute('usesCleartextTraffic','http://schemas.android.com/apk/res/android',(-not $Release).ToString().ToLower())
$manifest.manifest.application.SetAttribute('debuggable','http://schemas.android.com/apk/res/android',(-not $Release).ToString().ToLower())
$manifest.Save((Join-Path $buildPath 'AndroidManifest.xml'))
$localTest=(-not $Release).ToString().ToLower()
$escapedUrl=$ServerUrl.TrimEnd('/').Replace('\','\\').Replace('"','\"')
$config="package com.edunexus.mobile; public final class Config { public static final String SERVER_URL = `"$escapedUrl`"; public static final boolean LOCAL_TEST = $localTest; }"
[IO.File]::WriteAllText((Join-Path $buildPath 'gen\Config.java'),$config)
& "$buildTools\aapt2.exe" compile --dir (Join-Path $PSScriptRoot 'res') -o "$buildPath\compiled.zip"
if($LASTEXITCODE -ne 0){throw 'Android resource compilation failed'}
& "$buildTools\aapt2.exe" link -o "$buildPath\resources.apk" -I $androidJar --manifest "$buildPath\AndroidManifest.xml" --java "$buildPath\gen" -R "$buildPath\compiled.zip" --min-sdk-version 24 --target-sdk-version 35 --version-code 5 --version-name '1.3.1' --auto-add-overlay
if($LASTEXITCODE -ne 0){throw 'Android resource linking failed'}
$sources=@(Get-ChildItem (Join-Path $PSScriptRoot 'src'),"$buildPath\gen" -Filter '*.java' -Recurse | ForEach-Object FullName)
& (Join-Path $javaHome 'bin\javac.exe') -encoding UTF-8 --release 8 -classpath $androidJar -d "$buildPath\classes" @sources
if($LASTEXITCODE -ne 0){throw 'Android Java compilation failed'}
$classes=@(Get-ChildItem "$buildPath\classes" -Filter '*.class' -Recurse | ForEach-Object FullName)
& "$buildTools\d8.bat" --min-api 24 --lib $androidJar --output "$buildPath\dex" @classes
if($LASTEXITCODE -ne 0){throw 'Android DEX compilation failed'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::Open("$buildPath\resources.apk",[IO.Compression.ZipArchiveMode]::Update)
try{Get-ChildItem "$buildPath\dex" -Filter '*.dex' | ForEach-Object {[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$_.FullName,$_.Name) | Out-Null}}finally{$zip.Dispose()}
& "$buildTools\zipalign.exe" -f 4 "$buildPath\resources.apk" "$buildPath\aligned.apk"
if($LASTEXITCODE -ne 0){throw 'APK alignment failed'}
if(-not $Release){$keyFolder=Join-Path $PSScriptRoot '.keys';New-Item -ItemType Directory -Path $keyFolder -Force | Out-Null;$Keystore=Join-Path $keyFolder 'debug.keystore';if(-not(Test-Path $Keystore)){& (Join-Path $javaHome 'bin\keytool.exe') -genkeypair -keystore $Keystore -storepass android -keypass android -alias $KeyAlias -dname 'CN=EduNexus Debug' -keyalg RSA -keysize 2048 -validity 3650;if($LASTEXITCODE -ne 0){throw 'Debug key creation failed'}};$env:EDUNEXUS_ANDROID_STOREPASS='android';$env:EDUNEXUS_ANDROID_KEYPASS='android'}
if(-not $Keystore -or -not $env:EDUNEXUS_ANDROID_STOREPASS -or -not $env:EDUNEXUS_ANDROID_KEYPASS){throw 'Provide a keystore and signing password environment variables.'}
$output=Join-Path $PSScriptRoot '..\release-builds\android';New-Item -ItemType Directory -Path $output -Force | Out-Null
$apk=Join-Path $output ('EduNexus-'+$(if($Release){'release'}else{'debug'})+'.apk')
& "$buildTools\apksigner.bat" sign --ks $Keystore --ks-key-alias $KeyAlias --ks-pass env:EDUNEXUS_ANDROID_STOREPASS --key-pass env:EDUNEXUS_ANDROID_KEYPASS --out $apk "$buildPath\aligned.apk"
if($LASTEXITCODE -ne 0){throw 'APK signing failed'}
& "$buildTools\apksigner.bat" verify --verbose $apk
if($LASTEXITCODE -ne 0){throw 'APK signature verification failed'}
if(-not $Release){
 $downloads=Join-Path $PSScriptRoot '..\frontend\public\downloads'
 New-Item -ItemType Directory -Path $downloads -Force | Out-Null
 Copy-Item -LiteralPath $apk -Destination (Join-Path $downloads 'EduNexus-debug.apk') -Force
}
Write-Output "Android APK: $([IO.Path]::GetFullPath($apk))"
