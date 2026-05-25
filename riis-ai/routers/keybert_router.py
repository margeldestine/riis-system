from fastapi import APIRouter
from models.schemas import KeyBERTRequest, KeyBERTResponse
from services.keybert_service import extract_keywords

router = APIRouter()

@router.post("/ai/keybert/extract", response_model=KeyBERTResponse)
def keybert_extract(request: KeyBERTRequest):
    """
    Accepts concatenated title + abstract + keywords text.
    Returns ranked keyword phrases with confidence scores.
    SDD 2.2.3 - KeyBERT Pipeline
    """
    keywords = extract_keywords(request.text, request.top_n)
    return KeyBERTResponse(keywords=keywords)