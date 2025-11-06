# PowerShell script to create a clean zip file of BankSphere project
# Run this script from the banksphere-main directory

Write-Host "🏦 Creating BankSphere Project Zip..." -ForegroundColor Cyan

# Define the zip file name with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$zipName = "BankSphere-Banking-System-$timestamp.zip"

# Files and folders to exclude from zip
$excludeItems = @(
    "node_modules",
    ".vscode",
    "*.log",
    "create-zip.ps1",
    "*.zip"
)

# Create temporary directory for clean copy
$tempDir = "BankSphere-Clean-Temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "📁 Copying project files..." -ForegroundColor Yellow

# Copy all files except excluded ones
Get-ChildItem -Path "." | Where-Object {
    $item = $_
    $shouldExclude = $false
    foreach ($exclude in $excludeItems) {
        if ($item.Name -like $exclude) {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
} | Copy-Item -Destination $tempDir -Recurse -Force

Write-Host "🗜️ Creating zip file..." -ForegroundColor Yellow

# Create zip file
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ Zip file created: $zipName" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Package Contents:" -ForegroundColor Cyan
Write-Host "   • Complete banking system with Node.js + MySQL" -ForegroundColor White
Write-Host "   • Admin and Customer dashboards" -ForegroundColor White
Write-Host "   • 3 Advanced features: Crypto, AI Fraud Detection, AI Assistant" -ForegroundColor White
Write-Host "   • Enterprise security and authentication" -ForegroundColor White
Write-Host "   • Ready to run with 'npm install' and 'node init_database.js'" -ForegroundColor White
Write-Host ""
Write-Host "🚀 To use:" -ForegroundColor Cyan
Write-Host "   1. Extract the zip file" -ForegroundColor White
Write-Host "   2. Run: npm install" -ForegroundColor White
Write-Host "   3. Update .env with your MySQL credentials" -ForegroundColor White
Write-Host "   4. Run: node init_database.js" -ForegroundColor White
Write-Host "   5. Run: npm start" -ForegroundColor White
Write-Host "   6. Open: http://localhost:3000" -ForegroundColor White

Write-Host ""
Write-Host "🎯 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Admin: admin / admin123" -ForegroundColor Yellow
Write-Host "   Customer: john_doe / password123" -ForegroundColor Yellow