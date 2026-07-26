import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, CheckCircle2,
  Search, ChevronDown, BarChart3, ClipboardList,
  Bell, FileText, Building2, Users, Download, FileWarning
} from 'lucide-react'
import DashboardLayout from './DashboardLayout'
import apiClient from '../../services/apiClient'

export const dostNavItems = [
  { icon: BarChart3, label: 'Analytics Dashboard', to: '/dost/dashboard' },
  { icon: ClipboardList, label: 'Submission Portal', to: '/dost/submissions' },
  { icon: Bell, label: 'Overlap Alerts', to: '/dost/overlap-alerts' },
  { icon: FileText, label: 'Report Generator', to: '/dost/reports' },
  { icon: Building2, label: 'HEI Management', to: '/dost/hei-management' },
  { icon: Users, label: 'User Management', to: '/dost/user-management' },
]

function extractApiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallback
}

function StatusBadge({ status }) {
  const map = {
    PENDING_REVIEW: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REQUIRES_CORRECTION: 'bg-orange-100 text-orange-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  const labels = {
    PENDING_REVIEW: 'Pending',
    APPROVED: 'Approved',
    REQUIRES_CORRECTION: 'Requires Correction',
    REJECTED: 'Rejected',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'APPROVED' ? 'bg-emerald-500' : status === 'PENDING_REVIEW' ? 'bg-amber-500' : status === 'REQUIRES_CORRECTION' ? 'bg-orange-500' : 'bg-red-500'}`} />
      {labels[status] || status}
    </span>
  )
}

function TypeBadge({ type }) {
  const colors = {
    'Funded Project': 'bg-amber-100 text-amber-700',
    'Journal Article': 'bg-blue-100 text-blue-700',
    'Conference Paper': 'bg-purple-100 text-purple-700',
    'Innovation Output': 'bg-teal-100 text-teal-700',
    'IP Registration': 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type] || 'bg-slate-100 text-slate-600'}`}>
      {type || '—'}
    </span>
  )
}

