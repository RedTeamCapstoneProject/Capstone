# test_fetcher.py
from dotenv import load_dotenv
import os
import sys
import json

load_dotenv('.env')

def simple_test():
    print("=" * 60)
    print(" NEWS FETCHER - LOCAL TEST")
    print("=" * 60)
    
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        print("\n❌ ERROR: No API key found!")
        return False
    
    print(f"\n✅ API key found: {api_key[:8]}...{api_key[-4:]}")
    
    try:
        from APIdata_fetcher import NewsFetcher
        
        print("\n📡 Creating fetcher...")
        fetcher = NewsFetcher(api_key, "test_output")
        
        print("🚀 Running fetch...")
        result = fetcher.run_fetch()  # This should work now
        
        if result["success"]:
            print(f"\n✅ FETCH SUCCESSFUL!")
            print(f"   📊 Articles fetched: {result['articles_count']}")
            print(f"   💾 Saved to: {result['filepath']}")
            
            with open(result['filepath'], 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"\n📰 Sample articles:")
            for i, article in enumerate(data['articles'][:3], 1):
                print(f"\n   {i}. {article['title'][:70]}...")
                print(f"      Source: {article['source_name']}")
                print(f"      Published: {article['publishedAt'][:10]}")
            
            return True
        else:
            print(f"\n❌ Fetch failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if 'fetcher' in locals():
            fetcher.close()

if __name__ == "__main__":
    success = simple_test()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ ALL TESTS PASSED!")
    else:
        print("❌ TESTS FAILED!")