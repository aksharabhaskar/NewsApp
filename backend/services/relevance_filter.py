from typing import List, Dict

class RelevanceFilter:
    """
    Simple keyword-based relevance filter.
    NO API calls, completely FREE!
    """
    
    def __init__(self, api_key=None, model_name=None):
        # Keep signature for compatibility, but don't use API
        pass
    
    def batch_filter_enrichment(self, article_context: Dict, entity_name: str, 
                               rss_articles: List[str], wikipedia_entities: List[str], 
                               max_wiki_results: int = 5, ai_keywords: List[str] = None) -> Dict:
        """
        Filter enrichment data using advanced keyword matching (FREE, no API calls)
        """
        if not rss_articles and not wikipedia_entities:
            return {'relevant_rss': [], 'relevant_wikipedia': []}
        
        # Use AI keywords if provided, else fallback to context parsing
        if ai_keywords:
            keywords = {k.lower() for k in ai_keywords}
        else:
            title = article_context.get('title', '').lower()
            summary = article_context.get('summary', '').lower()
            context_text = f"{title} {summary}"
            keywords = {word.lower() for word in context_text.split() if len(word) > 4}
        
        # Add entity name keywords
        for word in entity_name.lower().split():
            if len(word) > 3:
                keywords.add(word)
        
        # Filter RSS articles
        relevant_rss = []
        for rss_title in rss_articles:
            rss_lower = rss_title.lower()
            # Score based on keyword importance
            score = sum(2 if (ai_keywords and k in ai_keywords) else 1 
                        for k in keywords if k in rss_lower)
            if score > 0:
                relevant_rss.append((rss_title, score))
        
        relevant_rss.sort(key=lambda x: x[1], reverse=True)
        relevant_rss = [title for title, score in relevant_rss[:5]]
        
        # Filter Wikipedia entities
        relevant_wikipedia = []
        for wiki_entity in wikipedia_entities:
            wiki_lower = wiki_entity.lower()
            score = sum(1 for keyword in keywords if keyword in wiki_lower)
            if score > 0:
                relevant_wikipedia.append((wiki_entity, score))
        
        relevant_wikipedia.sort(key=lambda x: x[1], reverse=True)
        relevant_wikipedia = [entity for entity, score in relevant_wikipedia[:max_wiki_results]]
        
        return {
            'relevant_rss': relevant_rss,
            'relevant_wikipedia': relevant_wikipedia
        }
