// Small formatting helpers for the Documents summary on the record page and for the related-research
// cards. Plain JavaScript with no React code, so they can be unit tested (documentFormat.test.js).

/** 1536 gives "1.5 KB", 1048576 gives "1.0 MB", 12582912 gives "12 MB". An unusable value gives "". */
export function formatFileSize(bytes) {
  const size = Number(bytes)
  if (bytes == null || bytes === '' || !Number.isFinite(size) || size < 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  if (unit === 0) return `${Math.round(value)} B`
  const text = value >= 10 ? String(Math.round(value)) : value.toFixed(1)
  // 1023.96 KB would print as "1024 KB", so move it up to the next unit instead.
  if (Number(text) >= 1024 && unit < units.length - 1) return formatFileSize(1024 ** (unit + 1))
  return `${text} ${units[unit]}`
}

/** "application/pdf" gives "PDF document". Anything else falls back to the file extension. */
export function documentTypeLabel(contentType, fileName) {
  const type = String(contentType || '').split(';')[0].trim().toLowerCase()
  if (type === 'application/pdf') return 'PDF document'
  const extension = String(fileName || '').match(/\.([A-Za-z0-9]{1,5})$/)?.[1]
  if (extension) return `${extension.toUpperCase()} file`
  return 'Document'
}

const RESEARCH_TYPE_LABELS = {
  JOURNAL_ARTICLE: 'Journal Article',
  CONFERENCE_PAPER: 'Conference Paper',
  FUNDED_PROJECT: 'Funded Project',
  INNOVATION_OUTPUT: 'Innovation Output',
  IP_REGISTRATION: 'IP Registration',
  COMMUNITY_EXTENSION_RESEARCH: 'Community Extension Research',
}

/** Accepts the label the form stores ("Journal Article") and the enum style (JOURNAL_ARTICLE). */
export function researchTypeLabel(type) {
  const text = String(type || '').trim()
  if (!text) return ''
  const key = text.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (RESEARCH_TYPE_LABELS[key]) return RESEARCH_TYPE_LABELS[key]
  return text
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
