import feedparser
import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import time
from urllib.parse import quote_plus
import os

class RSSFetcher:
    def __init__(self):
        self.base_url = "https://news.google.com/rss/search?"
    
    def fetch_news_by_query(self, query, years_back=2, max_results=10):
        """Fetch historical news for a query over multiple years"""
        all_articles = []
        current_year = datetime.now().year
        
        for year_back in range(years_back):
            year = current_year - year_back
            date_start = f"{year}-01-01"
            date_end = f"{year}-12-31"
            
            # Properly encode the query to handle spaces and special characters
            encoded_query = quote_plus(f"{query} after:{date_start} before:{date_end}")
            url = f"{self.base_url}q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
            
            try:
                feed = feedparser.parse(url)
                
                for entry in feed.entries[:max(1, max_results//years_back)]:
                    article = {
                        'title': entry.get('title', ''),
                        'link': entry.get('link', ''),
                        'published': entry.get('published', ''),
                        'summary': entry.get('summary', ''),
                        'year': year,
                        'full_text': ''  # Not fetching full text for performance
                    }
                    all_articles.append(article)
                    
                    time.sleep(0.1)
                    
            except Exception as e:
                print(f"Error fetching news for year {year}: {e}")
                continue
        
        return all_articles
