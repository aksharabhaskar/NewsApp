# setup.ps1 - NewsApp Automated Setup Script
$ErrorActionPreference = "Stop"

Write-Host "🚀 Welcome to the NewsApp Setup Wizard!" -ForegroundColor Cyan
Write-Host "This script will configure your environment and start the application." -ForegroundColor Gray
Write-Host ""

# 1. Check for Docker
Write-Host "🔍 Checking for Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
    Write-Host "✅ Docker is installed." -ForegroundColor Green
} catch {
    Write-Error "❌ Docker is irrelevant or not found! Please install Docker Desktop and try again."
    exit 1
}

# 2. Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Error "❌ Docker is not running! Please start Docker Desktop and try again."
    exit 1
}

# 3. Setup .env file
$envFile = "$PSScriptRoot\.env"
if (Test-Path $envFile) {
    $response = Read-Host "⚠️  An .env file already exists. Do you want to overwrite it? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Skipping configuration..." -ForegroundColor Gray
    } else {
        Remove-Item $envFile
    }
}

if (-not (Test-Path $envFile)) {
    Write-Host "🔑 We need to set up your API Keys." -ForegroundColor Yellow
    
    $newsApiKey = Read-Host "Enter your NewsAPI Key (get it from https://newsapi.org)"
    while ([string]::IsNullOrWhiteSpace($newsApiKey)) {
        $newsApiKey = Read-Host "❌ Key cannot be empty. Enter your NewsAPI Key"
    }

    $geminiApiKey = Read-Host "Enter your Gemini API Key (get it from https://aistudio.google.com)"
    while ([string]::IsNullOrWhiteSpace($geminiApiKey)) {
        $geminiApiKey = Read-Host "❌ Key cannot be empty. Enter your Gemini API Key"
    }

    $envContent = @"
NEWS_API_KEY=$newsApiKey

# Gemini API for Knowledge Graph
GEMINI_API_KEY=$geminiApiKey
GEMINI_MODEL=gemini-2.0-flash-exp

MODEL_PATH=./models/model_2_attention.h5
"@
    
    Set-Content -Path $envFile -Value $envContent
    Write-Host "✅ .env file created successfully!" -ForegroundColor Green
}

# 4. Stop any existing containers to avoid port conflicts
Write-Host "🛑 Cleaning up old containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# 5. Build and Run
Write-Host "🏗️  Building and starting NewsApp..." -ForegroundColor Cyan
Write-Host "⚠️  This might take a few minutes the first time." -ForegroundColor Gray
Write-Host ""
Write-Host "👉 Once started, access the app at: http://localhost:8085" -ForegroundColor Green
Write-Host ""

docker-compose up --build
