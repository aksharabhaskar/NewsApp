from neo4j import GraphDatabase, exceptions as neo4j_exceptions
import os
import time
import uuid

class Neo4jService:
    def __init__(self, uri=None, username=None, password=None):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.username = username or os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD")
        
        if not self.password:
            raise RuntimeError("NEO4J_PASSWORD not configured")
        
        print(f"Attempting to connect to Neo4j at: {self.uri}")
        
        # Try multiple connection attempts
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self.driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.username, self.password),
                    connection_timeout=10
                )
                
                # Test connection and create constraints
                with self.driver.session() as session:
                    # Create constraints for better performance
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE")
                    result = session.run("RETURN 1 as test")
                    result.consume()
                
                print(f"✅ Neo4j connection successful! (Attempt {attempt + 1})")
                break
                
            except neo4j_exceptions.AuthError as e:
                print(f"❌ Authentication failed: {e}")
                raise
            except Exception as e:
                print(f"⚠️ Connection attempt {attempt + 1} failed: {str(e)[:100]}...")
                if attempt < max_retries - 1:
                    wait_time = 2 * (attempt + 1)
                    print(f"   Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    print(f"❌ Max retries reached. Could not connect to Neo4j.")
                    raise
    
    def close(self):
        if hasattr(self, 'driver'):
            self.driver.close()
    
    def create_knowledge_graph(self, extraction_result, article_title="Untitled", article_url=""):
        """Create knowledge graph for specific article in Neo4j"""
        article_id = str(uuid.uuid4())[:8]  # Generate unique ID for article
        
        with self.driver.session() as session:
            # Create Article node with unique ID
            session.execute_write(self._create_article_node, article_id, article_title, article_url, extraction_result)
            
            # Create Entity nodes linked to article
            for entity in extraction_result.get("entities", []):
                session.execute_write(self._create_entity_node, entity, article_id, article_title)
            
            # Create Relation edges linked to article
            for relation in extraction_result.get("relations", []):
                session.execute_write(self._create_relation, relation, article_id, article_title)
        
        return article_id
    
    @staticmethod
    def _create_article_node(tx, article_id, title, url, extraction_result):
        query = """
        CREATE (a:Article {
            id: $article_id,
            title: $title,
            url: $url,
            entity_count: $entity_count,
            relation_count: $relation_count,
            processed_at: datetime(),
            created_at: datetime()
        })
        RETURN a
        """
        tx.run(query, 
               article_id=article_id,
               title=title[:200],
               url=url[:500],
               entity_count=len(extraction_result.get("entities", [])),
               relation_count=len(extraction_result.get("relations", [])))
    
    @staticmethod
    def _create_entity_node(tx, entity, article_id, article_title):
        """Create entity node in article's subgraph"""
        # Generate unique entity ID within article context
        entity_id = f"{article_id}:{entity.get('name', '')[:50]}"
        
        query = """
        MERGE (e:Entity {id: $entity_id})
        ON CREATE SET 
            e.name = $name,
            e.type = $type,
            e.context = $context,
            e.first_seen = datetime(),
            e.last_seen = datetime(),
            e.article_id = $article_id
        ON MATCH SET 
            e.last_seen = datetime(),
            e.article_id = $article_id
        
        WITH e
        MATCH (a:Article {id: $article_id})
        MERGE (e)-[:IN_ARTICLE]->(a)
        
        RETURN e
        """
        return tx.run(query,
                     entity_id=entity_id,
                     name=entity.get("name", "")[:100],
                     type=entity.get("type", "OTHER")[:50],
                     context=entity.get("context", "")[:500],
                     article_id=article_id)
    
    @staticmethod
    def _create_relation(tx, relation, article_id, article_title):
        """Create relation between entities in article's subgraph"""
        source = relation.get("source") or relation.get("from", "")
        target = relation.get("target") or relation.get("to", "")
        relationship = relation.get("relationship", "related_to")
        
        if not source or not target:
            return None
        
        # Create unique IDs for entities in this article's context
        source_id = f"{article_id}:{source[:50]}"
        target_id = f"{article_id}:{target[:50]}"
        relation_id = f"{article_id}:{source[:30]}_{relationship[:20]}_{target[:30]}"
        
        query = """
        // Find or create source entity in this article's subgraph
        MERGE (a:Entity {id: $source_id})
        ON CREATE SET 
            a.name = $source_name,
            a.first_seen = datetime(),
            a.last_seen = datetime(),
            a.article_id = $article_id
        ON MATCH SET 
            a.last_seen = datetime(),
            a.article_id = $article_id
        
        // Find or create target entity in this article's subgraph
        MERGE (b:Entity {id: $target_id})
        ON CREATE SET 
            b.name = $target_name,
            b.first_seen = datetime(),
            b.last_seen = datetime(),
            b.article_id = $article_id
        ON MATCH SET 
            b.last_seen = datetime(),
            b.article_id = $article_id
        
        // Link entities to article
        WITH a, b
        MATCH (art:Article {id: $article_id})
        MERGE (a)-[:IN_ARTICLE]->(art)
        MERGE (b)-[:IN_ARTICLE]->(art)
        
        // Create directed relationship with unique ID
        MERGE (a)-[r:RELATED {id: $relation_id}]->(b)
        ON CREATE SET 
            r.type = $relationship,
            r.context = $context,
            r.strength = 1,
            r.last_updated = datetime(),
            r.article_id = $article_id,
            r.source = $source_name,
            r.target = $target_name
        ON MATCH SET 
            r.strength = r.strength + 1,
            r.last_updated = datetime()
        
        RETURN r
        """
        return tx.run(query,
                     source_id=source_id,
                     source_name=source[:100],
                     target_id=target_id,
                     target_name=target[:100],
                     relationship=relationship[:50],
                     context=relation.get("context", "")[:500],
                     article_id=article_id,
                     relation_id=relation_id)
    
    def get_article_knowledge_graph(self, article_id):
        """Get full knowledge graph for a specific article for chatbot"""
        with self.driver.session() as session:
            query = """
            MATCH (a:Article {id: $article_id})
            OPTIONAL MATCH (e:Entity)-[:IN_ARTICLE]->(a)
            OPTIONAL MATCH (e1:Entity)-[r:RELATED]->(e2:Entity)
            WHERE r.article_id = $article_id
            RETURN a.title AS title,
                   a.url AS url,
                   a.entity_count AS entity_count,
                   a.relation_count AS relation_count,
                   collect(DISTINCT {name: e.name, type: e.type, context: e.context}) AS entities,
                   collect(DISTINCT {source: e1.name, relation: r.type, target: e2.name, context: r.context}) AS relations
            """
            result = session.run(query, article_id=article_id)
            record = result.single()
            
            if not record:
                return None
            
            return {
                "article_id": article_id,
                "title": record["title"],
                "url": record["url"],
                "entity_count": record["entity_count"],
                "relation_count": record["relation_count"],
                "entities": [e for e in record["entities"] if e["name"]],
                "relations": [r for r in record["relations"] if r["source"]]
            }
    
    def get_article_graph_visualization(self, article_id, min_connections=0):
        """Get data formatted for network visualization for specific article subgraph"""
        with self.driver.session() as session:
            # Get connected nodes in this article's subgraph
            nodes_query = """
            MATCH (e:Entity)-[:IN_ARTICLE]->(a:Article {id: $article_id})
            
            // Count outgoing connections within the same article
            OPTIONAL MATCH (e)-[r:RELATED]->(other:Entity)
            WHERE r.article_id = $article_id
            
            WITH e, count(DISTINCT r) as connection_count
            
            // Filter by minimum connections
            WHERE connection_count >= $min_connections
            
            RETURN e.name as id,
                   e.name as label,
                   e.type as group,
                   e.context as title,
                   connection_count as value
            ORDER BY connection_count DESC
            """
            nodes_result = session.run(nodes_query, 
                                     article_id=article_id, 
                                     min_connections=min_connections)
            nodes = [record.data() for record in nodes_result]
            
            if not nodes:
                return {"nodes": [], "edges": []}
            
            # Get directed edges in this article's subgraph
            node_ids = [node['id'] for node in nodes]
            edges_query = """
            MATCH (source:Entity)-[r:RELATED]->(target:Entity)
            WHERE r.article_id = $article_id
              AND source.name IN $node_names 
              AND target.name IN $node_names
            RETURN DISTINCT source.name as source,
                   target.name as target,
                   r.type as label,
                   r.strength as value,
                   r.context as title
            """
            edges_result = session.run(edges_query, 
                                     article_id=article_id,
                                     node_names=node_ids)
            edges = [record.data() for record in edges_result]
            
            return {"nodes": nodes, "edges": edges}
    
    def get_all_articles(self):
        """Get list of all articles with metadata"""
        with self.driver.session() as session:
            query = """
            MATCH (a:Article)
            RETURN a.id AS id, 
                   a.title AS title,
                   a.url AS url,
                   a.entity_count AS entity_count,
                   a.relation_count AS relation_count,
                   a.created_at AS created_at
            ORDER BY a.created_at DESC
            """
            result = session.run(query)
            return [record.data() for record in result]
