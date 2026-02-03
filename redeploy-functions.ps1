# Redeploy Edge Functions after code updates
# Run this script in your terminal with: .\redeploy-functions.ps1

Set-Location -LiteralPath $PSScriptRoot

Write-Host "Deploying submit-contract..." -ForegroundColor Cyan
supabase functions deploy submit-contract

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy submit-contract" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying mark-attendance..." -ForegroundColor Cyan
supabase functions deploy mark-attendance

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy mark-attendance" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll functions deployed successfully!" -ForegroundColor Green
Write-Host "Run test-edge-functions.ps1 to validate the endpoints." -ForegroundColor Yellow
