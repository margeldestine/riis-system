from sentence_transformers import SentenceTransformer

# Lazy-loaded on first use rather than at import time, to keep idle
# memory low and avoid OOM restarts when multiple models would
# otherwise load eagerly at boot.
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-mpnet-base-v2")
    return _model

def generate_embedding(text: str) -> list[float]:
    if not text or len(text.split()) < 10:
        return []
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()