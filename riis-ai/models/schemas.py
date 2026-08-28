from pydantic import BaseModel
from typing import List, Tuple

class KeyBERTRequest(BaseModel):
    text: str
    top_n: int = 10

class KeyBERTResponse(BaseModel):
    keywords: List[Tuple[str, float]]

class SBERTEmbedRequest(BaseModel):
    text: str

class SBERTEmbedResponse(BaseModel):
    embedding: List[float]