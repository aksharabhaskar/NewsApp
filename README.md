# NewsApp - AI-Verified News Feed

A modern news aggregator that fetches news from NewsAPI.org and automatically filters out fake news using AI verification powered by OpenAI.

## Features

- 📰 Fetch latest news from NewsAPI.org
- 🤖 **AI-powered fake news detection** - Automatically verifies each article using Gemini
- ✅ Only displays verified or unverifiable news (filters out fake news)
- 🏷️ Multiple categories (General, Top Headlines, India, Sports, Science, Entertainment, Health, Technology, Business)
- 🔍 Search functionality
- ♾️ Infinite scroll for seamless browsing
- ⚡ Fast parallel verification (5 articles at a time)
- 💾 Smart caching to avoid re-checking articles
- 🎨 Clean, responsive React frontend

## How It Works

1. **Fetch**: Retrieves 15 articles per page from NewsAPI.org
2. **Verify**: Each article is verified in parallel using Gemini's reasoning model
3. **Filter**: Only shows articles marked as "REAL" or "UNVERIFIABLE" (filters out "FAKE")
4. **Display**: Shows ~10 verified articles with verification badges

### Verification Process

The AI verifier:
- Searches trusted news sources (CNN, BBC, NYTimes, Reuters, etc.)
- Cross-references the claims in the article
- Returns: **REAL**, **FAKE**, or **UNVERIFIABLE**
- Uses "low" reasoning effort for faster responses (~10-15 seconds per article)
- Processes 5 articles in parallel (total ~15-20 seconds for all)

## Quick Start (Automated Setup)

**Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Must be installed and running)
- [NewsAPI Key](https://newsapi.org/) (Free)
- [Gemini API Key](https://aistudio.google.com/) (Free)

### Windows (PowerShell)
Right-click `setup.ps1` and select "Run with PowerShell", or run in terminal:
```powershell
./setup.ps1
```

### Mac / Linux
```bash
chmod +x setup.sh
./setup.sh
```

This script will:
1. Check your Docker installation
2. Ask for your API Keys
3. Create the configuration file automatically
4. Build and start the application

Once finished, open **http://localhost:8085** to view the app.

---

## Manual Setup (Old)

### Prerequisites

- Docker Desktop
- NewsAPI key
- Gemini API key

### Running with Docker

1. Create a `.env` file in the root directory:
```env
NEWS_API_KEY=your_newsapi_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
MODEL_PATH=./models/model_2_attention.h5
```

2. Run the application:
```bash
docker-compose up --build
```

3. Access the app:
- Frontend: http://localhost:8085
- Backend API: http://localhost:5005

## Usage

1. Start both backend and frontend servers
2. Open **http://localhost:5173** in your browser
3. Browse news by category or search for specific topics
4. Articles are automatically verified - look for the ✓ Verified badge
5. Scroll down to load more verified articles

## API Endpoints

- `GET /news?page=1&category=general&q=search` - Fetch and verify news
  - `verify=false` - Optional: Disable verification for testing
- `GET /verification-status` - View cache statistics
- `POST /clear-cache` - Clear verification cache

## Performance Optimization

- **Parallel Processing**: Verifies 5 articles simultaneously
- **Smart Caching**: Cached results prevent re-verification
- **Low Reasoning Effort**: Balances accuracy with speed
- **Limited Batch Size**: Processes 10 articles per load to reduce latency
- **Trusted Domains**: Only searches reputable sources

## Tech Stack

- **Frontend**: React 19, Vite
- **Backend**: FastAPI, Python
- **APIs**: NewsAPI.org, Gemini 2.0 Flash
- **Verification**: Gemini API with web search

## Configuration

Adjust these settings in `backend/app.py`:

```python
GEMINI_MODEL = "gemini-2.0-flash-exp"  # Gemini model
max_workers = 5       # Parallel verification threads
articles_to_verify = 10   # Articles per batch
```

## Cost Considerations

- NewsAPI: Free tier allows 100 requests/day
- Gemini: Free tier limits apply, or usage-based pricing on Google AI Studio
- Caching reduces API calls significantly

## Troubleshooting

**Slow verification?**
- Reduce `max_workers` to 3
- Change `reasoning_effort` to "low"
- Reduce `articles_to_verify` to 5

**Articles not showing?**
- Check if OpenAI API key is valid
- Verify NewsAPI key is active
- Try `?verify=false` to bypass verification

**Cache issues?**
- Visit `/clear-cache` endpoint to reset
