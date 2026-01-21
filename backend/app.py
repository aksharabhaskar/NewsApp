from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import hashlib
import os
import re
from html import unescape
from dotenv import load_dotenv
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import json

# Import knowledge graph services
from services.entity_extractor import EntityExtractor
from services.rss_fetcher import RSSFetcher
from services.wikipedia_service import WikipediaService
from services.relevance_filter import RelevanceFilter
from google import genai
from google.genai import types

# ============ A. ADD MODEL IMPORTS ============
from model_handler import initialize_model, get_model

# ---------------- ENV ----------------

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
if not NEWS_API_KEY:
    raise RuntimeError("NEWS_API_KEY missing")

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

# ============ B. ADD MODEL PATH CONFIG ============
MODEL_PATH = os.getenv("MODEL_PATH", "./models/model_2_attention.h5")

# Initialize Gemini client
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize knowledge graph services
entity_extractor = None
rss_fetcher = None
wikipedia_service = None
relevance_filter = None

if GEMINI_API_KEY:
    try:
        entity_extractor = EntityExtractor(GEMINI_API_KEY, GEMINI_MODEL)
        rss_fetcher = RSSFetcher()
        wikipedia_service = WikipediaService()
        relevance_filter = RelevanceFilter(GEMINI_API_KEY, GEMINI_MODEL)
        print("✅ Knowledge Graph services initialized (Entity Extraction + RSS + Wikipedia)")
    except Exception as e:
        print(f"⚠️ Could not initialize Knowledge Graph services: {e}")
else:
    print("⚠️ GEMINI_API_KEY not found - Knowledge Graph disabled")

# Cache for verified articles (prevents re-checking)
verification_cache = {}

# ---------------- APP ----------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ C. ADD STARTUP EVENT ============
@app.on_event("startup")
async def startup_event():
    """Load model when server starts"""
    if os.path.exists(MODEL_PATH):
        print(f"🔄 Initializing model from: {MODEL_PATH}")
        initialize_model(MODEL_PATH)
    else:
        print(f"⚠️ Model not found at {MODEL_PATH}")
        print(f"   Please place your model_2_attention.h5 file in the models/ directory")

# ---------------- TIME ----------------

IST = timezone(timedelta(hours=5, minutes=30))

def to_ist_string(utc_time: Optional[str]) -> str:
    if not utc_time:
        return ""
    dt = datetime.fromisoformat(utc_time.replace("Z", "+00:00"))
    return dt.astimezone(IST).strftime("%d %b %Y, %I:%M %p IST")

# ---------------- FAKE NEWS SAMPLES ----------------

# Hardcoded fake news dataset for demonstration
FAKE_NEWS_SAMPLES = [
    {
        "title": "Miracle Cure: Drinking Bleach Cures COVID-19, Scientists Confirm",
        "description": "A controversial study claims that household bleach can eliminate coronavirus from the body within hours.",
        "url": "https://example.com/fake-bleach-cure",
        "urlToImage": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
        "publishedAt": "2024-01-10T08:00:00Z",
        "source": {"name": "Fake Health News"},
        "content": "In a shocking revelation, researchers allegedly found that common household bleach can cure COVID-19...",
        "author": "Anonymous",
        "label": "FAKE"
    },
    {
        "title": "BREAKING: Government Admits Aliens Built the Pyramids",
        "description": "Leaked documents reveal extraterrestrial involvement in ancient Egyptian construction projects.",
        "url": "https://example.com/fake-alien-pyramids",
        "urlToImage": "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=800",
        "publishedAt": "2024-01-09T14:30:00Z",
        "source": {"name": "Conspiracy Today"},
        "content": "According to unnamed sources within the government, classified documents prove that aliens helped build the pyramids...",
        "author": "John Doe",
        "label": "FAKE"
    },
    {
        "title": "5G Towers Cause Brain Cancer, New Study Shows",
        "description": "Researchers link 5G radiation to increased cancer rates in major cities.",
        "url": "https://example.com/fake-5g-cancer",
        "urlToImage": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
        "publishedAt": "2024-01-08T11:15:00Z",
        "source": {"name": "Tech Conspiracy"},
        "content": "A new study allegedly shows that 5G towers emit dangerous radiation that causes brain cancer...",
        "author": "Jane Smith",
        "label": "FAKE"
    },
    {
        "title": "Bill Gates Admits to Putting Microchips in Vaccines",
        "description": "In a leaked video, Microsoft founder allegedly confesses to vaccine tracking program.",
        "url": "https://example.com/fake-gates-microchip",
        "urlToImage": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
        "publishedAt": "2024-01-07T09:45:00Z",
        "source": {"name": "Conspiracy Central"},
        "content": "A video circulating online allegedly shows Bill Gates admitting to a global microchip tracking program...",
        "author": "Anonymous Whistleblower",
        "label": "FAKE"
    },
    {
        "title": "Scientists Discover Earth is Actually Flat, NASA Lied for Decades",
        "description": "New research allegedly proves the Earth is flat and space agencies have been covering it up.",
        "url": "https://example.com/fake-flat-earth",
        "urlToImage": "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800",
        "publishedAt": "2024-01-06T16:20:00Z",
        "source": {"name": "Flat Earth News"},
        "content": "Researchers claim to have definitive proof that the Earth is flat and NASA has been lying...",
        "author": "Flat Earth Society",
        "label": "FAKE"
    },
    {
        "title": "Drinking Hot Water Prevents All Diseases, Doctors Confirm",
        "description": "Medical professionals allegedly reveal that hot water is the cure for all illnesses.",
        "url": "https://example.com/fake-hot-water-cure",
        "urlToImage": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
        "publishedAt": "2024-01-05T07:30:00Z",
        "source": {"name": "Alternative Medicine Daily"},
        "content": "A group of doctors claim that drinking hot water can prevent and cure all known diseases...",
        "author": "Dr. Fake",
        "label": "FAKE"
    },
    {
        "title": "Moon Landing Was Filmed in Hollywood Studio, Insider Reveals",
        "description": "Former NASA employee allegedly admits the 1969 moon landing was staged.",
        "url": "https://example.com/fake-moon-landing",
        "urlToImage": "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800",
        "publishedAt": "2024-01-04T13:10:00Z",
        "source": {"name": "Moon Hoax News"},
        "content": "An alleged former NASA employee claims the moon landing was filmed in a Hollywood studio...",
        "author": "Conspiracy Theorist",
        "label": "FAKE"
    },
    {
        "title": "Eating Raw Garlic Cures Cancer, Study Finds",
        "description": "Researchers claim garlic can eliminate all types of cancer cells instantly.",
        "url": "https://example.com/fake-garlic-cancer",
        "urlToImage": "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800",
        "publishedAt": "2024-01-03T10:50:00Z",
        "source": {"name": "Natural Cure Weekly"},
        "content": "A study allegedly shows that eating raw garlic can cure all forms of cancer within days...",
        "author": "Naturopathy News",
        "label": "FAKE"
    }
]

