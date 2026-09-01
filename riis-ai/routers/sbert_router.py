from fastapi import APIRouter, Depends
from dependencies import verify_internal_caller
from models.schemas import SBERTEmbedRequest, SBERTEmbedResponse
from services.sbert_service import generate_embedding

router = APIRouter(dependencies=[Depends(verify_internal_caller)])

@router.post("/ai/sbert/embed", response_model=SBERTEmbedResponse)
def sbert_embed(request: SBERTEmbedRequest):
    embedding = generate_embedding(request.text)
    return SBERTEmbedResponse(embedding=embedding)