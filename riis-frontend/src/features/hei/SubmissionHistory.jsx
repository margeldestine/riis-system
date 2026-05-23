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

  const [search, setSearch] = useState('')
  const [submittedBy, setSubmittedBy] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')

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

      const params = {
        q: search || undefined,
        submittedBy: submittedBy !== 'ALL' ? submittedBy : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        year: yearFilter !== 'ALL' ? yearFilter : undefined,
      }

      try {
        const response = await apiClient.get('/submissions', { params, signal })
        console.log('Raw History Response:', response.data)
        const resolved = response.data?.content || response.data || []
        setItems(Array.isArray(resolved) ? resolved : [])
        setStatus('success')
      } catch (err) {
        const code = err?.response?.status
        if (signal?.aborted) return

        if ([404, 405, 501].includes(code)) {
          try {
            const legacy = await apiClient.get('/research/my-submissions', { signal })
            const raw = Array.isArray(legacy.data) ? legacy.data : []
            const filtered = raw.filter((row) => {
              const title = (row?.title || '').toString().toLowerCase()
              const matchesSearch = search ? title.includes(search.toLowerCase()) : true
              return matchesSearch
            })
            setItems(filtered)
            setStatus('success')
            return
          } catch (legacyErr) {
            if (signal?.aborted) return
            setItems([])
            setStatus('error')
            setError(
              extractApiErrorMessage(
                legacyErr,
                'Unable to load your submission history right now.',
              ),
            )
            return
          }
        }

        setItems([])
        setStatus('error')
        setError(
          extractApiErrorMessage(
            err,
            'Unable to load your submission history right now.',
          ),
        )
      }
    },
    [search, statusFilter, submittedBy, typeFilter, yearFilter],
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

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 8 }).map((_, idx) => String(currentYear - idx))
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
                    onChange={(event) => setSearch(event.target.value)}
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

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <select
                value={submittedBy}
                onChange={(event) => setSubmittedBy(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
              >
                <option value="ALL">Submitted by:</option>
                <option value="ME">Me</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="REQUIRES_CORRECTION">Requires Correction</option>
                <option value="REJECTED">Rejected</option>
                <option value="DRAFT">Draft</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
              >
                <option value="ALL">All Types</option>
                <option value="Funded Project">Funded Project</option>
                <option value="Journal Article">Journal Article</option>
                <option value="Conference Paper">Conference Paper</option>
                <option value="Innovation Output">Innovation Output</option>
                <option value="Community Extension Research">Community Extension Research</option>
              </select>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-[#1A1A2E] focus:ring-1 focus:ring-[#1A1A2E]"
              >
                <option value="ALL">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
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
