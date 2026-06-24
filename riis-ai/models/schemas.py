from pydantic import BaseModel
from typing import List, Tuple
from typing import Dict

class KeyBERTRequest(BaseModel):
    text: str
    top_n: int = 10

class KeyBERTResponse(BaseModel):
    keywords: List[Tuple[str, float]]

class SBERTEmbedRequest(BaseModel):
    text: str

class SBERTEmbedResponse(BaseModel):
    embedding: List[float]

# --- Append to models/schemas.py, below the existing classes ---

class CentroidSimilarityRequest(BaseModel):
    embedding: List[float]
    centroids: Dict[str, List[float]]  # clusterId -> centroid vector

class CentroidSimilarityResponse(BaseModel):
    similarities: Dict[str, float]  # clusterId -> cosine similarity score