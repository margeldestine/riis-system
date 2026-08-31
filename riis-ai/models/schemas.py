from pydantic import BaseModel
from typing import List, Literal, Optional, Tuple

class KeyBERTRequest(BaseModel):
    text: str
    top_n: int = 10

class KeyBERTResponse(BaseModel):
    keywords: List[Tuple[str, float]]

class SBERTEmbedRequest(BaseModel):
    text: str

class SBERTEmbedResponse(BaseModel):
    embedding: List[float]

# --- SPECTER (allenai/specter) ---
#
# SPECTER's official training/fine-tuning convention takes structured
# (title, abstract) input rather than a pre-concatenated blob, so its
# request schema is intentionally separate from SBERTEmbedRequest above
# (SBERT/KeyBERT input formats are unaffected by this change). The
# response shape is the same generic {"embedding": [...]} used by SBERT,
# so SPECTEREncodeRequest reuses SBERTEmbedResponse rather than
# duplicating an identical response model.

class SPECTEREncodeRequest(BaseModel):
    title: str
    abstract: Optional[str] = ""

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