# APIdata_fetcher.py - Fixed indentation
import requests
import json
import os
import logging
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
import schedule
import time
from dotenv import load_dotenv

# ============================================
# LOGGING SETUP
# ============================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('midnight_fetcher.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================
# NEWS ARTICLE CLASS
# ============================================
@dataclass
class NewsArticle:
    """Simplified article class for JSON storage"""
    source_name: str
    source_id: Optional[str]
    author: Optional[str]
    title: str
    description: Optional[str]
    url: str
    urlToImage: Optional[str]
    publishedAt: str
    content: Optional[str]
    category: str
    
    def to_dict(self):
        return {
            "source_name": self.source_name,
            "source_id": self.source_id,
            "author": self.author,
            "title": self.title,
            "description": self.description,
            "url": self.url,
            "urlToImage": self.urlToImage,
            "publishedAt": self.publishedAt,
            "content": self.content,
            "category": self.category

        }

# ============================================
# NEWS FETCHER CLASS
# ============================================
class NewsFetcher:
    """Fetches trending news from NewsAPI"""
    
    BASE_URL = "https://newsapi.org/v2"
    
    def __init__(self, api_key: str, output_dir: str = "outputJSONs/newsAPI"):
        self.api_key = api_key
        self.output_dir = output_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'RedTeam-Fetcher/1.0',
            'X-Api-Key': api_key
        })
        os.makedirs(output_dir, exist_ok=True)
    
    def fetch_trending_news(self, target_articles: int = 500) -> List[Dict]:
        all_articles = []
    
    # Fetch from multiple categories for more variety
        categories = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']
    
        for category in categories:
            params = {
            "country": "us",
            "category": category,
            "pageSize": 50,  # 50 per category
            "apiKey": self.api_key
        }
        
            try:
                response = self.session.get(
                    f"{self.BASE_URL}/top-headlines", 
                    params=params, 
                    timeout=15
            )
                response.raise_for_status()
                data = response.json()
            
                if data.get("status") == "ok":
                    articles = data.get("articles", [])
                
                    for article in articles:
                        if article.get("title") and article["title"] != "[Removed]":
                            all_articles.append({
                                "source_name": article.get("source", {}).get("name", "Unknown"),
                                "source_id": article.get("source", {}).get("id"),
                                "author": article.get("author"),
                                "title": article["title"],
                                "description": article.get("description"),
                                "url": article.get("url"),
                                "urlToImage": article.get("urlToImage"),
                                "publishedAt": article.get("publishedAt"),
                                "content": article.get("content"),
                                "category": category 
                        })
                
                    logger.info(f" {category}: Got {len(articles)} articles (Total: {len(all_articles)})")
                    time.sleep(1)  # Delay between categories
                
                else:
                    logger.error(f"API error for {category}: {data.get('message')}")
                
            except Exception as e:
                logger.error(f"Failed to fetch {category}: {e}")
    
    # Remove duplicates by URL
        unique_articles = {}
        for article in all_articles:
            url = article.get("url")
            if url and url not in unique_articles:
                unique_articles[url] = article
    
        unique_list = list(unique_articles.values())
        unique_list.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
    
        logger.info(f" Total unique articles: {len(unique_list)}")
    
        return unique_list[:target_articles]  # Limit to target     
    
    def run_fetch(self, target_articles: int = 300) -> Dict:
        logger.info(" Running news fetch...")
    
        try:
            # Fetch trending news
            articles = self.fetch_trending_news(target_articles=target_articles)
        
            if not articles:
                return {"success": False, "error": "No articles fetched"}
        
        # Create output directory
            os.makedirs(self.output_dir, exist_ok=True)
        
        # Save to 3 separate files (0-100, 100-200, 200-300)
            saved_files = []
            chunk_size = 100
        
            for i in range(3):  # 3 files
                start_idx = i * chunk_size
                end_idx = start_idx + chunk_size
                chunk = articles[start_idx:end_idx]
            
                if chunk:  # Only save if there are articles
                    data = {
                        "fetch_info": {
                                "timestamp": datetime.now().isoformat(),
                                "article_range": f"{start_idx}-{end_idx}",
                                "articles_in_file": len(chunk),
                                "file_number": i + 1
                    },
                        "articles": chunk
                }
                
                    filename = f"trending_news_{start_idx}_{end_idx}.json"
                    filepath = os.path.join(self.output_dir, filename)

                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                
                    logger.info(f" File {i+1}: Saved {len(chunk)} articles to {filename}")
                    saved_files.append(filepath)
        
            return {
                "success": True,
                "files_created": saved_files,
                "articles_count": len(articles),
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Fetch failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def close(self):
        """Close the HTTP session"""
        self.session.close()

# ============================================
# SCHEDULER FUNCTIONS
# ============================================
def run_fetch_job(api_key: str, output_dir: str = "outputJSONs/newsAPI"):

    fetcher = NewsFetcher(api_key, output_dir)
    try:
        result = fetcher.run_fetch()
        return result
    finally:
        fetcher.close()

def start_midnight_scheduler(api_key: str, output_dir: str = "outputJSONs/newsAPI"):

    schedule.every().day.at("11:25").do(run_fetch_job, api_key, output_dir)
    
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

def manual_fetch_test(api_key: str):
    fetcher = NewsFetcher(api_key)
    try:
        result = fetcher.run_fetch()
        print(f"Fetch complete, Articles saved: {result['articles_count']}")
        print(f"Files created: {len(result['files_created'])}")  
        for f in result['files_created']:
            print(f"   - {f}")
        return result
    finally:
        fetcher.close()

# ============================================
# MAIN
# ============================================
if __name__ == "__main__":
    import sys
    load_dotenv()
    # Get API key from environment variable
    API_KEY = os.getenv("NEWS_API_KEY")
    
    if not API_KEY:
        print(" Please set NEWS_API_KEY environment variable")
        print("Example: export NEWS_API_KEY=your_key_here")
        exit(1)
    
    # Check if user passed "test" as argument
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        print(" Running test fetch")
        manual_fetch_test(API_KEY)
    else:
        print(" Starting midnight fetcher")
        start_midnight_scheduler(API_KEY)