// DAS-047: the Review screen had no way to view/download the HEI's
// uploaded PDF even though every submission stores one. Fetches a
// short-lived signed URL on demand (rather than eagerly, since presigned
// URLs expire after 15 minutes) and opens it in a new tab. Handles the
// "no file on record" case explicitly instead of a silently broken link.
function SubmissionFileAction({ submissionId }) {
  const [state, setState] = useState('idle') // idle | loading | none | error

  const handleClick = async () => {
    setState('loading')
    try {
      const res = await apiClient.get(`/admin/submissions/${submissionId}/file-url`)
      if (res.status === 204 || !res.data?.url) {
        setState('none')
        return
      }
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
      setState('idle')
    } catch (err) {
      console.error('File download error:', err)
      setState('error')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-[#1A1A2E] transition hover:bg-slate-50 disabled:opacity-60"
      >
        {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        View / Download Uploaded File
      </button>
      {state === 'none' && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <FileWarning className="h-3.5 w-3.5" /> No file uploaded for this submission.
        </p>
      )}
      {state === 'error' && (
        <p className="mt-1.5 text-xs text-red-500">Couldn't retrieve the file. Please try again.</p>
      )}
    </div>
  )
}

function SubmissionMetadataPanel({ submission }) {
  if (!submission) return null

  const formatDate = (val) => {
    if (!val) return '—'
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(val))
  }

  const authors = Array.isArray(submission.authors)
    ? submission.authors.map(a => typeof a === 'string' ? a : a.fullName).filter(Boolean).join('; ')
    : '—'

  const keywords = Array.isArray(submission.keywords) ? submission.keywords : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Dark header */}
      <div className="bg-[#1A1A2E] px-6 py-5">
        <p className="text-xs text-slate-400">
          Ref: {submission.referenceNumber} &nbsp;·&nbsp; Submitted {formatDate(submission.submittedAt || submission.createdAt)}
        </p>
        <h2 className="mt-2 text-lg font-bold text-white leading-snug">
          {submission.title}
        </h2>
      </div>

      {/* Metadata grid */}
      <div className="px-6 py-5 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-4">Record Metadata</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">PI / M.L. Contributor</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.principalInvestigator || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Author(s)</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{authors}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Completion Year</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.completionYear || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Type</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.researchType || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Publication Venue</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.publicationVenue || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">DOI</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.doi || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">RC Subspace</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.subjectDc || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">RC Coverage</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.coverageDc || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">RC Rights</p>
            <p className="text-sm font-medium text-[#1A1A2E]">{submission.rightsDc || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Validation Status</p>
            {submission.validationErrorCount > 0 ? (
              <p className="text-sm font-semibold text-red-600">
                {submission.validationErrorCount} Validation {submission.validationErrorCount === 1 ? 'Error' : 'Errors'}
              </p>
            ) : (
              <p className="text-sm font-semibold text-emerald-600">Validation Passed</p>
            )}
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Uploaded File</p>
          <SubmissionFileAction submissionId={submission.id} />
        </div>
      </div>

      {/* Abstract */}
      <div className="px-6 py-5 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Abstract</p>
        <p className="text-sm text-slate-600 leading-relaxed">{submission.abstractText || '—'}</p>
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Keywords</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span key={kw} className="rounded-full border border-slate-200 px-3 py-0.5 text-xs text-slate-600">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// DAS-043: replaces the old ActionPanel (Approve / Requires Correction /
// Reject). Only registered, verified HEI staff accounts can submit, so
// submissions are trusted at the account level and auto-publish on
// creation — there's no DOST Admin action to take here anymore. This is
// read-only context for the audit/monitoring view.
function PublicationStatusPanel({ submission }) {
  const formatDate = (val) => {
    if (!val) return '—'
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(val))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-[#1A1A2E] px-5 py-4">
        <h3 className="text-lg font-bold text-white">Publication Status</h3>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Published</p>
            <p className="text-xs text-emerald-600">
              Visible in the discovery portal and HEI profile
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>Submitted</span>
            <span className="font-medium text-slate-600">{formatDate(submission?.submittedAt || submission?.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <StatusBadge status={submission?.status || 'APPROVED'} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
          <p>
            Submissions from registered, verified HEI staff accounts publish
            automatically — there's no separate DOST Admin approval step.
            This panel is for monitoring only.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PendingSubmissionsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({})
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterHei, setFilterHei] = useState('')
  // DAS-045: real institutions for the HEI filter dropdown, reusing the
  // same /institutions/active endpoint Register.jsx already uses for the
  // same purpose (id + name dropdown options).
  const [heiOptions, setHeiOptions] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/institutions/active', { signal: controller.signal })
      .then((res) => setHeiOptions(Array.isArray(res.data) ? res.data : []))
      .catch(() => {}) // non-critical — dropdown just stays empty on failure
    return () => controller.abort()
  }, [])

  // DAS-043: submissions now auto-publish straight to APPROVED, so this
  // monitoring list defaults to showing published submissions instead of
  // a "pending review" queue that no new submission will ever sit in.
  const fetchSubmissions = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const [subRes, statsRes] = await Promise.all([
        apiClient.get('/admin/submissions', {
          params: { status: 'APPROVED', page, size: 20 },
        }),
        apiClient.get('/admin/submissions/stats').catch(() => ({ data: {} })),
      ])
      const data = subRes.data
      const content = Array.isArray(data) ? data : data?.content || []
      setItems(content)
      setTotalPages(Array.isArray(data) ? 1 : data?.totalPages || 1)
      setStats(statsRes.data || {})
      setStatus('success')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load submissions.'))
      setStatus('error')
    }
  }, [page])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const loadDetail = async (id) => {
    setDetailLoading(true)
    try {
      const res = await apiClient.get(`/admin/submissions/${id}`)
      setSelectedDetail(res.data)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load submission details.'))
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchSearch = !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.authorNames?.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || item.researchType === filterType
    const matchHei = !filterHei || item.institutionId === filterHei
    return matchSearch && matchType && matchHei
  })

  const formatDate = (val) => {
    if (!val) return '—'
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(val))
  }

  return (
    <DashboardLayout
      activeLabel="Submission Portal"
      userName="DOST Administrator"
      organization="DOST Region VII"
      navItems={dostNavItems}
    >
      {selectedDetail ? (
        /* Detail view */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button type="button" onClick={() => { setSelectedDetail(null) }} className="hover:text-[#C9A84C]">
                Submissions
              </button>
              <span>›</span>
              <span className="text-[#C9A84C]">Details</span>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A2E]">Submission Details</h1>
                <p className="mt-1 text-sm text-slate-500">Inspect the full record. No action needed — submissions publish automatically.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">ACADEMIC YEAR</p>
                <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
              </div>
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px' }}>
              {/* Left — metadata */}
              <SubmissionMetadataPanel submission={selectedDetail} />
              {/* Right — read-only publication status (DAS-043: no more Take Action panel) */}
              <div className="sticky top-6">
                <PublicationStatusPanel submission={selectedDetail} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setSelectedDetail(null) }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Back to Submissions
            </button>
          </div>
        ) : (
          /* List view */
          <div className="space-y-6">
            {/* Header */}
            <div className="-mx-[32px] -mt-[32px] w-[calc(100%+64px)]">
              <div className="relative overflow-hidden bg-[#f8fafc] px-8 py-8">
                <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '78% 32%', opacity: 0.18 }} />
                <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(13, 31, 60, 0.08)' }} />
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">
                      DASHBOARD &gt; <span className="text-[#c9a84c]">SUBMISSION PORTAL</span>
                    </p>
                    <h1 className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                      Submission Records
                    </h1>
                    <p className="mt-2 text-[13px] text-[#6b7280]">
                      Monitor research output records submitted by Region VII HEIs
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">ACADEMIC YEAR</p>
                    <p className="text-[13px] font-bold text-[#0d1f3c]">2025-2026</p>
                    <p className="mt-1 text-[12px] text-[#6b7280]">DOST Region VII</p>
                  </div>
                </div>
              </div>
              <div className="h-px w-full bg-[#c9a84c]" />
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Approved', key: 'APPROVED', color: 'border-b-emerald-400', detail: 'Published' },
                { label: 'Pending Review', key: 'PENDING_REVIEW', color: 'border-b-amber-400', detail: 'Legacy, pre-auto-publish' },
                { label: 'Requiring Correction', key: 'REQUIRES_CORRECTION', color: 'border-b-orange-400', detail: 'Legacy, pre-auto-publish' },
                { label: 'Rejected', key: 'REJECTED', color: 'border-b-red-400', detail: 'Legacy, pre-auto-publish' },
              ].map(({ label, key, color, detail }) => (
                <div key={key} className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-b-2 ${color}`}>
                  <p className="text-3xl font-bold text-[#1A1A2E]">{stats[key] ?? 0}</p>
                  <p className="mt-2 text-sm font-semibold text-[#1A1A2E]">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Filters */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 shrink-0">Filter by</p>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 pl-3 pr-8 text-xs text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  >
                    <option value="">All Types</option>
                    {['Funded Project', 'Journal Article', 'Conference Paper', 'Innovation Output', 'IP Registration'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={filterHei}
                    onChange={(e) => setFilterHei(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 pl-3 pr-8 text-xs text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  >
                    <option value="">All HEIs</option>
                    {heiOptions.map((hei) => (
                      <option key={hei.id} value={hei.id}>{hei.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, reference no., or author..."
                    className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  />
                </div>
              </div>

              {/* Table header */}
              <div className="px-6 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-[#1A1A2E]">Research Output Submissions</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredItems.length} records — Click 'View' to inspect details
                </p>
              </div>

              {error && (
                <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Reference No.', 'Research Title', 'Submitting HEI', 'Type', 'Submitted', 'Status', ''].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {status === 'loading' ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                        No submissions found.
                      </td>
                    </tr>
                  ) : filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {item.referenceNumber || item.id?.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm font-semibold text-[#1A1A2E] line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.authorNames || ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.institutionName || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <TypeBadge type={item.researchType} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(item.submittedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => loadDetail(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1A1A2E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#11111f] transition"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || status === 'loading'}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <p className="text-sm text-slate-500">Page {page + 1} of {totalPages}</p>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || status === 'loading'}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
  )
}