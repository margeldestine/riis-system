from fastapi import APIRouter
from models.schemas import (
    SPECTEREncodeRequest,
    SBERTEmbedResponse,
)
from services.specter_service import encode_pair

router = APIRouter()

@router.post("/ai/specter/encode")
def specter_encode(request: SPECTEREncodeRequest):
    embedding = encode_pair(request.title, request.abstract)
    return SBERTEmbedResponse(embedding=embedding)