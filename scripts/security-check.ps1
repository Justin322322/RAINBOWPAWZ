# RainbowPaws Security Verification Script (PowerShell)
# This script checks for common security issues in the codebase

Write-Host "Running RainbowPaws Security Verification..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Initialize counters
$issuesFound = 0
$warningsFound = 0

# Function to report issues
function Report-Issue {
    param($message)
    Write-Host "X $message" -ForegroundColor Red
    $script:issuesFound++
}

function Report-Warning {
    param($message)
    Write-Host "! $message" -ForegroundColor Yellow
    $script:warningsFound++
}

function Report-Success {
    param($message)
    Write-Host "✓ $message" -ForegroundColor Green
}

# Check 1: Hardcoded secrets and credentials
Write-Host "`nChecking for hardcoded secrets..." -ForegroundColor White
Write-Host "--------------------------------" -ForegroundColor White

$secretPatterns = @(
    "password\s*=\s*['\"].*['\"]",
    "secret\s*=\s*['\"].*['\"]",
    "token\s*=\s*['\"].*['\"]",
    "api_key\s*=\s*['\"].*['\"]"
)

$foundSecrets = $false
foreach ($pattern in $secretPatterns) {
    $results = Select-String -Path "src\*.ts", "src\*.tsx", "src\*.js", "src\*.jsx" -Pattern $pattern -Recurse -ErrorAction SilentlyContinue
    if ($results) {
        $foundSecrets = $true
        foreach ($result in $results) {
            Report-Issue "Potential hardcoded secret in $($result.Filename):$($result.LineNumber)"
        }
    }
}

if (-not $foundSecrets) {
    Report-Success "No obvious hardcoded secrets found"
}

# Check 2: JWT Implementation
Write-Host "`nChecking JWT implementation..." -ForegroundColor White
Write-Host "------------------------------" -ForegroundColor White

if (Test-Path "src\lib\jwt.ts") {
    $jwtContent = Get-Content "src\lib\jwt.ts" -Raw
    if ($jwtContent -match "secret.*=.*['\"].*['\"]" -and $jwtContent -notmatch "process\.env") {
        Report-Issue "JWT secret appears to be hardcoded in jwt.ts"
    } else {
        Report-Success "JWT secret appears to use environment variables"
    }
} else {
    Report-Warning "JWT file not found at expected location"
}

# Check 3: Environment variables
Write-Host "`nChecking environment configuration..." -ForegroundColor White
Write-Host "------------------------------------" -ForegroundColor White

if (Test-Path ".env.example") {
    Report-Success ".env.example file exists"
} else {
    Report-Warning ".env.example file missing"
}

if (Test-Path ".env") {
    Report-Warning ".env file exists (should be in .gitignore)"
} else {
    Report-Success "No .env file in repository"
}

# Check 4: SQL Injection prevention
Write-Host "`nChecking for SQL injection vulnerabilities..." -ForegroundColor White
Write-Host "--------------------------------------------" -ForegroundColor White

$sqlConcatenation = Select-String -Path "src\*.ts", "src\*.tsx", "src\*.js", "src\*.jsx" -Pattern "\`SELECT.*\$\{|\`INSERT.*\$\{|\`UPDATE.*\$\{|\`DELETE.*\$\{" -Recurse -ErrorAction SilentlyContinue
if ($sqlConcatenation) {
    foreach ($result in $sqlConcatenation) {
        Report-Issue "Possible SQL injection vulnerability in $($result.Filename):$($result.LineNumber)"
    }
} else {
    Report-Success "No obvious SQL injection vulnerabilities found"
}

# Check 5: Console.log statements
Write-Host "`nChecking for console.log statements..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White

$consoleLogs = Select-String -Path "src\*.ts", "src\*.tsx", "src\*.js", "src\*.jsx" -Pattern "console\.log" -Recurse -ErrorAction SilentlyContinue
if ($consoleLogs) {
    $logCount = ($consoleLogs | Measure-Object).Count
    Report-Warning "Found $logCount console.log statements (should be removed in production)"
} else {
    Report-Success "No console.log statements found"
}

# Summary
Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "SECURITY SCAN SUMMARY" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Issues Found: $issuesFound" -ForegroundColor $(if ($issuesFound -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings: $warningsFound" -ForegroundColor $(if ($warningsFound -gt 0) { "Yellow" } else { "Green" })

if ($issuesFound -gt 0) {
    Write-Host "`nACTION REQUIRED: Address critical security issues before deployment" -ForegroundColor Red
    exit 1
} elseif ($warningsFound -gt 0) {
    Write-Host "`nRECOMMENDATION: Review warnings and implement improvements" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`nEXCELLENT: No critical security issues detected" -ForegroundColor Green
    exit 0
} 