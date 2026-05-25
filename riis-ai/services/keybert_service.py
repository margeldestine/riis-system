from keybert import KeyBERT

# Load model once at startup — held in memory (SDD 2.2.3)
kw_model = KeyBERT(model="all-MiniLM-L6-v2")

def extract_keywords(text: str, top_n: int = 10):
    """
    Extracts top N keyword phrases from the given text.
    Uses all-MiniLM-L6-v2 backbone as specified in SDD 2.2.3.
    Returns a list of (keyword, score) tuples.
    """
    if not text or len(text.split()) < 50:
        return []

    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=top_n
    )
    return keywords