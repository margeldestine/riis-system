import os

from fastapi import Header, HTTPException


def _load_internal_service_token() -> str:
    """
    Read INTERNAL_SERVICE_TOKEN at import time and fail loudly if it isn't
    set, rather than letting the service boot with no way to ever
    authenticate a caller (which would make verify_internal_caller reject
    everyone, or -- if implemented carelessly -- silently accept everyone).
    This raises before FastAPI even finishes wiring up the routers, so a
    misconfigured deploy fails at startup, not on the first real request.
    """
    token = os.environ.get("INTERNAL_SERVICE_TOKEN")
    if not token or not token.strip():
        raise RuntimeError(
            "INTERNAL_SERVICE_TOKEN is not set. Refusing to start riis-ai "
            "without an internal service token configured -- set the "
            "INTERNAL_SERVICE_TOKEN environment variable before starting "
            "this service."
        )
    return token


INTERNAL_SERVICE_TOKEN = _load_internal_service_token()


def verify_internal_caller(x_internal_token: str | None = Header(default=None)):
    """
    FastAPI dependency gating every riis-ai route behind a shared-secret
    header. This is defense-in-depth, not network isolation -- the actual
    deploy should also confirm riis-ai has no public ingress route. This
    check exists for the case where that network boundary is ever
    misconfigured or bypassed.

    FastAPI maps the header name X-Internal-Token to the parameter name
    x_internal_token automatically (hyphens <-> underscores). The header
    is declared optional (default=None) here rather than required, so a
    missing header and a wrong header both fall through to the same 401
    below -- with Header(...) (required), FastAPI's own validation layer
    intercepts a missing header before this function body ever runs and
    returns 422 instead, which doesn't match the intended "401 on
    mismatch or missing header" behavior.
    """
    if x_internal_token is None or x_internal_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")