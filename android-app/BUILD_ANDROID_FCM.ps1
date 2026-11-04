param([string]$ServerUrl='', [string]$SdkPath=(Join-Path $PSScriptRoot '..\release-builds\android-sdk'),[switch]$Release)
$ErrorActionPreference='Stop'
if(-not $ServerUrl){$address=Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback'} | Select-Object -First 1;if(-not $address){throw 'Provide -ServerUrl.'};$ServerUrl="http://$($address.IPAddress):3000"}
$origin=[Uri]$ServerUrl
if(-not $origin.IsAbsoluteUri -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or $origin.AbsolutePath -ne '/' -or $origin.Scheme -notin @('http','https')){throw 'Provide a workspace origin.'}
if($Release -and $origin.Scheme -ne 'https'){throw 'Release builds require HTTPS.'}
if($Release -and (-not $env:EDUNEXUS_ANDROID_KEYSTORE -or -not $env:EDUNEXUS_ANDROID_STOREPASS -or -not $env:EDUNEXUS_ANDROID_KEYPASS)){throw 'Set the release keystore and signing password environment variables.'}
if(-not $Release){
 $debugKey=Join-Path $PSScriptRoot '.keys\debug.keystore'
 if(-not(Test-Path -LiteralPath $debugKey)){
  New-Item -ItemType Directory -Path (Split-Path $debugKey) -Force | Out-Null
  $javaProperties=(& java -XshowSettings:properties -version 2>&1 | Out-String)
  if($javaProperties -notmatch 'java.home = ([^\r\n]+)'){throw 'A complete JDK is required.'}
  $keytool=Join-Path $Matches[1].Trim() 'bin\keytool.exe'
  & $keytool -genkeypair -keystore $debugKey -storepass android -keypass android -alias edunexus -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=EduNexus Debug'
  if($LASTEXITCODE -ne 0){throw 'Could not create the local debug signing key.'}
 }
}
$gradle=Join-Path $PSScriptRoot '..\release-builds\gradle-runtime\gradle-9.1.0\bin\gradle.bat'
if(-not(Test-Path $gradle)){throw 'Install Gradle 9.1.0 or use the Android release workflow.'}
$env:ANDROID_HOME=[IO.Path]::GetFullPath($SdkPath)
$env:GRADLE_USER_HOME=Join-Path $PSScriptRoot '..\release-builds\gradle-cache'
$variant=if($Release){'Release'}else{'Debug'}
$javaTemporary=Join-Path $PSScriptRoot '..\release-builds\java-tmp'
New-Item -ItemType Directory -Path $javaTemporary -Force | Out-Null
$javaTemporary=[IO.Path]::GetFullPath($javaTemporary)
$previousJavaOptions=$env:JAVA_TOOL_OPTIONS
$env:JAVA_TOOL_OPTIONS=($previousJavaOptions+' -Djdk.net.unixdomain.tmpdir="'+$javaTemporary+'" -Djava.io.tmpdir="'+$javaTemporary+'"').Trim()
Push-Location $PSScriptRoot
try{& $gradle --no-daemon "assemble$variant" "-PworkspaceUrl=$($ServerUrl.TrimEnd('/'))" "-PlocalTesting=$((-not $Release).ToString().ToLowerInvariant())";if($LASTEXITCODE -ne 0){throw 'Android build failed.'}}finally{Pop-Location;$env:JAVA_TOOL_OPTIONS=$previousJavaOptions}
$source=Join-Path $PSScriptRoot ('build\outputs\apk\'+$variant.ToLowerInvariant()+'\EduNexusAndroid-'+$variant.ToLowerInvariant()+'.apk')
if(-not(Test-Path $source)){$source=(Get-ChildItem (Join-Path $PSScriptRoot ('build\outputs\apk\'+$variant.ToLowerInvariant())) -Filter '*.apk' | Select-Object -First 1).FullName}
$output=Join-Path $PSScriptRoot '..\release-builds\android';New-Item -ItemType Directory -Path $output -Force | Out-Null
$name='EduNexus-'+$variant.ToLowerInvariant()+'.apk';$target=Join-Path $output $name;Copy-Item -LiteralPath $source -Destination $target -Force
& (Join-Path $env:ANDROID_HOME 'build-tools\36.0.0\apksigner.bat') verify --verbose $target
if($LASTEXITCODE -ne 0){throw 'APK signature verification failed.'}
$downloads=Join-Path $PSScriptRoot '..\frontend\public\downloads';New-Item -ItemType Directory -Path $downloads -Force | Out-Null;Copy-Item -LiteralPath $target -Destination (Join-Path $downloads $name) -Force
Write-Output "Android APK: $([IO.Path]::GetFullPath($target))"