# ---------------- FAKE NEWS DETECTION ----------------

class ArticleVerification(BaseModel):
    article_index: int
    conclusion: str  # REAL, FAKE, or UNVERIFIABLE
    answer: str
    citations: List[str]

class Citation(BaseModel):
    source_name: str
    title: str
    url: str

class NewsSummary(BaseModel):
    topic: str
    summary: str
    citations: List[Citation]

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # "main", "entity", "concept"

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str

class GraphEntity(BaseModel):
    name: str
    type: str

class KnowledgeGraphData(BaseModel):
    topic: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    entities: List[GraphEntity]

class BatchVerificationResult(BaseModel):
    results: List[ArticleVerification]

# ---------------- GOOGLE NEWS RSS HELPER (FREE!) ----------------

def google_news_search(query: str, max_results: int = 5) -> List[dict]:
    """
    Search Google News RSS feed (completely FREE, no API key needed!)
    This replaces Gemini's expensive built-in web search.
    
    Args:
        query: Search query
        max_results: Number of results to return
    
    Returns:
        List of news results with title, snippet, and link
    """
    try:
        from urllib.parse import quote_plus
        import feedparser
        
        # Encode query for URL
        encoded_query = quote_plus(query)
        search_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
        
        print(f"🔍 Google News RSS: {query[:60]}... (max={max_results})")
        
        # Parse RSS feed
        feed = feedparser.parse(search_url)
        
        results = []
        for entry in feed.entries[:max_results]:
            # Extract source from entry if available
            source = entry.get('source', {}).get('title', 'Unknown') if hasattr(entry, 'source') else 'Unknown'
            
            results.append({
                "title": entry.get('title', ''),
                "snippet": entry.get('summary', entry.get('description', ''))[:200],  # Limit snippet length
                "link": entry.get('link', ''),
                "source": source
            })
        
        print(f"✅ Found {len(results)} news results (FREE!)")
        return results
    
    except Exception as e:
        print(f"❌ Google News RSS error: {e}")
        return []

