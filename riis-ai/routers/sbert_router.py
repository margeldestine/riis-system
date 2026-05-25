from fastapi import APIRouter
from models.schemas import SBERTEmbedRequest, SBERTEmbedResponse
from services.sbert_service import generate_embedding

router = APIRouter()

@router.post("/ai/sbert/embed", response_model=SBERTEmbedResponse)
def sbert_embed(request: SBERTEmbedRequest):
    embedding = generate_embedding(request.text)
    return SBERTEmbedResponse(embedding=embedding)