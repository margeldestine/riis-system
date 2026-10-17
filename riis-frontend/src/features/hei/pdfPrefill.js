// riis-frontend/src/features/hei/pdfPrefill.js
// Pure helpers for the guided PDF intake (no React, no network) so the mapping
// from the extraction API to react-hook-form values is easy to reason about.

export const MAX_PDF_BYTES = 20 * 1024 * 1024 // same ceiling as the backend (multipart + S3UploadService)

// Form field names the backend reports confidence for.
export const AUTOFILL_FIELDS = ['title', 'authors', 'abstractText', 'keywords', 'doi']

export const AUTOFILL_FIELD_LABELS = {
  title: 'Title',
  authors: 'Authors',
  abstractText: 'Abstract',
  keywords: 'Keywords',
  doi: 'DOI',
}

/** Returns an error message, or null when the file is acceptable. */
export function validatePdfFile(file) {
  if (!file) return 'Choose a PDF file first.'
  const looksLikePdf =
    file.type === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) return 'Only PDF files can be read.'
  if (file.size > MAX_PDF_BYTES) return 'That PDF is larger than 20 MB.'
  if (file.size === 0) return 'That file is empty.'
  return null
}

/**
 * Maps a PdfMetadataExtractionResponseDTO to:
 *  - values: only the form fields that actually have content (never overwrites with blanks)
 *  - filled: { fieldName: 'HIGH' | 'MEDIUM' | 'LOW' } for the "auto-filled" badges
 */
export function buildPrefill(result) {
  const values = {}
  const filled = {}
  if (!result) return { values, filled }

  const confidence = result.confidence || {}
  const mark = (field) => {
    filled[field] = confidence[field] && confidence[field] !== 'NONE' ? confidence[field] : 'LOW'
  }

  if (typeof result.title === 'string' && result.title.trim()) {
    values.title = result.title.trim()
    mark('title')
  }
  if (Array.isArray(result.authors) && result.authors.length > 0) {
    values.authors = result.authors.map((fullName) => ({ fullName, orcidId: '' }))
    mark('authors')
  }
  if (typeof result.abstractText === 'string' && result.abstractText.trim()) {
    values.abstractText = result.abstractText.trim()
    mark('abstractText')
  }
  if (Array.isArray(result.keywords) && result.keywords.length > 0) {
    values.keywords = result.keywords
    mark('keywords')
  }
  if (typeof result.doi === 'string' && result.doi.trim()) {
    values.doi = result.doi.trim()
    mark('doi')
  }
  return { values, filled }
}

/**
 * react-hook-form's dirtyFields is nested (arrays of objects for field arrays, arrays of
 * booleans for primitive arrays) and an empty array is truthy, so a plain Boolean() check
 * would report "edited" for untouched fields.
 */
export function isDirtyValue(value) {
  if (Array.isArray(value)) return value.some(isDirtyValue)
  if (value && typeof value === 'object') return Object.values(value).some(isDirtyValue)
  return Boolean(value)
}