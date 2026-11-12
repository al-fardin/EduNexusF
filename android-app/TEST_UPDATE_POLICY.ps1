param()
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot
$output=Join-Path $root 'release-builds\android-update-tests'
New-Item -ItemType Directory -Path $output -Force | Out-Null
& javac -encoding UTF-8 --release 8 -d $output (Join-Path $PSScriptRoot 'src\com\edunexus\mobile\UpdatePolicy.java') (Join-Path $PSScriptRoot 'tests\UpdatePolicyTest.java')
if($LASTEXITCODE -ne 0){throw 'Update policy test compilation failed.'}
& java -cp $output com.edunexus.mobile.UpdatePolicyTest
if($LASTEXITCODE -ne 0){throw 'Update policy boundary checks failed.'}
