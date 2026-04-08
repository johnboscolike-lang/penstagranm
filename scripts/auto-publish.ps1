[CmdletBinding()]
param(
  [string]$Message,
  [switch]$SkipTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Runs a git command and stops immediately when it fails.
function Invoke-GitCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "현재 폴더는 Git 저장소가 아닙니다."
}

Set-Location $repoRoot

$branch = (& git branch --show-current).Trim()
if (-not $branch) {
  throw "현재 브랜치를 확인할 수 없습니다."
}

if (-not $Message) {
  $Message = "자동 커밋 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

if (-not $SkipTests) {
  $packageJsonPath = Join-Path $repoRoot "package.json"
  if (Test-Path -LiteralPath $packageJsonPath) {
    $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
    if ($packageJson.scripts.test) {
      & cmd /c npm run test
      if ($LASTEXITCODE -ne 0) {
        throw "테스트가 실패해서 커밋을 중단했습니다."
      }
    }
  }
}

Invoke-GitCommand -Arguments @("add", "-A")

$status = (& git status --short).Trim()
if (-not $status) {
  Write-Output "변경사항이 없어서 커밋할 내용이 없습니다."
  exit 0
}

Invoke-GitCommand -Arguments @("commit", "-m", $Message)
Invoke-GitCommand -Arguments @("push", "-u", "origin", $branch)

Write-Output "완료: $branch 브랜치가 origin에 푸시되었습니다."
