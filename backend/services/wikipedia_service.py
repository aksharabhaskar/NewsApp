import wikipediaapi
import os

class WikipediaService:
    def __init__(self, lang='en'):
        # Updated for Wikipedia-API 0.6.0+ compatibility
        self.wiki = wikipediaapi.Wikipedia(
            user_agent='NewsKGAnalyzer/1.0 (https://github.com/yourproject)',
            language=lang,
            extract_format=wikipediaapi.ExtractFormat.WIKI
        )
    
    def get_entity_info(self, entity_name):
        """Get Wikipedia information for an entity"""
        try:
            page = self.wiki.page(entity_name)
            
            if page.exists():
                return {
                    'title': page.title,
                    'summary': page.summary if page.summary else "No summary available",
                    'url': page.fullurl,
                    'categories': list(page.categories.keys())[:10] if page.categories else [],
                    'exists': True
                }
            else:
                # Try common variations
                variations = [
                    entity_name.title(),
                    entity_name.lower(),
                    entity_name.upper(),
                    entity_name.replace('_', ' '),
                    entity_name.replace('-', ' ')
                ]
                
                for variation in variations:
                    if variation != entity_name:
                        page = self.wiki.page(variation)
                        if page.exists():
                            return {
                                'title': page.title,
                                'summary': page.summary if page.summary else "No summary available",
                                'url': page.fullurl,
                                'categories': list(page.categories.keys())[:10] if page.categories else [],
                                'exists': True,
                                'searched': True
                            }
                
        except Exception as e:
            print(f"Error fetching Wikipedia info for {entity_name}: {e}")
        
        return {
            'title': entity_name,
            'summary': 'No Wikipedia information found.',
            'url': '',
            'categories': [],
            'exists': False
        }
    
    def get_related_entities(self, entity_name, limit=10):
        """Get related entities from Wikipedia"""
        try:
            page = self.wiki.page(entity_name)
            
            if page.exists():
                # Get links from the page
                links = list(page.links.keys())[:limit]
                
                related = []
                for link in links:
                    related_page = self.wiki.page(link)
                    if related_page.exists():
                        related.append({
                            'name': link,
                            'summary': related_page.summary[:200] if related_page.summary else "",
                            'url': related_page.fullurl
                        })
                
                return related
            
        except Exception as e:
            print(f"Error fetching related entities: {e}")
        
        return []
    
    def get_enriched_entity_info(self, entity_name):
        """Get comprehensive Wikipedia information with entities extracted from summary"""
        try:
            print(f"      📖 Fetching Wikipedia page for: {entity_name}")
            page = self.wiki.page(entity_name)
            
            if not page.exists():
                # Try variations
                variations = [
                    entity_name.title(),
                    entity_name.lower(),
                    entity_name.replace('_', ' '),
                    entity_name.replace('-', ' ')
                ]
                
                for variation in variations:
                    if variation != entity_name:
                        page = self.wiki.page(variation)
                        if page.exists():
                            print(f"      ✅ Found Wikipedia page using variation: {variation}")
                            break
            
            if page.exists():
                # Extract entities mentioned in the summary
                summary = page.summary if hasattr(page, 'summary') and page.summary else ""
                print(f"      ✅ Wikipedia page found, summary length: {len(summary)}")
                
                # Get links that are mentioned in the summary
                related_entities = []
                try:
                    # Check if page has links attribute
                    if hasattr(page, 'links') and page.links:
                        print(f"      🔗 Processing {len(page.links)} Wikipedia links...")
                        links_dict = page.links if isinstance(page.links, dict) else {}
                        
                        for link_title in list(links_dict.keys())[:50]:
                            if summary and link_title.lower() in summary.lower():
                                # Build URL manually since fullurl might not be available
                                wiki_url = f"https://en.wikipedia.org/wiki/{link_title.replace(' ', '_')}"
                                related_entities.append({
                                    'name': link_title,
                                    'url': wiki_url
                                })
                                
                                if len(related_entities) >= 15:
                                    break
                        
                        print(f"      ✅ Found {len(related_entities)} related Wikipedia entities")
                    else:
                        print(f"      ⚠️  No links attribute found on Wikipedia page")
                except Exception as links_error:
                    print(f"      ⚠️  Error processing Wikipedia links: {links_error}")
                
                return {
                    'title': page.title if hasattr(page, 'title') else entity_name,
                    'summary': summary,
                    'url': page.fullurl if hasattr(page, 'fullurl') else f"https://en.wikipedia.org/wiki/{entity_name.replace(' ', '_')}",
                    'categories': list(page.categories.keys())[:15] if hasattr(page, 'categories') and page.categories else [],
                    'related_entities': related_entities,
                    'exists': True
                }
            else:
                print(f"      ❌ No Wikipedia page found for: {entity_name}")
            
        except Exception as e:
            print(f"      ❌ Error fetching enriched Wikipedia info for {entity_name}: {e}")
            import traceback
            traceback.print_exc()
        
        return {
            'title': entity_name,
            'summary': 'No Wikipedia information found.',
            'url': '',
            'categories': [],
            'related_entities': [],
            'exists': False
        }
