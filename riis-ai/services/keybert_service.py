from keybert import KeyBERT

# Lazy-loaded on first use rather than at import time (SDD 2.2.3 still
# specifies the all-MiniLM-L6-v2 backbone; only the *timing* of the load
# changed, to keep this service's idle memory footprint low and avoid
# OOM restarts when multiple models would otherwise load eagerly at boot).
_kw_model = None

def get_model():
    global _kw_model
    if _kw_model is None:
        _kw_model = KeyBERT(model="all-MiniLM-L6-v2")
    return _kw_model

def extract_keywords(text: str, top_n: int = 10):
    """
    Extracts top N keyword phrases from the given text.
    Uses all-MiniLM-L6-v2 backbone as specified in SDD 2.2.3.
    Returns a list of (keyword, score) tuples.
    """
    if not text or len(text.split()) < 50:
        return []

    kw_model = get_model()
    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=top_n
    )
    return keywords