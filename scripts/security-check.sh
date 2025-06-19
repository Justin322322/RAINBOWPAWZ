#!/bin/bash

# 🔍 RainbowPaws Security Verification Script
# This script checks for common security issues in the codebase

echo "🔍 Running RainbowPaws Security Verification..."
echo "================================================"

# Initialize counters
issues_found=0
warnings_found=0

# Function to report issues
report_issue() {
    echo "❌ $1"
    ((issues_found++))
}

report_warning() {
    echo "⚠️  $1"
    ((warnings_found++))
}

report_success() {
    echo "✅ $1"
}

# Check 1: Hardcoded secrets and credentials
echo "📝 Checking for hardcoded secrets..."
if grep -r "secret.*=" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "JWT_SECRET.*process.env" | grep -v "// Comment" > /dev/null; then
    report_issue "Found potential hardcoded secrets:"
    grep -r "secret.*=" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "JWT_SECRET.*process.env" | head -5
else
    report_success "No hardcoded secrets found"
fi

# Check 2: Default JWT secret usage
echo ""
echo "🔑 Checking JWT configuration..."
if grep -r "your-super-secret-jwt-key-change-this-in-production" src/ > /dev/null; then
    report_issue "Default JWT secret found - must be changed for production"
else
    report_success "No default JWT secret found"
fi

# Check 3: Console.log statements
echo ""
echo "📋 Checking for console.log statements..."
console_count=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
if [ "$console_count" -gt 0 ]; then
    report_warning "Found $console_count console.log statements (should be removed for production)"
    echo "   Top files with console.log:"
    grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" -l | head -5 | sed 's/^/   - /'
else
    report_success "No console.log statements found"
fi

# Check 4: TODO/FIXME items
echo ""
echo "📝 Checking for TODO/FIXME items..."
todo_count=$(grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
if [ "$todo_count" -gt 0 ]; then
    report_warning "Found $todo_count TODO/FIXME items"
    echo "   Recent items:"
    grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" -n | head -3 | sed 's/^/   - /'
else
    report_success "No TODO/FIXME items found"
fi

# Check 5: Eval usage (dangerous)
echo ""
echo "⚠️  Checking for eval() usage..."
if grep -r "eval(" src/ > /dev/null; then
    report_issue "Found eval() usage - security risk!"
    grep -r "eval(" src/ -n
else
    report_success "No eval() usage found"
fi

# Check 6: SQL injection patterns
echo ""
echo "💉 Checking for potential SQL injection patterns..."
if grep -r "query.*+\|SELECT.*+\|INSERT.*+\|UPDATE.*+\|DELETE.*+" src/ --include="*.ts" --include="*.js" | grep -v "// Comment" > /dev/null; then
    report_warning "Found potential string concatenation in SQL queries:"
    grep -r "query.*+\|SELECT.*+\|INSERT.*+\|UPDATE.*+\|DELETE.*+" src/ --include="*.ts" --include="*.js" | head -3
else
    report_success "No SQL injection patterns detected"
fi

# Check 7: CORS configuration
echo ""
echo "🌐 Checking CORS configuration..."
if grep -r "Access-Control-Allow-Origin.*\*" src/ > /dev/null; then
    report_warning "Found overly permissive CORS configuration (Allow-Origin: *)"
else
    report_success "No overly permissive CORS found"
fi

# Check 8: Environment variable usage
echo ""
echo "🔧 Checking environment variable usage..."
env_vars_without_fallback=$(grep -r "process\.env\." src/ --include="*.ts" --include="*.js" | grep -v "||" | wc -l)
if [ "$env_vars_without_fallback" -gt 5 ]; then
    report_warning "Found $env_vars_without_fallback environment variables without fallbacks"
fi

# Check 9: Password handling
echo ""
echo "🔒 Checking password handling..."
if grep -r "password.*=" src/ | grep -v "bcrypt\|hash\|encrypt" | grep -v "// Comment" > /dev/null; then
    report_warning "Found potential plaintext password handling"
else
    report_success "Password handling appears secure"
fi

# Check 10: File upload security
echo ""
echo "📁 Checking file upload security..."
if grep -r "multer\|upload" src/ > /dev/null; then
    if grep -r "fileFilter\|limits" src/ > /dev/null; then
        report_success "File upload security measures found"
    else
        report_warning "File uploads found but security measures unclear"
    fi
fi

# Summary
echo ""
echo "================================================"
echo "🏁 Security Check Summary"
echo "================================================"
echo "Issues Found: $issues_found"
echo "Warnings: $warnings_found"

if [ "$issues_found" -eq 0 ]; then
    echo "✅ No critical security issues found!"
else
    echo "❌ Critical security issues need immediate attention!"
fi

if [ "$warnings_found" -eq 0 ]; then
    echo "✅ No warnings!"
else
    echo "⚠️  $warnings_found warnings should be reviewed"
fi

# Exit with error code if critical issues found
if [ "$issues_found" -gt 0 ]; then
    exit 1
else
    exit 0
fi 