def verify_articles_batch(articles: List[dict], max_retries: int = 3) -> List[dict]:
    """Verify multiple articles using Gemini with Google Search grounding"""
    
    # Check cache first
    cached_results = []
    uncached_articles = []
    uncached_indices = []
    
    for i, article in enumerate(articles):
        if article["id"] in verification_cache:
            article["verification"] = verification_cache[article["id"]]
            cached_results.append((i, verification_cache[article["id"]]))
        else:
            uncached_articles.append(article)
            uncached_indices.append(i)
    
    # If all cached, process and return properly
    if not uncached_articles:
        verified_articles = []
        fake_articles = []
        unverified_articles = []
        
        for article in articles:
            conclusion = article.get("verification", {}).get("conclusion", "UNVERIFIABLE")
            if conclusion == "REAL":
                verified_articles.append(article)
            elif conclusion == "FAKE":
                fake_articles.append(article)
            else:
                unverified_articles.append(article)
        
        shown_articles = verified_articles + unverified_articles
        
        return {
            "articles": shown_articles,
            "stats": {
                "real_count": len(verified_articles),
                "fake_count": len(fake_articles),
                "unverified_count": len(unverified_articles),
                "total_shown": len(shown_articles)
            },
            "fake_news_detected": fake_articles[:3]
        }
    
    print(f"📝 Verifying {len(uncached_articles)} articles...")
    print(f"🔑 Using Gemini: {GEMINI_MODEL}")
    
    # Optimized prompt - minimal tokens, maximum accuracy
    claims = "\n".join([f"{i+1}. {a['title']}" for i, a in enumerate(uncached_articles)])
    prompt = f"""Verify news claims from: CNN, BBC, NYT, Reuters, Guardian, Hindu, Indian Express, Al Jazeera, Bloomberg.

{claims}

For each: REAL (verified ≥1 source), FAKE (contradicted), UNVERIFIABLE (not found).
JSON: {{"results":[{{"article_index":1,"conclusion":"REAL|FAKE|UNVERIFIABLE","answer":"reason","citations":["source"]}}]}}"""
    
    for attempt in range(max_retries):
        try:
            # Use FREE Google News RSS instead of expensive Gemini search
            # Perform Google News search once for batch of articles
            search_query = " OR ".join([f'"{a["title"][:50]}"' for a in uncached_articles[:3]])
            web_results = google_news_search(search_query, max_results=10)
            
            # Build context from search results
            web_context = "\n".join([
                f"- {r['title']} ({r.get('source', 'Unknown')}): {r['snippet']}"
                for r in web_results
            ]) if web_results else "No web search results available."
            
            # Enhanced prompt with web context
            enhanced_prompt = f"""{prompt}

WEB SEARCH RESULTS FROM TRUSTED NEWS SOURCES (Google News RSS):
{web_context}

Use the above search results to verify each claim."""
            
            config = types.GenerateContentConfig(temperature=0.1)
            
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=enhanced_prompt,
                config=config
            )
            
            # Access response text correctly for new SDK
            result_text = response.candidates[0].content.parts[0].text if hasattr(response, 'candidates') else response.text
            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            elif result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            data = json.loads(result_text)
            results = data.get("results", [])
            
            if isinstance(results, list) and len(results) > 0:
                # Pad or truncate
                while len(results) < len(uncached_articles):
                    results.append({
                        "article_index": len(results) + 1,
                        "conclusion": "UNVERIFIABLE",
                        "answer": "Incomplete verification",
                        "citations": []
                    })
                results = results[:len(uncached_articles)]
                
                # Cache results
                for i, result in enumerate(results):
                    article = uncached_articles[i]
                    verification_cache[article["id"]] = {
                        "conclusion": result.get("conclusion", "UNVERIFIABLE"),
                        "answer": result.get("answer", ""),
                        "verified": result.get("conclusion", "UNVERIFIABLE") in ["REAL", "UNVERIFIABLE"]
                    }
                
                print(f"✅ Verification complete!")
                break
            else:
                raise ValueError("Invalid response")
                
        except Exception as e:
            print(f"❌ Attempt {attempt + 1} failed: {str(e)[:100]}")
            if attempt < max_retries - 1:
                continue
            # Final failure: mark all unverifiable
            for article in uncached_articles:
                verification_cache[article["id"]] = {
                    "conclusion": "UNVERIFIABLE",
                    "answer": f"Error: {str(e)[:50]}",
                    "verified": True
                }
    
    # Apply all results (cached + new)
    verified_articles = []
    fake_articles = []
    unverified_articles = []
    
    for article in articles:
        if article["id"] in verification_cache:
            article["verification"] = verification_cache[article["id"]]
            conclusion = article["verification"]["conclusion"]
            
            if conclusion == "REAL":
                verified_articles.append(article)
            elif conclusion == "FAKE":
                fake_articles.append(article)
            else:
                unverified_articles.append(article)
    
    # Show REAL + UNVERIFIED (hide only FAKE)
    shown_articles = verified_articles + unverified_articles
    
    print(f"✅ REAL: {len(verified_articles)} | ❌ FAKE: {len(fake_articles)} | ? UNVERIFIED: {len(unverified_articles)}")
    print(f"📰 Showing: {len(shown_articles)} articles")
    
    return {
        "articles": shown_articles,
        "stats": {
            "real_count": len(verified_articles),
            "fake_count": len(fake_articles),
            "unverified_count": len(unverified_articles),
            "total_shown": len(shown_articles)
        },
        "fake_news_detected": fake_articles[:3]  # Show up to 3 fake articles for demo
    }

# ---------------- UTILS ----------------

def make_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()

