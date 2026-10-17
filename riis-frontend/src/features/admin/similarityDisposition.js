// riis-frontend/src/features/admin/similarityDisposition.js
// Shared constants/helpers for the Similarity Flag disposition workflow.
// Values must match com.geeks.riis_backend.model.SimilarityDispositionStatus.

export const DISPOSITION_STATUSES = [
  {
    value: 'OPEN',
    label: 'Open',
    badge: 'badge-error',
    hint: 'Not yet reviewed, or re-opened because new evidence appeared.',
  },
  {
    value: 'REVIEWED_NO_ISSUE',
    label: 'Reviewed - no issue',
    badge: 'badge-success',
    hint: 'The overlap is coincidental or acceptable (e.g. same topic, different work).',
  },
  {
    value: 'REFERRED_FOR_COLLABORATION',
    label: 'Referred for collaboration',
    badge: 'badge-info',
    hint: 'Both teams work on the same problem; suggest they connect.',
  },
  {
    value: 'ESCALATED_TO_RESEARCH_OFFICE',
    label: 'Escalated to research office',
    badge: 'badge-warning',
    hint: 'Needs a closer look by the institution\u2019s research office.',
  },
]

export function dispositionMeta(status) {
  return DISPOSITION_STATUSES.find((item) => item.value === status) || DISPOSITION_STATUSES[0]
}

export function formatDateTime(iso) {
  if (!iso) return '\u2014'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export const MIN_NOTE_LENGTH = 5
export const MAX_NOTE_LENGTH = 2000