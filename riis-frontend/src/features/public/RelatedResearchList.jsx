import VisibilityBadge from './VisibilityBadge'
import CitationBadge from '../../components/CitationBadge'
import { researchTypeLabel } from './documentFormat'

// One "Related Research" list used on the record page and in the results drawer.
// Each item: { id, title, institutionName, researchType, completionYear, similarityScore, sharedKeywords,
//              reason, reasons: [{ kind, text }], citationCount, ..., visibility }

// Requirement 13: each reason is a small coloured chip, so a reader sees at a glance WHY a record is suggested.
const REASON_STYLES = {
  topic: 'border-blue-100 bg-blue-50 text-blue-700',
  theme: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  keywords: 'border-amber-100 bg-amber-50 text-amber-800',
  institution: 'border-slate-200 bg-slate-100 text-slate-600',
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="h-3 w-4/5 rounded bg-slate-200" />
          <div className="h-3 w-2/5 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

// An older backend only sends the single "reason" sentence, so fall back to it as one chip.
function reasonsOf(item) {
  if (Array.isArray(item.reasons) && item.reasons.length > 0) return item.reasons
  return item.reason ? [{ kind: 'keywords', text: item.reason }] : []
}

export default function RelatedResearchList({ related, loading = false, onSelect, emptyText = 'No related records found.' }) {
  if (loading) return <Skeleton />

  if (!related || related.length === 0) {
    return <p className="text-xs text-slate-400 italic">{emptyText}</p>
  }

  return (
    <ul className="space-y-3">
      {related.map((r) => {
        const details = [r.completionYear, researchTypeLabel(r.researchType)].filter(Boolean).join(' · ')
        const reasons = reasonsOf(r)
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className="w-full space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#1A1A2E]">{r.title}</p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">{r.institutionName}</span>
                {details ? <span className="text-xs text-slate-400">{details}</span> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.similarityScore != null && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {r.similarityScore}% match
                  </span>
                )}
                <CitationBadge record={r} />
                {r.visibility && r.visibility !== 'PUBLIC' && <VisibilityBadge visibility={r.visibility} />}
              </div>

              {reasons.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {reasons.map((reason) => (
                    <span
                      key={`${reason.kind}-${reason.text}`}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${REASON_STYLES[reason.kind] || REASON_STYLES.keywords}`}
                    >
                      {reason.text}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}