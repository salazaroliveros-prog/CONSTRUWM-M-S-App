# Fix Node/NPM PATH (permanent)
# - Repairs a common NVM4W PATH corruption: "C:\nvm4w\nodejsC:\..." (missing ';')
# - Updates USER environment PATH (no admin required)
#
# Run in PowerShell:
#   .\fix-node-path.ps1
# Then close and reopen VS Code / terminals.

$ErrorActionPreference = 'Stop'

function Fix-PathString([string]$p) {
  if (-not $p) { return $p }
  # Insert missing ';' after the NVM symlink path if it is glued to the next segment.
  return [regex]::Replace($p, '(?i)(C:\\nvm4w\\nodejs)(?=c?:)', '$1;')
}

$userPath = [Environment]::GetEnvironmentVariable('Path','User')
$machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')

$userGlueBefore = [regex]::IsMatch($userPath ?? '', '(?i)C:\\nvm4w\\nodejs(?=c?:)')
$machineGlueBefore = [regex]::IsMatch($machinePath ?? '', '(?i)C:\\nvm4w\\nodejs(?=c?:)')

$newUser = Fix-PathString $userPath
$newMachine = Fix-PathString $machinePath

if ($newUser -ne $userPath) {
  [Environment]::SetEnvironmentVariable('Path', $newUser, 'User')
  Write-Output 'USER PATH fixed.'
} else {
  Write-Output 'USER PATH already OK.'
}

if ($newMachine -ne $machinePath) {
  Write-Output 'MACHINE PATH also appears to be corrupted. To fix it, re-run this script in an Administrator PowerShell.'
}

Write-Output "userGlueBefore=$userGlueBefore userGlueAfter=$([regex]::IsMatch(([Environment]::GetEnvironmentVariable('Path','User') ?? ''), '(?i)C:\\nvm4w\\nodejs(?=c?:)'))"
Write-Output "machineGlueBefore=$machineGlueBefore"
Write-Output 'Close and reopen VS Code/terminals so PATH reloads.'
