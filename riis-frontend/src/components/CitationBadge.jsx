import { formatCitationSummary, hasCitationCount } from './citationFormat'

// Requirement 1: shows a record's worldwide citation count (from OpenAlex).
// variant="compact": a small pill for result cards. Shows nothing when there is no count.
// variant="full": one line of text for detail pages, including the source and the date.
export default function CitationBadge({ record, variant = 'compact' }) {
  if (variant === 'full') {
    return <p className="text-sm font-medium text-[#1A1A2E]">{formatCitationSummary(record)}</p>
  }
  if (!hasCitationCount(record)) return null
  return (
    <span
      title={formatCitationSummary(record)}
      className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
    >
      Cited by {record.citationCount.toLocaleString('en-PH')}
    </span>
  )
}
