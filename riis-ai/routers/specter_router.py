from fastapi import APIRouter, Depends
from dependencies import verify_internal_caller
from models.schemas import (
    SPECTEREncodeRequest,
    SBERTEmbedResponse,
)
from services.specter_service import encode_pair

router = APIRouter(dependencies=[Depends(verify_internal_caller)])

@router.post("/ai/specter/encode")
def specter_encode(request: SPECTEREncodeRequest):
    embedding = encode_pair(request.title, request.abstract)
    return SBERTEmbedResponse(embedding=embedding)