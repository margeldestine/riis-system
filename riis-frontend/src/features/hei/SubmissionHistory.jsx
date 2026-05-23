import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
} from 'lucide-react'
import DashboardLayout from '../admin/DashboardLayout'
import apiClient from '../../services/apiClient'
import SubmissionDetailsDrawer from './SubmissionDetailsDrawer'
import { heiNavItems } from './HeiDashboard'

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm'

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
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function KpiCard({ value, label, accentBorderClass, accentTriangleClass }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${accentBorderClass}`}>
      <div className="px-6 py-5">
        <p className="mb-1 text-3xl font-bold leading-none text-[#1A1A2E]">{value}</p>
        <p className="text-sm font-medium text-[#1A1A2E]">{label}</p>
      </div>
      <div
        className={`pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-b-[56px] border-l-[56px] border-l-transparent ${accentTriangleClass}`}
      />
    </div>
  )
}

export default function SubmissionHistory() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [pdfStatus, setPdfStatus] = useState('idle')
  const [activePdfId, setActivePdfId] = useState(null)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  const fetchSubmissions = useCallback(
    async (signal) => {
      setStatus('loading')
      setError('')

      try {
        const response = await apiClient.get('/submissions', {
          params: { page, size: 10, keyword: search || undefined },
          signal,
        })

        const payload = response.data
        const resolvedItems = Array.isArray(payload)
          ? payload
          : payload?.content || []

        setItems(Array.isArray(resolvedItems) ? resolvedItems : [])
        setTotalPages(
          Math.max(
            1,
            Number(
              Array.isArray(payload) ? 1 : payload?.totalPages,
            ) || 1,
          ),
        )
        setStatus('success')
      } catch (err) {
        if (signal?.aborted) return

        setItems([])
        setTotalPages(1)
        setStatus('error')
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your submission history right now.',
          ),
        )
      }
    },
    [page, search],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchSubmissions(controller.signal)
    return () => controller.abort()
  }, [fetchSubmissions])

  const kpis = useMemo(() => {
    const total = items.length
    const approved = items.filter((item) => ['APPROVED', 'VALIDATED'].includes(normalizeStatus(item?.status))).length
    const pending = items.filter((item) =>
      ['PENDING_REVIEW', 'PENDING', 'UNDER_REVIEW'].includes(normalizeStatus(item?.status)),
    ).length
    const requiresCorrection = items.filter((item) =>
      ['REQUIRES_CORRECTION', 'REJECTED'].includes(normalizeStatus(item?.status)),
    ).length

    return { total, approved, pending, requiresCorrection }
  }, [items])

  const handleViewPdf = useCallback(async (submissionId) => {
    if (!submissionId) return

    setPdfStatus('loading')
    setActivePdfId(submissionId)

    try {
      const response = await apiClient.get(`/submissions/${submissionId}/download-url`)
      const downloadUrl =
        response.data?.downloadUrl ||
        response.data?.url ||
        response.data?.presignedUrl

      if (!downloadUrl) {
        throw new Error('Download URL response is missing downloadUrl.')
      }

      const newWindow = window.open(downloadUrl, '_blank', 'noopener,noreferrer')
      if (newWindow) newWindow.opener = null
    } catch (err) {
      console.error('Failed to fetch PDF URL', err)
      setError(extractApiErrorMessage(err, 'Failed to fetch PDF download URL.'))
    } finally {
      setPdfStatus('idle')
      setActivePdfId(null)
    }
  }, [])

  return (
    <DashboardLayout
      activeLabel="Submission History"
      userName="HEI Research User"
      organization="Higher Education Institution"
      navItems={heiNavItems}
    >
      <div className="space-y-6">
        <section className={cardClass}>
          <div className="flex items-start justify-between gap-6 border-t-4 border-t-[#C9A84C] border-b border-slate-200 px-8 py-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                DASHBOARD &gt; <span className="text-[#C9A84C]">SUBMISSION HISTORY</span>
              </p>
              <h1 className="mt-2 text-3xl font-serif text-[#1A1A2E]">
                Submission History
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Access the complete history of submitted research outputs
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ACADEMIC YEAR
              </p>
              <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
              <p className="text-xs text-slate-500">{institutionName}</p>
            </div>
          </div>

          <div className="px-8 py-6">
            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard
                value={kpis.total}
                label="Total Submitted"
                accentBorderClass="border-b-2 border-b-slate-300"
                accentTriangleClass="border-b-slate-400/15"
              />
              <KpiCard
                value={kpis.approved}
                label="Approved"
                accentBorderClass="border-b-2 border-b-emerald-400"
                accentTriangleClass="border-b-emerald-500/15"
              />
              <KpiCard
                value={kpis.pending}
                label="Pending Review"
                accentBorderClass="border-b-2 border-b-[#C9A84C]"
                accentTriangleClass="border-b-[#C9A84C]/15"
              />
              <KpiCard
                value={kpis.requiresCorrection}
                label="Requires Correction"
                accentBorderClass="border-b-2 border-b-rose-400"
                accentTriangleClass="border-b-rose-500/15"
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="px-8 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="w-full">
                <div className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(0)
                    }}
                    placeholder="Search submissions..."
                    className="w-full border-0 bg-transparent p-0 text-sm placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/hei/submission-portal')}
                className="shrink-0 rounded-md bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#11111f]"
              >
                New Submission
              </button>
            </div>

          {error ? (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full">
              <thead className="bg-white">
                <tr>
                  <th className="border-b border-slate-200 px-5 pb-3 pt-4 text-left text-xs font-semibold text-slate-500">
                    Research Title
                  </th>
                  <th className="border-b border-slate-200 px-5 pb-3 pt-4 text-left text-xs font-semibold text-slate-500">
                    Type
                  </th>
                  <th className="border-b border-slate-200 px-5 pb-3 pt-4 text-left text-xs font-semibold text-slate-500">
                    Submission Date
                  </th>
                  <th className="border-b border-slate-200 px-5 pb-3 pt-4 text-left text-xs font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="border-b border-slate-200 px-5 pb-3 pt-4 text-left text-xs font-semibold text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {status === 'loading' ? (
                  <tr>
                    <td className="px-5 py-6 text-sm text-slate-500" colSpan={5}>
                      Loading submissions...
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((item, index) => (
                    <tr key={item?.id || `${item?.title}-${index}`}>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item?.id)
                            setDrawerOpen(true)
                          }}
                          className="text-left text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {item?.title || 'Untitled submission'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item?.researchType || 'Unspecified'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(item?.submittedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                            item?.status,
                          )}`}
                        >
                          {item?.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item?.id)
                            setDrawerOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {item?.attachmentKey ||
                        item?.attachment?.fileKey ||
                        item?.attachment?.fileName ||
                        item?.attachmentName ||
                        item?.attachmentUrl ? (
                          <>
                            <span className="px-2 text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleViewPdf(item?.id)}
                              disabled={pdfStatus === 'loading' && activePdfId === item?.id}
                              className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {pdfStatus === 'loading' && activePdfId === item?.id ? 'Opening…' : 'View PDF'}
                            </button>
                          </>
                        ) : null}
                        <span className="px-2 text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item?.id)
                            setDrawerOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={5}>
                      No submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0 || status === 'loading'}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <p className="text-sm text-slate-500">
              Page {Math.min(page + 1, totalPages)} of {totalPages}
            </p>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={page >= totalPages - 1 || status === 'loading'}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
          </div>
        </section>
      </div>

      <SubmissionDetailsDrawer
        open={drawerOpen}
        submissionId={selectedId}
        onClose={() => setDrawerOpen(false)}
        onEditResubmit={(details) => {
          navigate('/hei/submission-portal', {
            state: { editSubmissionId: details?.id, initialSubmission: details },
          })
        }}
      />
    </DashboardLayout>
  )
}
