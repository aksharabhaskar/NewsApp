#!/bin/bash

# setup.sh - Unix/Mac Setup Script for NewsApp

echo -e "\033[36m🚀 Welcome to the NewsApp Setup Wizard!\033[0m"
echo -e "\033[90mThis script will configure your environment and start the application.\033[0m"
echo ""

# 1. Check for Docker
echo -e "\033[33m🔍 Checking for Docker...\033[0m"
if ! command -v docker &> /dev/null; then
    echo -e "\033[31m❌ Docker is not installed! Please install Docker Desktop and try again.\033[0m"
    exit 1
fi
echo -e "\033[32m✅ Docker is installed.\033[0m"

# 2. Check if Docker is running
if ! docker ps &> /dev/null; then
    echo -e "\033[31m❌ Docker is not running! Please start Docker Desktop and try again.\033[0m"
    exit 1
fi

# 3. Setup .env file
ENV_FILE="./.env"
if [ -f "$ENV_FILE" ]; then
    read -p "⚠️  An .env file already exists. Do you want to overwrite it? (y/n) " response
    if [[ "$response" != "y" ]]; then
        echo -e "\033[90mSkipping configuration...\033[0m"
    else
        rm "$ENV_FILE"
    fi
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "\033[33m🔑 We need to set up your API Keys.\033[0m"
    
    while [ -z "$NEWS_API_KEY" ]; do
        read -p "Enter your NewsAPI Key (get it from https://newsapi.org): " NEWS_API_KEY
    done

    while [ -z "$GEMINI_API_KEY" ]; do
        read -p "Enter your Gemini API Key (get it from https://aistudio.google.com): " GEMINI_API_KEY
    done

    cat > "$ENV_FILE" <<EOL
NEWS_API_KEY=$NEWS_API_KEY

# Gemini API for Knowledge Graph
GEMINI_API_KEY=$GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash-exp

MODEL_PATH=./models/model_2_attention.h5
EOL
    echo -e "\033[32m✅ .env file created successfully!\033[0m"
fi

# 4. Stop any existing containers
echo -e "\033[33m🛑 Cleaning up old containers...\033[0m"
docker-compose down 2>/dev/null

# 5. Build and Run
echo -e "\033[36m🏗️  Building and starting NewsApp...\033[0m"
echo -e "\033[90m⚠️  This might take a few minutes the first time.\033[0m"
echo ""
echo -e "\033[32m👉 Once started, access the app at: http://localhost:8085\033[0m"
echo ""

docker-compose up --build
