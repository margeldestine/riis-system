from sentence_transformers import SentenceTransformer

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("allenai/specter")
    return _model

def _encode(text: str) -> list[float]:
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()

def encode_pair(title: str, abstract: str | None = "") -> list[float]:
    """
    Encodes (title, abstract) per SPECTER's (allenai/specter) official
    training/fine-tuning convention: "{title} [SEP] {abstract}". Plain
    string concatenation (title + " " + abstract + " " + keywords, as
    used elsewhere for SBERT/KeyBERT) does not match what SPECTER was
    fine-tuned on and degrades embedding quality for this model
    specifically -- this formatting is intentionally SPECTER-only.

    A missing/blank abstract still produces a well-formed
    "{title} [SEP]" input (via the trailing .strip()) rather than
    raising or silently omitting the separator, since callers may not
    always have an abstract available (e.g. a raw search query passed
    in the title slot with no abstract).
    """
    safe_title = title or ""
    safe_abstract = abstract or ""
    text = f"{safe_title} [SEP] {safe_abstract}".strip()
    return _encode(text)