param([switch]$Check)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot
$formatter=Join-Path $project 'release-builds\google-java-format.jar'
$digest='697707af07c7753f29cba415c6a76b7882702ff464f807da98b28069b8751910'
if(-not(Test-Path -LiteralPath $formatter)) {
    New-Item -ItemType Directory -Path (Split-Path $formatter) -Force | Out-Null
    Invoke-WebRequest -UseBasicParsing 'https://github.com/google/google-java-format/releases/download/v1.33.0/google-java-format-1.33.0-all-deps.jar' -OutFile $formatter
}
if((Get-FileHash -LiteralPath $formatter -Algorithm SHA256).Hash.ToLowerInvariant() -ne $digest) {throw 'Java formatter checksum mismatch.'}
$sources=Get-ChildItem (Join-Path $PSScriptRoot 'src'),(Join-Path $PSScriptRoot 'firebase-src') -Filter '*.java' -Recurse | Select-Object -ExpandProperty FullName
if($Check){& java -jar $formatter --dry-run --set-exit-if-changed @sources}
else{& java -jar $formatter --replace @sources}
if($LASTEXITCODE -ne 0){throw 'Java formatting check failed.'}
