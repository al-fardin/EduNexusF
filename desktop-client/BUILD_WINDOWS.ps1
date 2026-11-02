$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
py -3 -m pip install -r requirements.txt pyinstaller
if ($LASTEXITCODE -ne 0) { throw 'Dependencies failed' }
py -3 -m PyInstaller --noconfirm --clean --windowed --name EduNexus-Secure-Exam --onefile --icon assets/icon.ico --add-data "assets;assets" client.py
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
Copy-Item -LiteralPath 'dist\EduNexus-Secure-Exam.exe' -Destination '..\frontend\public\downloads\EduNexus-Secure-Exam.exe' -Force
Write-Host 'Windows app built and frontend download updated (unsigned).'
