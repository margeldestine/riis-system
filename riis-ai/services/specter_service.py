from sentence_transformers import SentenceTransformer
import numpy as np

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("allenai/specter")
    return _model

def encode_text(text: str) -> list[float]:
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()

def compute_centroid_similarities(embedding: list[float], centroids: dict[str, list[float]]) -> dict[str, float]:
    """
    Computes cosine similarity between a query embedding and each named
    centroid vector. Stateless: centroids are supplied by the caller on every
    request (read fresh from clusters.centroid_vector in Postgres) rather
    than cached here, so the nightly CentroidRecomputationScheduler + Postgres
    remain the single source of truth for centroids.
 
    True cosine similarity is used (not a raw dot product) because query
    embeddings from encode_text() are unit-normalized, but centroid vectors
    are a mean of multiple embeddings and are NOT guaranteed unit-norm.
    """
    if not embedding or not centroids:
        return {}
 
    query_vec = np.array(embedding, dtype=np.float64)
    query_norm = np.linalg.norm(query_vec)
    if query_norm == 0:
        return {cluster_id: 0.0 for cluster_id in centroids}
 
    similarities: dict[str, float] = {}
    for cluster_id, centroid in centroids.items():
        if not centroid:
            similarities[cluster_id] = 0.0
            continue
        centroid_vec = np.array(centroid, dtype=np.float64)
        centroid_norm = np.linalg.norm(centroid_vec)
        if centroid_norm == 0:
            similarities[cluster_id] = 0.0
            continue
        cosine = float(np.dot(query_vec, centroid_vec) / (query_norm * centroid_norm))
        similarities[cluster_id] = cosine
 
    return similarities