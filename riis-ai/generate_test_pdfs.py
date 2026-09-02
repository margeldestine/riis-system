"""
Generates two throwaway test PDFs for PHASE1_MANUAL_E2E_VERIFICATION
scenarios (c) and (d). Run from inside the riis-ai venv:

    pip install reportlab
    python generate_test_pdfs.py

Produces:
  - scanned_or_minimal.pdf  (scenario c: under the 50-word floor)
  - oversized.pdf           (scenario d: well over 15,000 words)
"""

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# --- Scenario (c): under MIN_WORDS_FOR_VALID_TEXT (50 words) ---
# A real scanned PDF has no text layer at all; a PDF with only a title
# and nothing else hits the same code path since it lands under the
# 50-word floor either way (per the guide's own note in section 3, (c)).
c = canvas.Canvas("scanned_or_minimal.pdf", pagesize=letter)
c.setFont("Helvetica-Bold", 18)
c.drawString(100, 700, "Draft Report")
c.save()
print("Wrote scanned_or_minimal.pdf")

# --- Scenario (d): well over MAX_WORDS (15,000 words) ---
d = canvas.Canvas("oversized.pdf", pagesize=letter)
d.setFont("Helvetica", 10)

paragraph = (
    "This is filler text generated purely to exceed the fifteen thousand "
    "word cap enforced by PdfTextExtractionService before the extracted "
    "text is ever sent to Claude for holistic review. "
) * 4  # ~65 words per repeated block

word_count = 0
target_words = 16000  # comfortably over the 15,000-word cap
y = 750

while word_count < target_words:
    if y < 50:
        d.showPage()
        d.setFont("Helvetica", 10)
        y = 750
    d.drawString(50, y, paragraph[:110])  # keep lines from overflowing the page width
    y -= 12
    word_count += len(paragraph.split())

d.save()
print(f"Wrote oversized.pdf (~{word_count} words)")
