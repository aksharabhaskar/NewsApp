import json
import re
from google import genai
from google.genai import types
import os

class EntityExtractor:
    def __init__(self, api_key, model_name="gemini-2.5-flash"):
        # Configure Gemini API
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
    
    def extract_entities(self, text, title=""):
        """Extract relevant entities and relations from article text using Gemini API"""
        
        prompt = f"""
You are an expert entity and relation extractor for creating knowledge graphs from news articles.
Extract ONLY the most relevant and important entities and relationships from the text.

ARTICLE TITLE: {title}

🎯 EXTRACTION PRINCIPLES:
1. Focus on entities central to the article's main topic
2. Avoid extracting every minor mention - be selective
3. Extract only meaningful, contextually significant relationships
4. Aim for 5-15 key entities (not 20-30)
5. Aim for 8-15 key relationships (quality over quantity)

📋 ENTITY TYPES (Extract only if relevant):
- PERSON - Key individuals, leaders, officials
- ORGANIZATION - Important companies, institutions, governments
- LOCATION - Significant locations central to the story
- DATE - Important dates, time periods
- EVENT - Major events central to the story
- PRODUCT - Key products, technologies
- INFRASTRUCTURE - Major infrastructure projects
- PROJECT - Significant development projects
- MONEY - Substantial amounts, budgets
- QUANTITY - Significant numbers
- LAW - Important laws, regulations
- OTHER - Other significant entities

🔗 RELATIONSHIP TYPES (Extract only explicit or clearly implied):
- Employment: works_for, leads, manages, heads
- Location: located_in, based_in, operates_in
- Ownership: owns, controls, operates
- Participation: participated_in, attended, organized
- Communication: announced, stated, criticized, praised
- Business: acquired, invested_in, partnered_with
- Temporal: scheduled_for, started_on, completed_on
- Hierarchical: part_of, includes, reports_to
- Causal: caused_by, resulted_in, affected

TEXT TO ANALYZE:
{text[:5000]}

Return ONLY valid JSON with this EXACT structure (no markdown, no explanation):
{{
    "entities": [
        {{
            "name": "entity name",
            "type": "PERSON/ORGANIZATION/LOCATION/etc",
            "context": "why important"
        }}
    ],
    "relations": [
        {{
            "source": "entity name",
            "target": "entity name",
            "relationship": "relationship type",
            "context": "explanation"
        }}
    ],
    "relevance_context": {{
        "keywords": ["key1", "key2", "semantic_keyword3"],
        "primary_theme": "1-sentence summary of the story's core focus"
    }}
}}
"""
        
        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=8192
            )
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            
            # Access response text correctly for new SDK
            result_text = response.candidates[0].content.parts[0].text if hasattr(response, 'candidates') else response.text
            result_text = result_text.strip()
            
            # Clean the response to extract JSON
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            elif result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            
            result_text = result_text.strip()
            
            # Find JSON pattern
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(0)
            
            result = json.loads(result_text)
            
            # Ensure relations use 'source' and 'target' keys
            for relation in result.get("relations", []):
                if "from" in relation:
                    relation["source"] = relation.pop("from")
                if "to" in relation:
                    relation["target"] = relation.pop("to")
            
            print(f"✅ Successfully extracted {len(result.get('entities', []))} entities and {len(result.get('relations', []))} relations using Gemini")
            return result
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
            return {"entities": [], "relations": []}
        except Exception as e:
            print(f"❌ Error extracting entities: {e}")
            return {"entities": [], "relations": []}
