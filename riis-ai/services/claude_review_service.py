"""
Calls Claude to produce a rubric-based holistic quality review of a
submitted research paper.

Deliberately fail-closed: `run_claude_review()` never raises out to the
router and never returns a guessed/partial score. Any timeout, missing or
invalid API key, connection problem, or response that doesn't match the
expected JSON schema results in a typed `ClaudeReviewFailure` instead.
"""

import json
import logging
import os
from typing import Optional, Union

import anthropic
from pydantic import ValidationError

from models.schemas import ClaudeReviewFailure, ClaudeReviewResponse, CriterionScore
from rubric.quality_rubric import (
    RUBRIC_VERSION,
    build_system_instructions,
    build_user_message,
)

logger = logging.getLogger(__name__)

# Overridable via env for model upgrades without a code change; defaults
# to the current general-purpose Claude model.
CLAUDE_MODEL = os.environ.get("CLAUDE_REVIEW_MODEL", "claude-sonnet-5")

CLIENT_TIMEOUT_SECONDS = 60.0
MAX_RETRIES = 1
MAX_TOKENS = 4096


def _get_client() -> Optional[anthropic.Anthropic]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return anthropic.Anthropic(
        api_key=api_key,
        timeout=CLIENT_TIMEOUT_SECONDS,
        max_retries=MAX_RETRIES,
    )


def _extract_text(message) -> Optional[str]:
    """Pull the first text block out of a Claude Messages API response."""
    for block in getattr(message, "content", []) or []:
        if getattr(block, "type", None) == "text":
            return block.text
    return None


def run_claude_review(
    paper_text: str, rubric_version: str
) -> Union[ClaudeReviewResponse, ClaudeReviewFailure]:
    if not paper_text or not paper_text.strip():
        return ClaudeReviewFailure(reason="paper_text is empty.")

    if rubric_version != RUBRIC_VERSION:
        # Not fatal — we always score against the currently active rubric
        # and report which version was actually used — but worth a log
        # line so a caller pinned to a stale version notices in ops.
        logger.warning(
            "Requested rubric_version '%s' does not match the active rubric '%s'.",
            rubric_version,
            RUBRIC_VERSION,
        )

    client = _get_client()
    if client is None:
        logger.error("ANTHROPIC_API_KEY is not set in the environment.")
        return ClaudeReviewFailure(reason="ANTHROPIC_API_KEY is not configured on the server.")

    system_instructions = build_system_instructions()
    user_message = build_user_message(paper_text)

    try:
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=system_instructions,
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.AuthenticationError as e:
        logger.error("Claude review failed: invalid API key. %s", e)
        return ClaudeReviewFailure(reason="Invalid ANTHROPIC_API_KEY.")
    except anthropic.APITimeoutError as e:
        logger.error("Claude review timed out after %ss. %s", CLIENT_TIMEOUT_SECONDS, e)
        return ClaudeReviewFailure(reason="Claude request timed out.")
    except anthropic.APIConnectionError as e:
        logger.error("Claude review connection error. %s", e)
        return ClaudeReviewFailure(reason="Could not connect to the Claude API.")
    except anthropic.APIStatusError as e:
        logger.error("Claude review API error: status=%s body=%s", e.status_code, e.message)
        return ClaudeReviewFailure(reason=f"Claude API returned an error (status {e.status_code}).")
    except Exception as e:
        logger.error("Unexpected error calling Claude: %s", e)
        return ClaudeReviewFailure(reason="Unexpected error while contacting Claude.")

    raw_text = _extract_text(message)
    if not raw_text:
        logger.error("Claude response contained no text content.")
        return ClaudeReviewFailure(reason="Claude response contained no text content.")

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error("Claude response was not valid JSON: %s", e)
        return ClaudeReviewFailure(reason="Claude response was not valid JSON.")

    if not isinstance(parsed, dict):
        logger.error("Claude response JSON was not an object.")
        return ClaudeReviewFailure(reason="Claude response was not a JSON object.")

    try:
        criteria = [CriterionScore(**c) for c in parsed["criteria"]]
        review = ClaudeReviewResponse(
            rubric_version=RUBRIC_VERSION,
            overall_score=parsed["overall_score"],
            criteria=criteria,
            flags=parsed.get("flags", []),
            summary=parsed["summary"],
        )
    except (ValidationError, KeyError, TypeError) as e:
        logger.error("Claude response failed schema validation: %s", e)
        return ClaudeReviewFailure(reason="Claude response did not match the expected schema.")

    return review