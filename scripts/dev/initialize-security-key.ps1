$ErrorActionPreference='Stop'
$project=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$path=Join-Path $project '.env'
if(-not(Test-Path -LiteralPath $path)){throw 'Create the workspace .env before initializing account security.'}
$text=[IO.File]::ReadAllText($path)
$line=[regex]::Match($text,'(?m)^MFA_ENCRYPTION_KEY=([^\r\n]*)')
if($line.Success -and $line.Groups[1].Value.Trim()) {Write-Output 'Existing authenticator encryption key preserved.';exit 0}
$bytes=New-Object byte[] 32
$random=[Security.Cryptography.RandomNumberGenerator]::Create()
try{$random.GetBytes($bytes)}finally{$random.Dispose()}
$setting='MFA_ENCRYPTION_KEY='+[Convert]::ToBase64String($bytes)
if($line.Success){$text=$text.Remove($line.Index,$line.Length).Insert($line.Index,$setting)}else{$text=$text.TrimEnd()+[Environment]::NewLine+$setting+[Environment]::NewLine}
[IO.File]::WriteAllText($path,$text,[Text.UTF8Encoding]::new($false))
Write-Output 'Local authenticator encryption key initialized. Keep a private backup with the database; never commit or replace it during an app update.'
