from typing import Union

from fastapi import APIRouter

from models.schemas import ClaudeReviewFailure, ClaudeReviewRequest, ClaudeReviewResponse
from services.claude_review_service import run_claude_review

router = APIRouter()


@router.post("/ai/claude/review", response_model=Union[ClaudeReviewResponse, ClaudeReviewFailure])
def claude_review(request: ClaudeReviewRequest):
    """
    Sends paper_text to Claude for a rubric-guided holistic quality review.
    Claude acts as an aid to a human reviewer here, never a final
    decision/award mechanism — see rubric.quality_rubric.build_system_instructions
    for the exact instructions sent to the model.

    Fails closed: a timeout, a missing/invalid ANTHROPIC_API_KEY, or a
    Claude response that doesn't match the expected schema all return a
    ClaudeReviewFailure rather than a partially-populated result.
    """
    return run_claude_review(paper_text=request.paper_text, rubric_version=request.rubric_version)