def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    # Remove truncated character markers like [+4635 characters]
    text = re.sub(r"\[\+\d+\s+chars\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def is_valid_article(title: str, description: str) -> bool:
    if len(title) < 10:
        return False
    if len(description) < 20:
        return False
    return True

def normalize_image(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return None
    if not url.startswith("http"):
        return None
    return url

def relevance_score(article: dict, query: str) -> int:
    if not query:
        return 0

    q = query.lower()
    score = 0

    if q in article["title"].lower():
        score += 5
    if q in article["description"].lower():
        score += 3
    if q in article["content"].lower():
        score += 1

    return score

# ---------------- API ----------------

@app.get("/news")
def get_news(
    page: int = Query(1, ge=1),
    q: Optional[str] = Query(None),
    verify: bool = Query(True)
):
    """
    Get REAL news from NewsAPI with verification
    Returns only REAL and UNVERIFIABLE articles (FAKE articles are filtered out)
    """
    
    if q and q.strip():
        # User search query
        search_query = q.strip()
    else:
        # Mix of topics excluding entertainment
        search_query = "(science OR finance OR business OR sports OR politics OR technology OR health) -celebrity -entertainment"
    
    params = {
        "apiKey": NEWS_API_KEY,
        "q": search_query,
        "page": page,
        "pageSize": 30,
        "language": "en",
        "sortBy": "publishedAt",
        "excludeDomains": "tmz.com,eonline.com,people.com,usmagazine.com,billboard.com,hollywoodreporter.com,variety.com"
    }

    url = "https://newsapi.org/v2/everything"

    response = requests.get(url, params=params)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=response.text)

    data = response.json()
    articles = []

    for article in data.get("articles", []):
        link = article.get("url")
        if not link:
            continue

        title = clean_text(article.get("title"))
        description = clean_text(article.get("description"))
        content = clean_text(article.get("content"))
        published_utc = article.get("publishedAt")

        if not is_valid_article(title, description):
            continue
        
        # Only include articles with valid images
        image_url = article.get("urlToImage")
        if not image_url or not isinstance(image_url, str) or not image_url.startswith("http"):
            continue

        articles.append({
            "id": make_id(link),
            "title": title,
            "description": description,
            "content": content,
            "url": link,
            "image": normalize_image(article.get("urlToImage")),
            "source": article.get("source", {}).get("name"),
            "publishedAt": published_utc,
            "publishedAtIST": to_ist_string(published_utc),
        })

    # ---------- SEARCH RE-RANKING ----------
    if q and q.strip():
        query = q.strip()
        articles.sort(
            key=lambda a: relevance_score(a, query),
            reverse=True
        )

    # ---------- FAKE NEWS VERIFICATION ----------
    if verify and articles:
        # Verify more articles (up to 30) to ensure we get at least 10 REAL ones
        articles_to_verify = articles[:30]
        result = verify_articles_batch(articles_to_verify)
        
        # Result already contains filtered articles and stats
        verified_articles = result["articles"]
        fake_articles = result.get("fake_news_detected", [])
        
        # Separate by conclusion
        real_articles = [a for a in verified_articles if a.get("verification", {}).get("conclusion") == "REAL"]
        unverified_articles = [a for a in verified_articles if a.get("verification", {}).get("conclusion") == "UNVERIFIABLE"]
        
        # Combine REAL + UNVERIFIED for display (hide only FAKE)
        shown_articles = (real_articles + unverified_articles)[:10]
        
        # Return top 10 (REAL + UNVERIFIED) + all FAKE (for blocking display)
        return {
            "articles": shown_articles,
            "stats": {
                "real_count": len([a for a in shown_articles if a.get("verification", {}).get("conclusion") == "REAL"]),
                "fake_count": len(fake_articles),
                "unverified_count": len([a for a in shown_articles if a.get("verification", {}).get("conclusion") == "UNVERIFIABLE"])
            },
            "fake_news_detected": fake_articles  # All fake news for display
        }
    
    return {"articles": articles, "stats": {"real_count": len(articles), "fake_count": 0, "unverified_count": 0}, "fake_news_detected": []}


@app.get("/fake-news-samples")
def get_fake_news_samples():
    """
    Get curated FAKE news samples for demonstration
    These are known fake articles for testing the detection model
    """
    # Process fake samples to add required fields
    processed_samples = []
    for sample in FAKE_NEWS_SAMPLES:
        processed_sample = sample.copy()
        processed_sample["id"] = make_id(sample["url"])
        processed_sample["publishedAtIST"] = to_ist_string(sample["publishedAt"])
        processed_sample["image"] = sample["urlToImage"]
        
        # Mark as FAKE (ground truth)
        processed_sample["verification"] = {
            "conclusion": "FAKE",
            "answer": "This is a known fake news sample from the training dataset",
            "verified": False
        }
        
        processed_samples.append(processed_sample)
    
    return {
        "articles": processed_samples,
        "stats": {
            "real_count": 0,
            "fake_count": len(processed_samples),
            "unverified_count": 0
        },
        "fake_news_detected": []
    }


@app.get("/verification-status")
def get_verification_status():
    """Get cache statistics"""
    return {
        "cached_articles": len(verification_cache),
        "cache_enabled": True
    }

@app.post("/clear-cache")
def clear_verification_cache():
    """Clear the verification cache"""
    verification_cache.clear()
    return {"message": "Cache cleared", "cached_articles": 0}

@app.post("/article-summary")
def get_article_summary(request: dict):
    """Get summary from trusted sources for an article topic"""
    topic = request.get("topic", "")
    original_description = request.get("description", "")
    original_content = request.get("content", "")
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API not configured")
    
    try:
        print(f"📝 Generating summary for: {topic[:50]}")
        print(f"🔑 Using model: {GEMINI_MODEL}")
        
        # Provide original article context if trusted sources are missing
        original_context = f"\n\nORIGINAL ARTICLE CONTENT:\nDescription: {original_description}\nContent: {original_content}" if original_description or original_content else ""

        # Optimized prompt - minimal tokens
        prompt = f"""Topic: {topic}

Search trusted news (CNN, BBC, NYT, Reuters, Guardian, Hindu, Indian Express). 150-word summary.
IMPORTANT: If you cannot find info from the trusted news sources above, provide a summary BASED ONLY ON THE ORIGINAL ARTICLE CONTENT provided below.
In that case, the first sentence MUST BE: "Based on the original article source (no secondary verification available):"

{original_context}

JSON FORMAT: {{"topic":"title","summary":"text","citations":[{{"source_name":"name","title":"title","url":"url"}}]}}"""

        # Use FREE Google News RSS instead of expensive Gemini search
        # Perform Google News search for the topic
        web_results = google_news_search(topic, max_results=5)
        
        # Build context from search results
        web_context = "\n".join([
            f"- {r['title']} ({r.get('source', 'Unknown')}): {r['snippet']}"
            for r in web_results
        ]) if web_results else "No web search results available."
        
        # Enhanced prompt with web context
        enhanced_prompt = f"""{prompt}

WEB SEARCH RESULTS FROM TRUSTED NEWS SOURCES (Google News RSS):
{web_context}

Use the above search results to write your summary and citations. If the search results do not match the topic or are not from trusted sources, STICK TO THE ORIGINAL ARTICLE CONTENT as per instructions."""
        
        config = types.GenerateContentConfig(temperature=0.2)
        
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=enhanced_prompt,
            config=config
        )

        # Access response text correctly for new SDK
        if hasattr(response, 'candidates') and response.candidates:
            result_text = response.candidates[0].content.parts[0].text
        elif hasattr(response, 'text'):
            result_text = response.text
        else:
            raise ValueError("Unexpected response format from Gemini")
        
        result_text = result_text.strip()

        # Log raw Gemini response for debugging
        print("Gemini raw response:", result_text[:200])

        # Clean JSON markers
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        elif result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()

        # Parse JSON
        try:
            result_data = json.loads(result_text)
        except json.JSONDecodeError as json_err:
            print("Error parsing Gemini JSON:", json_err)
            print("Raw text:", result_text[:500])
            
            # If JSON parsing fails, but we have text, try to extract summary
            if len(result_text) > 50:
                 return {
                    "topic": topic,
                    "summary": result_text if len(result_text) < 1000 else result_text[:997] + "...",
                    "citations": []
                }

            # Return fallback response instead of error
            return {
                "topic": topic,
                "summary": "Unable to generate summary at this time. Please try again.",
                "citations": []
            }

        # Validate and verify URLs (with timeout and error handling)
        valid_citations = []
        citations = result_data.get("citations", [])
        
        if not isinstance(citations, list):
            citations = []
        
        for citation in citations[:10]:  # Limit to 10 citations max
            if not isinstance(citation, dict):
                continue
                
            url = citation.get("url", "")
            if not url or not isinstance(url, str):
                continue
            
            # Basic URL validation
            if not url.startswith(("http://", "https://")):
                continue
            
            try:
                # Quick HEAD request with short timeout
                url_check = requests.head(
                    url, 
                    timeout=3,  # Reduced timeout
                    allow_redirects=True,
                    headers={'User-Agent': 'Mozilla/5.0'}  # Some sites require user agent
                )
                
                if url_check.status_code in [200, 301, 302, 307, 308]:
                    valid_citations.append({
                        "source_name": str(citation.get("source_name", "Unknown"))[:100],
                        "title": str(citation.get("title", ""))[:200],
                        "url": url
                    })
                    
                    # Stop after 5 valid citations
                    if len(valid_citations) >= 5:
                        break
                        
            except requests.exceptions.Timeout:
                print(f"Citation URL timeout: {url[:50]}")
                # Add citation anyway if timeout (might be slow server)
                valid_citations.append({
                    "source_name": str(citation.get("source_name", "Unknown"))[:100],
                    "title": str(citation.get("title", ""))[:200],
                    "url": url
                })
                if len(valid_citations) >= 5:
                    break
            except Exception as url_err:
                print(f"Citation URL check failed: {url_err}")
                continue

        # Ensure we have valid data
        summary = result_data.get("summary", "")
        if not isinstance(summary, str) or len(summary) < 10:
            summary = "Summary not available."

        return {
            "topic": str(result_data.get("topic", topic))[:200],
            "summary": summary[:1000],  # Limit summary length
            "citations": valid_citations
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating summary: {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Return user-friendly error instead of 500
        return {
            "topic": topic,
            "summary": f"Unable to generate summary due to an error. Please try again later.",
            "citations": [],
            "error": error_msg[:200]  # Include truncated error for debugging
        }


@app.post("/knowledge-graph")
def get_knowledge_graph(request: dict):
    """Generate enriched knowledge graph with RSS and Wikipedia data (NO Neo4j storage)"""
    topic = request.get("topic", "")
    description = request.get("description", "")
    url = request.get("url", "")
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    if not entity_extractor:
        raise HTTPException(status_code=503, detail="Knowledge Graph service not available. Please configure GEMINI_API_KEY in .env")
    
    try:
        print(f"\n🔍 Generating enriched knowledge graph for: {topic[:60]}...")
        
        # Step 1: Extract base entities and relations from article
        text = f"{topic}. {description}" if description else topic
        extraction_result = entity_extractor.extract_entities(text, title=topic)
        
        base_entities = extraction_result.get("entities", [])
        base_relations = extraction_result.get("relations", [])
        
        print(f"   ✅ Extracted {len(base_entities)} base entities, {len(base_relations)} relations")
        
        # Step 2: Enrich with RSS and Wikipedia (Guided by AI context)
        enriched_entities = list(base_entities)  
        enriched_relations = list(base_relations)
        rss_articles_data = []
        wiki_data = {}
        
        # Get AI context for smart local filtering
        relevance_ctx = extraction_result.get("relevance_context", {})
        ai_keywords = relevance_ctx.get("keywords", [])
        
        if rss_fetcher and wikipedia_service and relevance_filter:
            top_entities = [e for e in base_entities if e.get("type") in ["PERSON", "ORGANIZATION", "LOCATION"]][:3]
            
            for entity in top_entities:
                entity_name = entity.get("name", "")
                if not entity_name: continue
                
                print(f"   🔎 AI-Guided enrichment for: {entity_name}")
                
                # Smart RSS Filtering (Code-based using AI keywords)
                try:
                    raw_rss = rss_fetcher.fetch_news_by_query(entity_name, max_results=10)
                    rss_titles = [r.get("title", "") for r in raw_rss]
                    
                    filter_res = relevance_filter.batch_filter_enrichment(
                        article_context={"title": topic, "summary": description},
                        entity_name=entity_name,
                        rss_articles=rss_titles,
                        wikipedia_entities=[],
                        ai_keywords=ai_keywords
                    )
                    
                    relevant_titles = filter_res.get("relevant_rss", [])
                    for title in relevant_titles:
                        # Match back to original RSS object for the link
                        orig = next((r for r in raw_rss if r.get("title") == title), {})
                        rss_articles_data.append({
                            "entity": entity_name,
                            "title": title,
                            "link": orig.get("link", "")
                        })
                    print(f"      📰 Integrated {len(relevant_titles)} relevant RSS articles")
                except Exception as e:
                    print(f"      ⚠️ RSS error: {e}")
                
                # Smart Wikipedia Filtering
                try:
                    wiki_info = wikipedia_service.get_enriched_entity_info(entity_name)
                    if wiki_info.get("exists"):
                        wiki_data[entity_name] = {
                            "summary": wiki_info.get("summary", "")[:300],
                            "url": wiki_info.get("url", "")
                        }
                        
                        raw_wiki_ents = [w["name"] for w in wiki_info.get("related_entities", [])]
                        filter_res = relevance_filter.batch_filter_enrichment(
                            article_context={"title": topic, "summary": description},
                            entity_name=entity_name,
                            rss_articles=[],
                            wikipedia_entities=raw_wiki_ents,
                            max_wiki_results=3,
                            ai_keywords=ai_keywords
                        )
                        
                        for wiki_ent_name in filter_res.get("relevant_wikipedia", []):
                            enriched_entities.append({
                                "name": wiki_ent_name,
                                "type": "OTHER",
                                "context": f"AI-validated relation to {entity_name}"
                            })
                            enriched_relations.append({
                                "source": entity_name,
                                "target": wiki_ent_name,
                                "relationship": "related_to",
                                "context": "Semantic Match"
                            })
                        print(f"      📖 Integrated {len(filter_res.get('relevant_wikipedia', []))} relevant Wiki connections")
                except Exception as e:
                    print(f"      ⚠️ Wiki error: {e}")
        
        print(f"   ✅ Final: {len(enriched_entities)} entities, {len(enriched_relations)} relations")
        
        # Step 3: Build visualization graph
        nodes = []
        edges = []
        
        # Add main topic node
        main_label = topic.split('.')[0][:40]
        nodes.append({
            "id": "main",
            "label": main_label,
            "type": "main"
        })
        
        # Add entity nodes
        entity_map = {"main": "main"}
        for i, entity in enumerate(enriched_entities[:15]):  # Limit to 15 for clarity
            entity_id = f"node_{i+1}"
            entity_name = entity.get("name", "")
            entity_map[entity_name] = entity_id
            
            nodes.append({
                "id": entity_id,
                "label": entity_name[:25],
                "type": entity.get("type", "OTHER"),
                "context": entity.get("context", "")
            })
            
            # Connect to main topic
            edges.append({
                "source": "main",
                "target": entity_id,
                "label": "mentions"
            })
        
        # Add relationship edges
        for relation in enriched_relations:
            source = relation.get("source", "")
            target = relation.get("target", "")
            source_id = entity_map.get(source)
            target_id = entity_map.get(target)
            
            if source_id and target_id and source_id != target_id and source_id != "main" and target_id != "main":
                edges.append({
                    "source": source_id,
                    "target": target_id,
                    "label": relation.get("relationship", "related")[:15]
                })
        
        # Format complete extraction result for chatbot
        complete_extraction = {
            "entities": enriched_entities,
            "relations": enriched_relations,
            "rss_articles": rss_articles_data,
            "wikipedia_data": wiki_data
        }
        
        return {
            "topic": main_label,
            "nodes": nodes,
            "edges": edges,
            "extraction_data": complete_extraction  # Full data for chatbot
        }
    
    except Exception as e:
        print(f"Error generating knowledge graph: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate knowledge graph: {str(e)}")


@app.post("/node-details")
def get_node_details(request: dict):
    """
    Return details for a node in the knowledge graph.

    Expected request example:
    {
        "node_label": "Fundera Network",
        "extraction_data": {
            "entities": [...],
            "relations": [...],
            "rss_articles": [...],
            "wikipedia_data": {...}
        }
    }
    """
    node_label = request.get("node_label", "")
    extraction_data = request.get("extraction_data", {})

    if not node_label:
        raise HTTPException(status_code=400, detail="node_label is required")

    entities = extraction_data.get("entities", [])
    relations = extraction_data.get("relations", [])
    rss_articles = extraction_data.get("rss_articles", [])
    wikipedia_data = extraction_data.get("wikipedia_data", {})

    # Find matching entity (simple name match)
    entity_info = next(
        (e for e in entities if e.get("name") == node_label),
        None
    )

    # Relations where this node is involved
    related_relations = [
        r for r in relations
        if r.get("source") == node_label or r.get("target") == node_label
    ]

    # RSS articles related to this node
    related_rss = [
        r for r in rss_articles
        if r.get("entity") == node_label
    ]

    # Wikipedia info (if available)
    wiki_info = wikipedia_data.get(node_label, {})

    if not entity_info and not related_relations and not related_rss and not wiki_info:
        # Still return a basic object instead of 404 so UI can handle it
        return {
            "name": node_label,
            "type": "UNKNOWN",
            "context": "",
            "description": f"No detailed information available for {node_label}",
            "relations": [],
            "rss_articles": [],
            "wikipedia": {},
            "related_news": [],
            "relationships": [],
            "relationship_count": 0,
            "wikipedia_summary": "",
            "wikipedia_url": ""
        }

    # Format relationships for UI
    relationships = []
    for rel in related_relations:
        if rel.get("source") == node_label:
            relationships.append({
                "type": "outgoing",
                "relationship": rel.get("relationship", "related"),
                "target": rel.get("target", ""),
                "context": rel.get("context", "")
            })
        else:
            relationships.append({
                "type": "incoming",
                "relationship": rel.get("relationship", "related"),
                "source": rel.get("source", ""),
                "context": rel.get("context", "")
            })

    # Format RSS articles for UI
    related_news = []
    for rss in related_rss:
        related_news.append({
            "title": rss.get("title", ""),
            "description": rss.get("description", ""),
            "link": rss.get("link", "")
        })

    return {
        "name": entity_info.get("name", node_label) if entity_info else node_label,
        "type": entity_info.get("type", "UNKNOWN") if entity_info else "UNKNOWN",
        "context": entity_info.get("context", "") if entity_info else "",
        "description": entity_info.get("context", f"Entity: {node_label}") if entity_info else f"Entity: {node_label}",
        "relations": related_relations,
        "rss_articles": related_rss,
        "wikipedia": {
            "summary": wiki_info.get("summary", ""),
            "url": wiki_info.get("url", "")
        },
        "related_news": related_news,
        "relationships": relationships,
        "relationship_count": len(relationships),
        "wikipedia_summary": wiki_info.get("summary", ""),
        "wikipedia_url": wiki_info.get("url", "")
    }


# ============ D. ADD DETECT-FAKE ENDPOINT ============
@app.post("/detect-fake")
def detect_fake_news(request: dict):
    """
    Detect if article is fake using trained Keras model
    
    Request:
    {
        "image_url": "https://...",
        "entities": [{"name": "...", "type": "...", "context": "..."}],
        "relations": [{"source": "...", "target": "...", "relationship": "...", "context": "..."}]
    }
    
    Response:
    {
        "prediction": "REAL" or "FAKE",
        "confidence": 0.95,
        "real_probability": 0.05,
        "fake_probability": 0.95,
        "raw_score": 0.95,
        "analysis": "Detailed explanation..."
    }
    """
    image_url = request.get("image_url", "")
    entities = request.get("entities", [])
    relations = request.get("relations", [])
    
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    
    if not entities or not relations:
        raise HTTPException(
            status_code=400, 
            detail="entities and relations required. Generate Knowledge Graph first."
        )
    
    try:
        print(f"\n{'='*60}")
        print(f"🔍 NEW DETECTION REQUEST")
        print(f"{'='*60}")
        print(f"Image URL: {image_url[:80]}...")
        print(f"Entities: {len(entities)}")
        print(f"Relations: {len(relations)}")
        
        # Get model prediction
        model = get_model()
        result = model.predict(image_url, entities, relations)
        
        # Add descriptive analysis if not present
        if not result.get("analysis"):
            conf = result.get("confidence", 0) * 100
            pred = result.get("prediction", "REAL")
            if pred == "REAL":
                result["analysis"] = f"The neural model indicates {conf:.1f}% confidence in this article's authenticity. This result is derived from matching the image features with the extracted knowledge graph entities and their verified relationships."
            else:
                result["analysis"] = f"Caution: The model has flagged this content as potentially manipulated with {conf:.1f}% confidence. Relational inconsistencies were detected between the visual context and the reported entities."
        
        return result
    
    except Exception as e:
        print(f"❌ Detection error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)[:200]}")


# ============ F. ADD MODEL STATUS ENDPOINT ============
@app.get("/model-status")
def get_model_status():
    """Check if model is loaded and ready"""
    try:
        model = get_model()
        return {
            "status": "ready",
            "model_type": "Keras (TensorFlow)",
            "image_model": "CLIP (openai/clip-vit-base-patch32)",
            "graph_model": "Node2Vec",
            "embedding_dim": 512,
            "model_loaded": True
        }
    except Exception as e:
        return {
            "status": "not_loaded",
            "error": str(e),
            "model_loaded": False
        }


@app.post("/chat")
def chat_with_article(request: dict):
    """Chat with an article using its in-memory knowledge graph data"""
    extraction_data = request.get("extraction_data", {})
    question = request.get("question", "")
    article_title = request.get("article_title", "")
    
    if not extraction_data:
        raise HTTPException(status_code=400, detail="extraction_data is required")
    
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini chatbot not available. Please configure GEMINI_API_KEY in .env")
    
    try:
        # Build context from knowledge graph data
        context = f"Article: {article_title}\n\n"
        
        entities = extraction_data.get('entities', [])
        relations = extraction_data.get('relations', [])
        rss_articles = extraction_data.get('rss_articles', [])
        wikipedia_data = extraction_data.get('wikipedia_data', {})
        
        if entities:
            context += "Entities extracted from the article:\n"
            for entity in entities[:25]:  # Limit to 25
                context += f"- {entity['name']} ({entity.get('type', 'OTHER')})"
                if entity.get('context'):
                    context += f": {entity['context']}"
                context += "\n"
            context += "\n"
        
        if relations:
            context += "Relationships identified:\n"
            for rel in relations[:20]:  # Limit to 20
                context += f"- {rel.get('source', '')} → {rel.get('relationship', 'related')} → {rel.get('target', '')}"
                if rel.get('context'):
                    context += f" ({rel['context']})"
                context += "\n"
            context += "\n"
        
        if rss_articles:
            context += "Related news articles found:\n"
            for rss in rss_articles[:10]:
                context += f"- {rss.get('title', '')} (about {rss.get('entity', '')})\n"
            context += "\n"
        
        if wikipedia_data:
            context += "Wikipedia information:\n"
            for entity_name, wiki_info in list(wikipedia_data.items())[:5]:
                context += f"- {entity_name}: {wiki_info.get('summary', '')[:150]}...\n"
            context += "\n"
        
        # Create prompt for Gemini
        prompt = f"""You are an AI assistant for analyzing news articles using enriched knowledge graph data.

Use the knowledge graph information below to answer the user's question.
The knowledge graph contains:
- Entities (people, organizations, locations, etc.) extracted from the article
- Relationships between entities
- Related news articles from RSS feeds
- Wikipedia context for key entities

If the question cannot be answered from this information, say so clearly.

KNOWLEDGE GRAPH DATA:
{context}

USER QUESTION: {question}

Please provide a clear, concise answer based on the knowledge graph above."""
        
        # Get response from Gemini
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        # Access response text correctly for new SDK
        answer = response.candidates[0].content.parts[0].text if hasattr(response, 'candidates') else (response.text if hasattr(response, 'text') else str(response))
        
        return {
            "answer": answer,
            "article_title": article_title
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")


@app.get("/articles")
def get_all_articles():
    """Get all articles stored in Neo4j"""
    # Note: This endpoint references neo4j_service which is not initialized in your code
    # You may want to remove this or add the neo4j_service initialization
    raise HTTPException(status_code=501, detail="Neo4j integration not implemented")
