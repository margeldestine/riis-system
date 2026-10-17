// Shared helpers for the public portal's tiered access (Priority 1 / Phase 5).
// Values must match the backend enum AccessVisibility exactly.

export const VISIBILITY_LABELS = {
  PUBLIC: 'Public',
  METADATA_ONLY: 'Metadata only',
  RESTRICTED: 'Restricted',
}

export function visibilityLabel(value) {
  return VISIBILITY_LABELS[value] || ''
}

export function visibilityBadgeClasses(value) {
  if (value === 'METADATA_ONLY') return 'bg-amber-100 text-amber-700'
  if (value === 'RESTRICTED') return 'bg-slate-200 text-slate-700'
  return 'bg-emerald-100 text-emerald-700'
}

/**
 * The backend returns "" / null for hidden fields instead of removing them.
 * The abstract counts as withheld when the record is not PUBLIC and no abstract came back.
 * (Owners and DOST admins still receive the abstract, so for them this is false.)
 */
export function isAbstractWithheld(record) {
  if (!record || !record.visibility || record.visibility === 'PUBLIC') return false
  return !record.abstractText && !record.abstractExcerpt
}

/** Only ever render links that the server built as https URLs. */
export function safeExternalUrl(url) {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  return /^https:\/\/[^\s]+$/i.test(trimmed) ? trimmed : null
}
