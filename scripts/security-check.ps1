# RainbowPaws Security Verification Script
# Compatible with PowerShell 5.1+

Write-Host "Running RainbowPaws Security Verification..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Initialize counters
$issuesFound = 0
$warningsFound = 0

# Functions
function Write-SecurityIssue {
    param($message)
    Write-Host "X $message" -ForegroundColor Red
    $script:issuesFound++
}

function Write-SecurityWarning {
    param($message)
    Write-Host "! $message" -ForegroundColor Yellow
    $script:warningsFound++
}

function Write-SecuritySuccess {
    param($message)
    Write-Host "v $message" -ForegroundColor Green
}

# Check 1: Hardcoded secrets
Write-Host "`nChecking for hardcoded secrets..." -ForegroundColor White
Write-Host "--------------------------------" -ForegroundColor White

$secretPatterns = @(
    'password\s*=\s*[''"].*[''"]',
    'secret\s*=\s*[''"].*[''"]',
    'token\s*=\s*[''"].*[''"]',
    'api_key\s*=\s*[''"].*[''"]'
)

$secretsDetected = 0
foreach ($pattern in $secretPatterns) {
    Get-ChildItem -Path "src" -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        $content = Get-Content $_.FullName -ErrorAction SilentlyContinue | Out-String
        if ($content -match $pattern) {
            $secretsDetected++
            Write-SecurityIssue "Potential hardcoded secret in $($_.Name)"
        }
    }
}

if ($secretsDetected -eq 0) {
    Write-SecuritySuccess "No obvious hardcoded secrets found"
}

# Check 2: JWT Implementation
Write-Host "`nChecking JWT implementation..." -ForegroundColor White
Write-Host "------------------------------" -ForegroundColor White

if (Test-Path "src\lib\jwt.ts") {
    $jwtContent = Get-Content "src\lib\jwt.ts" -ErrorAction SilentlyContinue | Out-String
    if ($jwtContent -and $jwtContent -match 'secret.*=.*[''"].*[''"]' -and $jwtContent -notmatch 'process\.env') {
        Write-SecurityIssue "JWT secret appears to be hardcoded in jwt.ts"
    } else {
        Write-SecuritySuccess "JWT secret appears to use environment variables"
    }
} else {
    Write-SecurityWarning "JWT file not found at expected location"
}

# Check 3: Environment variables
Write-Host "`nChecking environment configuration..." -ForegroundColor White
Write-Host "------------------------------------" -ForegroundColor White

if (Test-Path ".env.example") {
    Write-SecuritySuccess ".env.example file exists"
} else {
    Write-SecurityWarning ".env.example file missing"
}

if (Test-Path ".env") {
    Write-SecurityWarning ".env file exists (should be in .gitignore)"
} else {
    Write-SecuritySuccess "No .env file in repository"
}

# Check 4: Console.log statements
Write-Host "`nChecking for console.log statements..." -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor White

$consoleLogCount = 0
Get-ChildItem -Path "src" -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -ErrorAction SilentlyContinue | Out-String
    if ($content) {
        $regexMatches = [regex]::Matches($content, 'console\.log')
        if ($regexMatches.Count -gt 0) {
            $consoleLogCount += $regexMatches.Count
        }
    }
}

if ($consoleLogCount -gt 0) {
    Write-SecurityWarning "Found $consoleLogCount console.log statements (should be removed in production)"
} else {
    Write-SecuritySuccess "No console.log statements found"
}

# Check 5: SQL Injection patterns
Write-Host "`nChecking for SQL injection vulnerabilities..." -ForegroundColor White
Write-Host "--------------------------------------------" -ForegroundColor White

$sqlInjectionCount = 0
$sqlPatterns = @('SELECT.*\$\{', 'INSERT.*\$\{', 'UPDATE.*\$\{', 'DELETE.*\$\{')

Get-ChildItem -Path "src" -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -ErrorAction SilentlyContinue | Out-String
    if ($content) {
        foreach ($sqlPattern in $sqlPatterns) {
            $patternMatches = [regex]::Matches($content, $sqlPattern)
            if ($patternMatches.Count -gt 0) {
                $sqlInjectionCount += $patternMatches.Count
                Write-SecurityIssue "Potential SQL injection in $($_.Name)"
            }
        }
    }
}

if ($sqlInjectionCount -eq 0) {
    Write-SecuritySuccess "No obvious SQL injection vulnerabilities found"
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