import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import DashboardLayout from '../admin/DashboardLayout'
import apiClient from '../../services/apiClient'
import SubmissionDetailsDrawer from './SubmissionDetailsDrawer'
import { heiNavItems } from './HeiDashboard'

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
  if (value === 'PENDING_REVIEW' || value === 'PENDING' || value === 'UNDER_REVIEW') return 'Under Review'
  if (value === 'REQUIRES_CORRECTION') return 'Requires Correction'
  if (value === 'REJECTED') return 'Rejected'
  if (value === 'DRAFT') return 'Draft'
  return status || 'Unknown'
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
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function KpiCard({ value, label, accentBorderClass, accentTriangleClass }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border bg-white shadow-sm ${accentBorderClass}`}
    >
      <div className="px-6 py-5">
        <p className="mb-2 text-3xl font-bold leading-none text-[#0d1f3c]">{value}</p>
        <p className="text-sm font-semibold text-[#0d1f3c]">{label}</p>
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
  const [kpiCounts, setKpiCounts] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    requiresCorrection: 0,
  })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const [filterSubmittedBy, setFilterSubmittedBy] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterYear, setFilterYear] = useState('')

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  const academicYearLabel = useMemo(() => {
    const year = new Date().getFullYear()
    return `${year - 1}-${year}`
  }, [])

  const yearOptions = useMemo(() => {
    const years = new Set()
    items.forEach((item) => {
      const value = item?.updatedAt || item?.submittedAt
      if (!value) return
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return
      years.add(String(date.getFullYear()))
    })
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [items])

  const fetchSubmissions = useCallback(
    async (signal) => {
      setStatus('loading')
      setError('')

      try {
        const response = await apiClient.get('/submissions', {
          params: {
            page,
            size: 5,
            keyword: search || undefined,
            status: filterStatus || undefined,
            researchType: filterType || undefined,
            year: filterYear || undefined,
            sort: 'updatedAt,desc',
          },
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
    [page, search, filterStatus, filterType, filterYear],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchSubmissions(controller.signal)
    return () => controller.abort()
  }, [fetchSubmissions])

  useEffect(() => {
    const controller = new AbortController()

    const readTotalElements = (payload) => {
      if (payload && typeof payload === 'object') {
        const value = Number(payload.totalElements)
        return Number.isFinite(value) ? value : 0
      }
      return 0
    }

    const loadKpis = async () => {
      try {
        const [allRes, approvedRes, underReviewRes, requiresCorrectionRes] =
          await Promise.all([
            apiClient.get('/submissions', {
              params: { page: 0, size: 1 },
              signal: controller.signal,
            }),
            apiClient.get('/submissions', {
              params: { page: 0, size: 1, status: 'APPROVED' },
              signal: controller.signal,
            }),
            apiClient.get('/submissions', {
              params: { page: 0, size: 1, status: 'UNDER_REVIEW' },
              signal: controller.signal,
            }),
            apiClient.get('/submissions', {
              params: { page: 0, size: 1, status: 'REQUIRES_CORRECTION' },
              signal: controller.signal,
            }),
          ])

        setKpiCounts({
          total: readTotalElements(allRes.data),
          approved: readTotalElements(approvedRes.data),
          pending: readTotalElements(underReviewRes.data),
          requiresCorrection: readTotalElements(requiresCorrectionRes.data),
        })
      } catch (err) {
        if (controller.signal.aborted) return
      }
    }

    loadKpis()
    return () => controller.abort()
  }, [])

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

  const filteredItems = useMemo(() => {
    const normalizeType = (value) =>
      (value || '').toString().trim().toUpperCase().replace(/\s+/g, '_')

    const currentUserEmail =
      localStorage.getItem('email') ||
      localStorage.getItem('userEmail') ||
      localStorage.getItem('institutionEmail') ||
      ''

    return items.filter((item) => {
      if (filterSubmittedBy === 'me' && currentUserEmail) {
        const submittedBy =
          item?.submittedByEmail ||
          item?.submittedBy ||
          item?.createdByEmail ||
          item?.createdBy ||
          ''
        if (
          submittedBy &&
          submittedBy.toString().trim().toLowerCase() !== currentUserEmail.toString().trim().toLowerCase()
        ) {
          return false
        }
      }

      if (filterStatus) {
        const statusValue = normalizeStatus(item?.status)
        const requested = normalizeStatus(filterStatus)
        if (requested === 'UNDER_REVIEW') {
          if (!['PENDING_REVIEW', 'PENDING', 'UNDER_REVIEW'].includes(statusValue)) return false
        } else if (statusValue !== requested) {
          return false
        }
      }

      if (filterType && normalizeType(item?.researchType) !== normalizeType(filterType)) return false
      if (filterYear) {
        const value = item?.updatedAt || item?.submittedAt
        const date = value ? new Date(value) : null
        const year = date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : ''
        if (year !== String(filterYear)) return false
      }
      return true
    })
  }, [items, filterSubmittedBy, filterStatus, filterType, filterYear])

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
        <div className="-mx-[32px] -mt-[32px] w-[calc(100%+64px)]">
          <div className="relative overflow-hidden bg-[#f8fafc] px-8 py-8">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'url(/DOST_Building.png)',
                backgroundSize: 'cover',
                backgroundPosition: '78% 32%',
                opacity: 0.18,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'rgba(13, 31, 60, 0.08)' }}
            />
            <div className="relative z-10 flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">
                  DASHBOARD &gt; <span className="text-[#c9a84c]">SUBMISSION HISTORY</span>
                </p>
                <h1
                  className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                  style={{ fontFamily: "'Libre Baskerville', serif" }}
                >
                  Submission History
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Access the complete history of submitted research outputs
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">
                  ACADEMIC YEAR
                </p>
                <p className="text-[13px] font-bold text-[#0d1f3c]">{academicYearLabel}</p>
                <p className="mt-1 text-[12px] text-[#6b7280]">{institutionName}</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            value={kpiCounts.total}
            label="Total Submitted"
            accentBorderClass="border-[#e5e7eb]"
            accentTriangleClass="border-b-slate-400/15"
          />
          <KpiCard
            value={kpiCounts.approved}
            label="Approved"
            accentBorderClass="border-emerald-300"
            accentTriangleClass="border-b-emerald-500/15"
          />
          <KpiCard
            value={kpiCounts.pending}
            label="Under Review"
            accentBorderClass="border-[#f3d08b]"
            accentTriangleClass="border-b-[#C9A84C]/18"
          />
          <KpiCard
            value={kpiCounts.requiresCorrection}
            label="Requires Correction"
            accentBorderClass="border-rose-300"
            accentTriangleClass="border-b-rose-500/15"
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full">
              <div className="flex w-full items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2.5">
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
              className="shrink-0 rounded-[8px] bg-[#0d1f3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b1a33]"
            >
              New Submission
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={filterSubmittedBy}
              onChange={(event) => {
                setFilterSubmittedBy(event.target.value)
                setPage(0)
              }}
              className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none"
            >
              <option value="">Submitted by:</option>
              <option value="me">Me</option>
            </select>
            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value)
                setPage(0)
              }}
              className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select
              value={filterType}
              onChange={(event) => {
                setFilterType(event.target.value)
                setPage(0)
              }}
              className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none"
            >
              <option value="">All Types</option>
              <option value="FUNDED_PROJECT">Funded Project</option>
              <option value="RESEARCH_PROJECT">Research Project</option>
              <option value="INNOVATION_OUTPUT">Innovation Output</option>
            </select>
            <select
              value={filterYear}
              onChange={(event) => {
                setFilterYear(event.target.value)
                setPage(0)
              }}
              className="h-10 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none"
            >
              <option value="">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white">
            <table className="w-full table-fixed">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="w-[50%] border-b border-[#e5e7eb] px-4 py-3 text-left text-[12px] font-semibold text-[#6b7280]">
                    Research Title
                  </th>
                  <th className="w-[16%] whitespace-nowrap border-b border-[#e5e7eb] px-4 py-3 text-left text-[12px] font-semibold text-[#6b7280]">
                    Type
                  </th>
                  <th className="w-[14%] whitespace-nowrap border-b border-[#e5e7eb] px-4 py-3 text-left text-[12px] font-semibold text-[#6b7280]">
                    Submission Date
                  </th>
                  <th className="w-[10%] whitespace-nowrap border-b border-[#e5e7eb] px-4 py-3 text-left text-[12px] font-semibold text-[#6b7280]">
                    Status
                  </th>
                  <th className="w-[10%] whitespace-nowrap border-b border-[#e5e7eb] px-4 py-3 text-left text-[12px] font-semibold text-[#6b7280]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {status === 'loading' ? (
                  <tr>
                    <td className="px-5 py-6 text-sm text-slate-500" colSpan={5}>
                      Loading submissions...
                    </td>
                  </tr>
                ) : filteredItems.length ? (
                  filteredItems.map((item, index) => (
                    <tr key={item?.id || `${item?.title}-${index}`} className="bg-white">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item?.id)
                            setDrawerOpen(true)
                          }}
                          className="block w-full whitespace-normal break-words text-left text-sm font-semibold text-blue-700 hover:text-blue-900"
                        >
                          {item?.title || 'Untitled submission'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        {item?.researchType || 'Unspecified'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        {formatDate(item?.updatedAt || item?.submittedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                            item?.status,
                          )}`}
                        >
                          {formatStatusLabel(item?.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(item?.id)
                              setDrawerOpen(true)
                            }}
                            className="text-blue-700 hover:text-blue-900"
                          >
                            View
                          </button>
                          <span className="h-4 w-px bg-slate-200" />
                          <button
                            type="button"
                            onClick={() =>
                              navigate('/hei/submission-portal', {
                                state: { editSubmissionId: item?.id },
                              })
                            }
                            className="text-blue-700 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </div>
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

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0 || status === 'loading'}
              className="rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
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
