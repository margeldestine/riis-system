import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
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

function getStatusBadgeClasses(status) {
  const value = normalizeStatus(status)

  if (value === 'APPROVED' || value === 'VALIDATED') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (value === 'PENDING_REVIEW' || value === 'PENDING' || value === 'UNDER_REVIEW') {
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

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function DetailRow({ label, value, valueClassName }) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`text-sm text-[#1A1A2E] ${valueClassName || ''}`}>{value}</p>
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

  const normalizedStatus = useMemo(
    () => normalizeStatus(details?.status),
    [details?.status],
  )

  const canResubmit = normalizedStatus === 'REQUIRES_CORRECTION'

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-slate-950/30 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 h-screen w-96 transform bg-white shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-[#1A1A2E]">Submission Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-screen overflow-y-auto p-6 pb-28">
          {status === 'loading' ? (
            <div className="text-sm text-slate-500">Loading submission...</div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : details ? (
            <div className="flex flex-col gap-5">
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                  details.status,
                )}`}
              >
                {details.status || 'UNKNOWN'}
              </span>

              <DetailRow
                label="Reference Number"
                value={
                  details.referenceNumber ||
                  details.referenceNo ||
                  details.reference ||
                  details.id
                }
              />
              <DetailRow label="Research Title" value={details.title} valueClassName="font-bold" />
              <DetailRow label="Type" value={details.researchType || details.type} />
              <DetailRow label="Completion Year" value={details.completionYear || details.year} />
              <DetailRow
                label="Venue"
                value={details.publicationVenue || details.publicationVenueStatus}
              />
              <DetailRow
                label="Submission Date"
                value={formatDate(details.submittedAt || details.createdAt || details.submissionDate)}
              />
              <DetailRow
                label="Authors"
                value={Array.isArray(details.authors)
                  ? details.authors
                      .map((author) => author?.fullName || author?.name || author)
                      .filter(Boolean)
                      .join(', ')
                  : details.authors}
              />
              <DetailRow label="Abstract" value={details.abstractText || details.abstract} />
              {details.doi ? (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                    DOI
                  </p>
                  <a
                    href={String(details.doi).startsWith('http') ? details.doi : `https://doi.org/${details.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {details.doi}
                  </a>
                </div>
              ) : null}
              <DetailRow label="DC Subject" value={details.subjectDc || details.sAndTTheme} />
              <DetailRow label="DC Coverage" value={details.coverageDc} />
              <DetailRow label="DC Rights" value={details.rightsDc} />

              {canResubmit && details?.correctionNotes ? (
                <div className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <p className="font-bold">⚠ Correction Required</p>
                  <p className="mt-2">{details.correctionNotes}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No submission selected.</div>
          )}
        </div>

        {details ? (
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              {canResubmit ? (
                <button
                  type="button"
                  onClick={() => onEditResubmit?.(details)}
                  className="flex items-center gap-2 rounded-md bg-[#1A1A2E] px-6 py-2 text-white transition hover:bg-[#11111f]"
                >
                  Edit & Resubmit
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
