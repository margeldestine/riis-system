import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Mail, X } from 'lucide-react'
import apiClient from '../../services/apiClient'

function extractApiErrorMessage(error, fallback) {
  if (error?.response?.status === 429) return 'Too many requests. Please try again later.'
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string' && data.trim()) return data
  return fallback
}

const EMAIL_PATTERN = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#C9A84C]'

/**
 * Public "Request full text" form. No login needed.
 * POST /api/v1/public/research/{id}/full-text-requests -> 202 { message }
 * record: { id, title }, institutionName: shown in the explanatory text.
 */
export default function RequestFullTextModal({ record, institutionName, onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    affiliation: '',
    purpose: '',
    website: '', // honeypot: real users never see or fill this
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [doneMessage, setDoneMessage] = useState('')

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')

    const name = form.name.trim()
    const email = form.email.trim()
    const purpose = form.purpose.trim()
    if (name.length < 2) return setError('Please enter your full name.')
    if (!EMAIL_PATTERN.test(email)) return setError('Please enter a valid email address.')
    if (purpose.length < 10) {
      return setError('Please tell the research office why you need the full text (at least 10 characters).')
    }

    setSubmitting(true)
    try {
      const res = await apiClient.post(`/public/research/${record.id}/full-text-requests`, {
        name,
        email,
        affiliation: form.affiliation.trim() || null,
        purpose,
        website: form.website,
      })
      setDoneMessage(res.data?.message || 'Your request was sent to the research office.')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to send your request right now.'))
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-full-text-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="request-full-text-title" className="text-lg font-serif text-[#1A1A2E]">
              Request full text
            </h2>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{record.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {doneMessage ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{doneMessage}</p>
            <p className="text-xs text-slate-500">
              A confirmation was sent to your email. The research office will contact you directly if the request is
              approved.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <p className="text-xs text-slate-500">
              DASIG does not host the full text. Your request goes to the research office of{' '}
              <strong>{institutionName || record.institutionName || 'the owning institution'}</strong>, which decides
              whether to share it. Your details are used only for this request.
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ftr-name">
                Full name *
              </label>
              <input
                id="ftr-name"
                className={inputClass}
                value={form.name}
                onChange={set('name')}
                maxLength={255}
                autoComplete="name"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ftr-email">
                Email *
              </label>
              <input
                id="ftr-email"
                type="email"
                className={inputClass}
                value={form.email}
                onChange={set('email')}
                maxLength={320}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ftr-aff">
                Affiliation (optional)
              </label>
              <input
                id="ftr-aff"
                className={inputClass}
                value={form.affiliation}
                onChange={set('affiliation')}
                maxLength={255}
                autoComplete="organization"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ftr-purpose">
                Why do you need the full text? *
              </label>
              <textarea
                id="ftr-purpose"
                rows={4}
                className={inputClass}
                value={form.purpose}
                onChange={set('purpose')}
                maxLength={2000}
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{form.purpose.length}/2000</p>
            </div>

            {/* Honeypot: hidden from people, bots tend to fill it */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
              <label htmlFor="ftr-website">Website</label>
              <input
                id="ftr-website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set('website')}
              />
            </div>

            {error ? (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
