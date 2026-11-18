import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CITATION_STYLES, buildCitation, hasCitableMetadata } from './citations'
import { copyCitation } from './clipboard'
import { loadCitationStyle, saveCitationStyle } from './citationPreference'

// Requirement 3: a shortcut on result cards. One click on a style copies the finished citation
// (for Chicago, the bibliography entry) without opening the record.
export default function CitationQuickCopy({ record }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const rootRef = useRef(null)

  // Close the menu when the person clicks elsewhere or presses Escape.
  useEffect(() => {
    if (!open) return undefined
    const onMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!hasCitableMetadata(record)) return null

  const copyInStyle = async (style) => {
    const url = `${window.location.origin}/research/${record.id}`
    const [entry] = buildCitation(record, style.id, { url }).entries
    const copied = await copyCitation(entry)
    saveCitationStyle(style.id)
    setOpen(false)
    setMessage(copied ? `Copied ${style.label}` : 'Copy failed')
    window.setTimeout(() => setMessage(''), 2000)
  }

  const preferred = loadCitationStyle()

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 whitespace-nowrap"
      >
        {message || 'Copy citation'}
        {message ? null : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-full min-w-[9rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {CITATION_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              role="menuitem"
              onClick={() => copyInStyle(style)}
              className={`block w-full px-3.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 ${
                style.id === preferred ? 'font-semibold text-[#0A2A66]' : 'text-slate-600'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
