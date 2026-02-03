# Test all Edge Functions end-to-end
# Run this script after deploying: .\test-edge-functions.ps1

Set-Location -LiteralPath $PSScriptRoot

$ProgressPreference = 'SilentlyContinue'
$base = 'https://slbzwylbnzzarrxejpql.supabase.co/functions/v1'
$envText = Get-Content -Raw .env.local

$admin = ([regex]::Match($envText, '(?m)^VITE_ADMIN_TOKEN=(.+)$')).Groups[1].Value.Trim()
$anon = ([regex]::Match($envText, '(?m)^VITE_SUPABASE_ANON_KEY=(.+)$')).Groups[1].Value.Trim()
$orgId = ([regex]::Match($envText, '(?m)^VITE_ORG_ID=(.+)$')).Groups[1].Value.Trim()
$att = ([regex]::Match($envText, '(?m)^VITE_PORTAL_ATTENDANCE_TOKEN=(.+)$')).Groups[1].Value.Trim()
$app = ([regex]::Match($envText, '(?m)^VITE_PORTAL_APPLICATIONS_TOKEN=(.+)$')).Groups[1].Value.Trim()

$commonHeaders = @{ 'apikey' = $anon; 'Authorization' = "Bearer $anon" }

function Invoke-EdgeJson {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][hashtable]$Headers,
        $BodyObj
    )
    try {
        if ($null -ne $BodyObj) {
            $body = $BodyObj | ConvertTo-Json -Depth 10 -Compress
            $r = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $body -UseBasicParsing
        }
        else {
            $r = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
        }
        [PSCustomObject]@{ ok = $true; status = $r.StatusCode; body = $r.Content }
    }
    catch {
        $status = $null
        $content = $null
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { }
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $content = $reader.ReadToEnd()
            }
            catch { }
        }
        [PSCustomObject]@{ ok = $false; status = $status; error = $_.Exception.Message; body = $content }
    }
}

Write-Host "`n=== Testing Edge Functions ===" -ForegroundColor Cyan

Write-Host "`n1. Health Check..." -ForegroundColor Yellow
$health = Invoke-EdgeJson -Method 'GET' -Url "$base/admin-rh/health" -Headers ($commonHeaders + @{ 'x-admin-token' = $admin })
if ($health.ok) {
    Write-Host "   ✓ Health OK" -ForegroundColor Green
}
else {
    Write-Host "   ✗ Health FAILED: $($health.body)" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Creating test employee..." -ForegroundColor Yellow
$hire = Invoke-EdgeJson -Method 'POST' -Url "$base/admin-rh/employees" -Headers ($commonHeaders + @{ 'x-admin-token' = $admin }) -BodyObj @{
    name     = 'Empleado Test'
    dpi      = '9876543210987'
    phone    = '5555-9999'
    position = 'CARPINTERO'
    salary   = 3500
}

if ($hire.ok) {
    $hireData = $hire.body | ConvertFrom-Json
    Write-Host "   ✓ Employee created: $($hireData.workerId)" -ForegroundColor Green
    $workerId = $hireData.workerId
}
else {
    Write-Host "   ✗ Employee creation FAILED: $($hire.body)" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Marking attendance (EMERGENCY mode)..." -ForegroundColor Yellow
$attRes = Invoke-EdgeJson -Method 'POST' -Url "$base/mark-attendance" -Headers ($commonHeaders + @{ 'x-portal-token' = $att; 'x-admin-token' = $admin }) -BodyObj @{
    orgId       = $orgId
    workerId    = $workerId
    lat         = 14.6349
    lng         = -90.5069
    method      = 'EMERGENCY'
    deviceLabel = 'PowerShell-AutoTest'
}

if ($attRes.ok) {
    $attData = $attRes.body | ConvertFrom-Json
    Write-Host "   ✓ Attendance marked: $($attData.employeeName) on $($attData.day)" -ForegroundColor Green
}
else {
    Write-Host "   ✗ Attendance FAILED: $($attRes.body)" -ForegroundColor Red
}

Write-Host "`n4. Submitting contract application..." -ForegroundColor Yellow
$appRes = Invoke-EdgeJson -Method 'POST' -Url "$base/submit-contract" -Headers ($commonHeaders + @{ 'x-portal-token' = $app }) -BodyObj @{
    orgId           = $orgId
    name            = 'Candidato AutoTest'
    phone           = '5555-8888'
    dpi             = '1111111111111'
    experience      = 'Test automation experience'
    positionApplied = 'ELECTRICISTA'
}

if ($appRes.ok) {
    $appData = $appRes.body | ConvertFrom-Json
    Write-Host "   ✓ Application submitted: $($appData.applicationId)" -ForegroundColor Green
}
else {
    Write-Host "   ✗ Application FAILED: $($appRes.body)" -ForegroundColor Red
}

Write-Host "`n5. Listing employees..." -ForegroundColor Yellow
$empList = Invoke-EdgeJson -Method 'GET' -Url "$base/admin-rh/employees" -Headers ($commonHeaders + @{ 'x-admin-token' = $admin })
if ($empList.ok) {
    $empData = $empList.body | ConvertFrom-Json
    Write-Host "   ✓ Total employees: $($empData.employees.Count)" -ForegroundColor Green
}
else {
    Write-Host "   ✗ List employees FAILED" -ForegroundColor Red
}

Write-Host "`n6. Listing applications..." -ForegroundColor Yellow
$appListRes = Invoke-EdgeJson -Method 'GET' -Url "$base/admin-rh/applications" -Headers ($commonHeaders + @{ 'x-admin-token' = $admin })
if ($appListRes.ok) {
    $appListData = $appListRes.body | ConvertFrom-Json
    Write-Host "   ✓ Total applications: $($appListData.applications.Count)" -ForegroundColor Green
}
else {
    Write-Host "   ✗ List applications FAILED" -ForegroundColor Red
}

Write-Host "`n=== All tests completed ===" -ForegroundColor Cyan
