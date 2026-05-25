from fastapi import APIRouter
from models.schemas import SBERTEmbedRequest, SBERTEmbedResponse
from services.specter_service import encode_text

router = APIRouter()

@router.post("/ai/specter/encode")
def specter_encode(request: SBERTEmbedRequest):
    embedding = encode_text(request.text)
    return SBERTEmbedResponse(embedding=embedding)