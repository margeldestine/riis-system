from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-mpnet-base-v2")

def generate_embedding(text: str) -> list[float]:
    if not text or len(text.split()) < 10:
        return []
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()