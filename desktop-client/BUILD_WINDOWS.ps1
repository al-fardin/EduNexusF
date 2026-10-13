$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
py -3 -m pip install -r requirements.txt pyinstaller
if ($LASTEXITCODE -ne 0) { throw 'Dependencies failed' }
py -3 -m PyInstaller --noconfirm --clean --windowed --name EduNexus-Secure-Exam --onefile client.py
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
Write-Host 'Unsigned Windows build: dist\EduNexus-Secure-Exam.exe'
