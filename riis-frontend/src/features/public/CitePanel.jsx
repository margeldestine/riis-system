import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { CITATION_STYLES, buildCitation } from './citations'
import { copyCitation } from './clipboard'
import { loadCitationStyle, saveCitationStyle } from './citationPreference'

// Shows the citation text, with the italic parts in italics.
function CitationText({ segments }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.italic ? <i key={index}>{segment.text}</i> : <span key={index}>{segment.text}</span>,
      )}
    </>
  )
}

// Requirement 12: a "Cite this record" card with a style picker and a Copy button for each entry.
export default function CitePanel({ record }) {
  const [styleId, setStyleId] = useState(loadCitationStyle)
  const [copiedKey, setCopiedKey] = useState('')

  const url = `${window.location.origin}/research/${record.id}`
  const { entries } = buildCitation(record, styleId, { url })

  const chooseStyle = (id) => {
    setStyleId(id)
    saveCitationStyle(id)
    setCopiedKey('')
  }

  const handleCopy = async (entry, key) => {
    const copied = await copyCitation(entry)
    setCopiedKey(copied ? key : 'failed')
    window.setTimeout(() => setCopiedKey(''), 2000)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cite this record</p>

      <div role="tablist" aria-label="Citation style" className="mb-4 flex flex-wrap gap-2">
        {CITATION_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            role="tab"
            aria-selected={style.id === styleId}
            onClick={() => chooseStyle(style.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              style.id === styleId
                ? 'border-[#0A2A66] bg-[#0A2A66] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {style.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {entries.map((entry, index) => {
          const key = `${styleId}-${index}`
          return (
            <div key={key}>
              {entry.label ? (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{entry.label}</p>
              ) : null}
              <p className="break-words rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                <CitationText segments={entry.segments} />
              </p>
              <button
                type="button"
                onClick={() => handleCopy(entry, key)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {copiedKey === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedKey === key ? 'Copied!' : copiedKey === 'failed' ? 'Copy failed' : 'Copy'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Titles are shown as submitted. Volume, issue and page numbers are not stored in DASIG, so add them if your
        style or instructor requires them.
      </p>
    </div>
  )
}
