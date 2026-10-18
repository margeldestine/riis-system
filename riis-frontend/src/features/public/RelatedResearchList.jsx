import VisibilityBadge from './VisibilityBadge'

// Priority 5: one "Related Research" list used on the record page and in the results drawer.
// Each item: { id, title, institutionName, similarityScore, sharedKeywords, reason, visibility }

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

export default function RelatedResearchList({ related, loading = false, onSelect, emptyText = 'No related records found.' }) {
  if (loading) return <Skeleton />

  if (!related || related.length === 0) {
    return <p className="text-xs text-slate-400 italic">{emptyText}</p>
  }

  return (
    <ul className="space-y-3">
      {related.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onSelect(r.id)}
            className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition space-y-1.5"
          >
            <p className="text-sm font-semibold text-[#1A1A2E] leading-snug line-clamp-2">{r.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">{r.institutionName}</span>
              {r.similarityScore != null && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {r.similarityScore}% match
                </span>
              )}
              {r.visibility && r.visibility !== 'PUBLIC' && <VisibilityBadge visibility={r.visibility} />}
            </div>
            {r.reason && <p className="text-[11px] text-slate-500">{r.reason}</p>}
          </button>
        </li>
      ))}
    </ul>
  )
}