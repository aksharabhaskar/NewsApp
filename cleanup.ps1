# Cleanup script for NewsApp project
# This script removes unnecessary files before dockerization

Write-Host "Starting cleanup process..." -ForegroundColor Cyan

# Remove documentation files (except main README and Docker README)
$docsToRemove = @(
    "FINAL_OPTIMIZATION_SUMMARY.md",
    "FUNCTIONALITY_VERIFICATION.md",
    "GEMINI_REPLACEMENT_SUMMARY.md",
    "GOOGLE_SEARCH_INTEGRATION.md",
    "INTEGRATION_SUMMARY.md",
    "NEO4J_INTEGRATION.md",
    "PROJECT_COMPREHENSIVE_SUMMARY.md",
    "QUICK_REFERENCE.md",
    "REPLACEMENT_QUICK_GUIDE.md",
    "SETUP.md"
)

foreach ($doc in $docsToRemove) {
    if (Test-Path $doc) {
        Remove-Item $doc -Force
        Write-Host "Removed: $doc" -ForegroundColor Green
    }
}

# Remove test files
$testFilesToRemove = @(
    "fake-news-chat.py",
    "test_connection.py"
)

foreach ($file in $testFilesToRemove) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

# Remove test directory
if (Test-Path "kg_test") {
    Remove-Item "kg_test" -Recurse -Force
    Write-Host "Removed: kg_test/" -ForegroundColor Green
}

# Remove backend venv (keep root .venv for local development)
if (Test-Path "backend\venv") {
    Remove-Item "backend\venv" -Recurse -Force
    Write-Host "Removed: backend/venv/" -ForegroundColor Green
}

# Remove __pycache__ directories
Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Write-Host "Removed: $($_.FullName)" -ForegroundColor Green
}

# Remove node_modules (will be rebuilt in Docker)
if (Test-Path "news-frontend\node_modules") {
    Write-Host "Removing node_modules (will be rebuilt in Docker)..." -ForegroundColor Yellow
    Remove-Item "news-frontend\node_modules" -Recurse -Force
    Write-Host "Removed: news-frontend/node_modules/" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Project is now ready for dockerization" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env with your GEMINI_API_KEY" -ForegroundColor White
Write-Host "2. Run: docker-compose up --build" -ForegroundColor White
Write-Host ""
