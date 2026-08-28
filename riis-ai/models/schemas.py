from pydantic import BaseModel
from typing import List, Literal, Tuple

class KeyBERTRequest(BaseModel):
    text: str
    top_n: int = 10

class KeyBERTResponse(BaseModel):
    keywords: List[Tuple[str, float]]

class SBERTEmbedRequest(BaseModel):
    text: str

class SBERTEmbedResponse(BaseModel):
    embedding: List[float]

# --- Claude holistic review (rubric-based) ---

class ClaudeReviewRequest(BaseModel):
    paper_text: str
    rubric_version: str

class CriterionScore(BaseModel):
    name: str
    score: int
    justification: str

class ClaudeReviewResponse(BaseModel):
    status: Literal["SUCCESS"] = "SUCCESS"
    rubric_version: str
    overall_score: int
    criteria: List[CriterionScore]
    flags: List[str] = []
    summary: str

class ClaudeReviewFailure(BaseModel):
    status: Literal["FAILED"] = "FAILED"
    reason: str