import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, X, XCircle } from 'lucide-react'
import apiClient from '../../services/apiClient'

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (data?.error) return data.error
  if (typeof data === 'string') return data
  return fallbackMessage
}

function normalizeStatus(value) {
  return (value || '').toString().trim().toUpperCase()
}

function formatStatusLabel(status) {
  const value = normalizeStatus(status)
  if (value === 'APPROVED' || value === 'VALIDATED') return 'Approved'
  if (
    value === 'PENDING_REVIEW' ||
    value === 'PENDING' ||
    value === 'UNDER_REVIEW' ||
    value === 'PENDING_APPROVAL' ||
    value === 'PENDING_APPROVE'
  ) {
    return 'Under Review'
  }
  if (value === 'REQUIRES_CORRECTION') return 'Requires Correction'
  if (value === 'REJECTED') return 'Rejected'
  if (value === 'DRAFT') return 'Draft'
  return status || 'Unknown'
}

// Same badge classes as SubmissionHistory's table, so the status reads
// identically whether you're looking at the list or this panel.
function getStatusBadgeClasses(status) {
  const value = normalizeStatus(status)

  if (value === 'APPROVED' || value === 'VALIDATED') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (
    value === 'PENDING_REVIEW' ||
    value === 'PENDING' ||
    value === 'UNDER_REVIEW' ||
    value === 'PENDING_APPROVAL' ||
    value === 'PENDING_APPROVE'
  ) {
    return 'bg-blue-100 text-blue-700'
  }

  if (value === 'REJECTED' || value === 'REQUIRES_CORRECTION') {
    return 'bg-red-100 text-red-700'
  }

  if (value === 'DRAFT') {
    return 'bg-slate-100 text-slate-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function getCommentBoxConfig(status) {
  const value = normalizeStatus(status)

  if (value === 'APPROVED' || value === 'VALIDATED') {
    return {
      heading: 'Approval Note',
      Icon: CheckCircle2,
      border: 'border-emerald-300',
      iconColor: 'text-emerald-500',
      triangle: 'border-b-emerald-500/15',
    }
  }
  if (value === 'REJECTED') {
    return {
      heading: 'Rejection Reason',
      Icon: XCircle,
      border: 'border-red-300',
      iconColor: 'text-red-500',
      triangle: 'border-b-red-500/15',
    }
  }
  if (value === 'REQUIRES_CORRECTION') {
    return {
      heading: 'Correction Required',
      Icon: AlertTriangle,
      border: 'border-yellow-300',
      iconColor: 'text-yellow-500',
      triangle: 'border-b-yellow-500/15',
    }
  }
  return null
}

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function DetailField({ label, value, valueClassName, span }) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`text-sm text-[#0d1f3c] ${valueClassName || ''}`}>{value}</p>
    </div>
  )
}

export default function SubmissionDetailsDrawer({
  open,
  submissionId,
  onClose,
  onEditResubmit,
}) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [details, setDetails] = useState(null)

  useEffect(() => {
    if (!open || !submissionId) return

    const controller = new AbortController()

    const fetchDetails = async () => {
      setStatus('loading')
      setError('')
      try {
        const response = await apiClient.get(`/submissions/${submissionId}`, {
          signal: controller.signal,
        })
        setDetails(response.data || null)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setDetails(null)
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load submission details right now.',
          ),
        )
      }
    }

    fetchDetails()

    return () => controller.abort()
  }, [open, submissionId])

  // Close on Escape, and don't let the page scroll behind the modal.
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  const normalizedStatus = useMemo(
    () => normalizeStatus(details?.status),
    [details?.status],
  )

  const canResubmit = normalizedStatus === 'REQUIRES_CORRECTION'
  const commentBoxConfig = getCommentBoxConfig(details?.status)

  const referenceNumber =
    details?.referenceNumber || details?.referenceNo || details?.reference || details?.id

  const authorsLabel = Array.isArray(details?.authors)
    ? details.authors
        .map((author) => author?.fullName || author?.name || author)
        .filter(Boolean)
        .join(', ')
    : details?.authors

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Submission details"
    >
      <div
        className="absolute inset-0 bg-slate-950/60"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-xl">
        {/* Header — same hero pattern as the Submission History page */}
        <div className="relative shrink-0 overflow-hidden bg-[#f8fafc] px-8 py-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'url(/DOST_Building.png)',
              backgroundSize: 'cover',
              backgroundPosition: '78% 32%',
              opacity: 0.12,
            }}
          />
          <div className="relative z-10 flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">
                SUBMISSION HISTORY &gt; <span className="text-[#c9a84c]">DETAILS</span>
              </p>
              <h3
                className="mt-2 truncate text-[22px] font-bold leading-snug text-[#0d1f3c]"
                style={{ fontFamily: "'Libre Baskerville', serif" }}
              >
                {details?.title || 'Submission Details'}
              </h3>
                {details ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {referenceNumber ? (
                    <span className="text-[12px] font-bold text-[#6b7280]">Ref. {referenceNumber}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-[8px] border border-[#e5e7eb] bg-white p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="h-px w-full shrink-0 bg-[#c9a84c]" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {status === 'loading' ? (
            <div className="text-sm text-slate-500">Loading submission...</div>
          ) : error ? (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : details ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-[10px] border border-[#e5e7eb] bg-[#f8fafc] p-5 sm:grid-cols-2">
                <DetailField label="Type" value={details.researchType || details.type} />
                <DetailField label="Completion Year" value={details.completionYear || details.year} />
                <DetailField
                  label="Publication Venue"
                  value={details.publicationVenue || details.publicationVenueStatus}
                />
                <DetailField
                  label="Submitted"
                  value={formatDate(details.submittedAt || details.createdAt || details.submissionDate)}
                />
                <DetailField label="Authors" value={authorsLabel} span />
                <DetailField label="Subject" value={details.subjectDc || details.sAndTTheme} />
                <DetailField label="Coverage" value={details.coverageDc} />
                <DetailField label="Rights" value={details.rightsDc} />
                {details.doi ? (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      DOI
                    </p>
                    <a
                      href={
                        String(details.doi).startsWith('http')
                          ? details.doi
                          : `https://doi.org/${details.doi}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      {details.doi}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : null}
              </div>

              {(details.abstractText || details.abstract) ? (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Abstract
                  </p>
                  <p className="text-sm leading-relaxed text-[#0d1f3c]">
                    {details.abstractText || details.abstract}
                  </p>
                </div>
              ) : null}

              {commentBoxConfig && details.correctionNotes ? (
                <div className={`relative overflow-hidden rounded-[8px] border bg-white shadow-sm ${commentBoxConfig.border}`}>
                  <div className="flex items-start gap-3 px-5 py-4">
                    <commentBoxConfig.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${commentBoxConfig.iconColor}`} />
                    <div>
                      <p className="text-sm font-semibold text-[#0d1f3c]">{commentBoxConfig.heading}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Admin Comment
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {details.correctionNotes}
                      </p>
                    </div>
                  </div>
                  <div className={`pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-b-[56px] border-l-[56px] border-l-transparent ${commentBoxConfig.triangle}`} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No submission selected.</div>
          )}
        </div>

        {details ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#e5e7eb] bg-white px-8 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
            {canResubmit ? (
              <button
                type="button"
                onClick={() => {
                  console.log("DETAILS:", details);
                  onEditResubmit?.(details);
                }}
                className="rounded-[8px] bg-[#0d1f3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b1a33]"
              >
                Edit & Resubmit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}