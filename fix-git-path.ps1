# Fix Git PATH for current PowerShell session
Write-Host "Adding Git to PATH for current session..." -ForegroundColor Yellow

# Add Git to current session PATH
$env:PATH += ";C:\Program Files\Git\mingw64\bin;C:\Program Files\Git\cmd"

Write-Host "Testing Git..." -ForegroundColor Yellow
try {
    git --version
    Write-Host "✅ Git is now working!" -ForegroundColor Green
    Write-Host "You can now use: git add ., git commit, git push, etc." -ForegroundColor Green
} catch {
    Write-Host "❌ Git still not working. Trying alternative path..." -ForegroundColor Red
    $env:PATH += ";C:\Program Files\Git\bin"
    try {
        git --version
        Write-Host "✅ Git is now working with alternative path!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Please restart PowerShell as Administrator and try again." -ForegroundColor Red
    }
}
