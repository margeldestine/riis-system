import { useState } from 'react'
import { ExternalLink, FileText, Mail } from 'lucide-react'
import RequestFullTextModal from './RequestFullTextModal'
import { safeExternalUrl } from './accessTiers'

/**
 * The "Full text" control, driven by the server's `fullText` object:
 *   { type: 'DOI_LINK', url }     -> link out to the publisher / DOI page
 *   { type: 'REQUEST_FORM', url } -> open the "Request full text" form
 * If `fullText` is missing (older response), it falls back to the request form,
 * which is the safe choice.
 *
 * variant "card":  small buttons for result cards.
 * variant "panel": large buttons for the record page sidebar. With a DOI link it also
 *                  offers the request form as a second, quieter option.
 */
export default function FullTextAction({ record, variant = 'card', institutionName }) {
  const [open, setOpen] = useState(false)
  if (!record) return null

  const action = record.fullText
  const doiUrl = action?.type === 'DOI_LINK' ? safeExternalUrl(action.url) : null
  const isPanel = variant === 'panel'

  const linkClass = isPanel
    ? 'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
    : 'flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap'

  const primaryRequestClass = isPanel
    ? 'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
    : 'flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap'

  const secondaryRequestClass =
    'flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'

  return (
    <>
      {doiUrl ? (
        <a
          href={doiUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={linkClass}
          style={isPanel ? { background: '#1a6e3c' } : undefined}
        >
          <FileText className={isPanel ? 'h-4 w-4' : 'h-3 w-3'} />
          {isPanel ? 'Full text at publisher' : 'Full text'}
          <ExternalLink className={isPanel ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
        </a>
      ) : null}

      {!doiUrl || isPanel ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={doiUrl ? secondaryRequestClass : primaryRequestClass}
          style={!doiUrl && isPanel ? { background: '#1A1A2E' } : undefined}
        >
          <Mail className={isPanel ? 'h-4 w-4' : 'h-3 w-3'} />
          {doiUrl ? "Can't access it? Request full text" : 'Request full text'}
        </button>
      ) : null}

      {open ? (
        <RequestFullTextModal
          record={record}
          institutionName={institutionName || record.institutionName}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
