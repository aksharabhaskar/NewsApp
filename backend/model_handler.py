# backend/model_handler.py

import tensorflow as tf
import numpy as np
import requests
from PIL import Image
from io import BytesIO
import torch
from transformers import CLIPProcessor, CLIPModel
import networkx as nx
from node2vec import Node2Vec
from typing import Dict, List

class FakeNewsDetector:
    def __init__(self, model_path: str):
        """
        Initialize the fake news detection model
        
        Args:
            model_path: Path to your trained Keras model (.h5 file)
        """
        print(f"🔄 Loading Keras model from {model_path}...")
        self.model = tf.keras.models.load_model(model_path)
        print("✅ Keras model loaded successfully!")
        
        # Initialize CLIP for image embeddings
        print("🔄 Loading CLIP model...")
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_model.eval()
        
        # Move CLIP to GPU if available
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.clip_model = self.clip_model.to(self.device)
        print(f"✅ CLIP model loaded on {self.device}")
        
        self.embedding_dim = 512
    
    def get_image_embedding(self, image_url: str) -> np.ndarray:
        """
        Get CLIP image embedding (512 dimensions)
        
        Args:
            image_url: URL of the image
            
        Returns:
            numpy array of shape (512,)
        """
        try:
            print(f"📸 Downloading image from: {image_url[:50]}...")
            
            # Download image
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(image_url, stream=True, timeout=10, headers=headers)
            response.raise_for_status()
            
            # Open and convert to RGB
            image = Image.open(BytesIO(response.content))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            print("✅ Image downloaded, generating embedding...")
            
            # Get CLIP embeddings
            with torch.no_grad():
                inputs = self.clip_processor(images=image, return_tensors="pt").to(self.device)
                embeddings = self.clip_model.get_image_features(**inputs)
                # Normalize embeddings
                embeddings = embeddings / embeddings.norm(p=2, dim=-1, keepdim=True)
            
            embedding = embeddings.cpu().squeeze().numpy()
            print(f"✅ Image embedding generated: shape {embedding.shape}")
            
            return embedding
            
        except Exception as e:
            print(f"❌ Image embedding error: {str(e)}")
            # Return zero vector if image fails
            return np.zeros(self.embedding_dim, dtype=np.float32)
    
    def generate_graph_embedding(self, entities: List[Dict], relations: List[Dict]) -> np.ndarray:
        """
        Generate graph embedding using Node2Vec (512 dimensions)
        
        Args:
            entities: List of entities from knowledge graph
                [{"name": "...", "type": "...", "context": "..."}]
            relations: List of relations from knowledge graph
                [{"source": "...", "target": "...", "relationship": "...", "context": "..."}]
        
        Returns:
            numpy array of shape (512,)
        """
        try:
            print(f"🕸️ Generating graph embedding from {len(entities)} entities, {len(relations)} relations...")
            
            # If no entities/relations, return zero vector
            if not entities and not relations:
                print("⚠️ No entities/relations found, returning zero vector")
                return np.zeros(self.embedding_dim, dtype=np.float32)
            
            # Build NetworkX graph
            G = nx.Graph()
            
            # Add entity nodes
            for entity in entities:
                entity_name = entity.get('name', '')
                entity_type = entity.get('type', 'UNKNOWN')
                if entity_name:
                    G.add_node(entity_name, type=entity_type)
            
            # Add relation edges
            for relation in relations:
                source = relation.get('source', '')
                target = relation.get('target', '')
                relationship = relation.get('relationship', 'related')
                
                if source and target:
                    G.add_edge(source, target, relationship=relationship)
            
            print(f"📊 Graph built: {len(G.nodes())} nodes, {len(G.edges())} edges")
            
            # If graph is too small, use simple embedding
            if len(G.nodes()) < 2:
                print("⚠️ Graph too small, using simple embedding")
                return self._simple_embedding(entities, relations)
            
            # Generate Node2Vec embeddings
            print("🔄 Running Node2Vec...")
            node2vec = Node2Vec(
                G,
                dimensions=self.embedding_dim,  # 512 dimensions
                walk_length=30,
                num_walks=100,
                workers=2,
                quiet=True
            )
            
            # Train the model
            model = node2vec.fit(
                window=10,
                min_count=1,
                epochs=10
            )
            
            # Aggregate node embeddings (mean pooling)
            node_embeddings = []
            for node in G.nodes():
                if node in model.wv:
                    node_embeddings.append(model.wv[node])
            
            if node_embeddings:
                graph_embedding = np.mean(node_embeddings, axis=0)
                print(f"✅ Graph embedding generated: shape {graph_embedding.shape}")
                return graph_embedding.astype(np.float32)
            else:
                print("⚠️ No valid node embeddings, using simple embedding")
                return self._simple_embedding(entities, relations)
                
        except Exception as e:
            print(f"❌ Graph embedding error: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._simple_embedding(entities, relations)
    
    def _simple_embedding(self, entities: List[Dict], relations: List[Dict]) -> np.ndarray:
        """
        Fallback simple embedding when Node2Vec fails
        Creates a basic feature vector from entity/relation counts
        """
        print("📝 Using simple embedding fallback")
        
        # Count entity types
        entity_types = {}
        for entity in entities:
            etype = entity.get('type', 'UNKNOWN')
            entity_types[etype] = entity_types.get(etype, 0) + 1
        
        # Create feature vector
        features = [
            len(entities),
            len(relations),
            entity_types.get('PERSON', 0),
            entity_types.get('ORGANIZATION', 0),
            entity_types.get('LOCATION', 0),
            entity_types.get('EVENT', 0),
            entity_types.get('DATE', 0),
        ]
        
        # Pad to 512 dimensions
        embedding = np.zeros(self.embedding_dim, dtype=np.float32)
        embedding[:len(features)] = features
        
        return embedding
    
    def predict(self, image_url: str, entities: List[Dict], relations: List[Dict]) -> Dict:
        """
        Make prediction using your trained model
        
        Args:
            image_url: URL of the article image
            entities: List of entities from knowledge graph
            relations: List of relations from knowledge graph
        
        Returns:
            {
                'prediction': 'REAL' or 'FAKE',
                'confidence': 0.0-1.0,
                'real_probability': 0.0-1.0,
                'fake_probability': 0.0-1.0,
                'raw_score': float (model output before thresholding)
            }
        """
        try:
            print("\n" + "="*60)
            print("🔍 STARTING FAKE NEWS DETECTION")
            print("="*60)
            
            # Generate embeddings
            graph_embedding = self.generate_graph_embedding(entities, relations)
            image_embedding = self.get_image_embedding(image_url)
            
            print(f"\n📊 Embedding shapes:")
            print(f"   Graph: {graph_embedding.shape}")
            print(f"   Image: {image_embedding.shape}")
            
            # Reshape for model input
            graph_input = graph_embedding.reshape(1, -1)
            image_input = image_embedding.reshape(1, -1)
            
            print(f"\n🤖 Running model prediction...")
            
            # Make prediction
            # Your model expects: [graph_input, image_input]
            probability = self.model.predict([graph_input, image_input], verbose=0)
            
            # Extract probability (assuming output shape is (1, 1))
            fake_prob = float(probability[0][0])
            real_prob = 1.0 - fake_prob
            
            # Threshold at 0.5
            prediction = "FAKE" if fake_prob > 0.5 else "REAL"
            confidence = max(fake_prob, real_prob)
            
            print(f"\n✅ PREDICTION COMPLETE")
            print(f"   Result: {prediction}")
            print(f"   Confidence: {confidence:.2%}")
            print(f"   Real probability: {real_prob:.2%}")
            print(f"   Fake probability: {fake_prob:.2%}")
            print("="*60 + "\n")
            
            return {
                'prediction': prediction,
                'confidence': round(confidence, 4),
                'real_probability': round(real_prob, 4),
                'fake_probability': round(fake_prob, 4),
                'raw_score': round(fake_prob, 4)
            }
        
        except Exception as e:
            print(f"\n❌ PREDICTION FAILED")
            print(f"   Error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Prediction failed: {str(e)}")


# Global model instance
fake_news_model = None

def initialize_model(model_path: str):
    """Initialize the model once at startup"""
    global fake_news_model
    try:
        fake_news_model = FakeNewsDetector(model_path)
        print("✅ Fake news detection system initialized successfully!")
    except Exception as e:
        print(f"❌ Failed to initialize model: {e}")
        import traceback
        traceback.print_exc()
        fake_news_model = None

def get_model():
    """Get the global model instance"""
    if fake_news_model is None:
        raise Exception("Model not initialized. Call initialize_model() first.")
    return fake_news_model
