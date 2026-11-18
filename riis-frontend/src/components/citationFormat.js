// Requirement 1: small helpers for showing a record's worldwide citation count (from OpenAlex).
// They live in their own file because a React component file may only export components.
//
// A missing count (null) means "not available" (no DOI, or not checked yet). It is never shown as 0,
// because 0 would wrongly say "checked, and nobody has cited it".

const SOURCE_LABELS = { openalex: 'OpenAlex', manual: 'manual entry' }

export function hasCitationCount(record) {
  return typeof record?.citationCount === 'number'
}

function formatCitationDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** "Cited by 12 (OpenAlex), as of Nov 15, 2026", or "Not available". */
export function formatCitationSummary(record) {
  if (!hasCitationCount(record)) {
    return record?.doi ? 'Not available yet' : 'Not available (no DOI)'
  }
  const source = SOURCE_LABELS[record.citationSource] || record.citationSource
  const date = formatCitationDate(record.citationCheckedAt)
  return `Cited by ${record.citationCount.toLocaleString('en-PH')}${source ? ` (${source})` : ''}${date ? `, as of ${date}` : ''}`
}
