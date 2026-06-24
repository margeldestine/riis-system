from fastapi import APIRouter
from models.schemas import (
    SBERTEmbedRequest,
    SBERTEmbedResponse,
    CentroidSimilarityRequest,
    CentroidSimilarityResponse,
)
from services.specter_service import encode_text, compute_centroid_similarities

router = APIRouter()

@router.post("/ai/specter/encode")
def specter_encode(request: SBERTEmbedRequest):
    embedding = encode_text(request.text)
    return SBERTEmbedResponse(embedding=embedding)

@router.post("/ai/specter/centroid-similarity")
def specter_centroid_similarity(request: CentroidSimilarityRequest):
    similarities = compute_centroid_similarities(request.embedding, request.centroids)
    return CentroidSimilarityResponse(similarities=similarities)