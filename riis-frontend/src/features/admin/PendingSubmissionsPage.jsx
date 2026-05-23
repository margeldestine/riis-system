import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle, X,
  Search, ChevronDown, BarChart3, ClipboardList,
  ShieldCheck, Bell, FileText, Building2, Users
} from 'lucide-react'
import DashboardLayout from './DashboardLayout'
import apiClient from '../../services/apiClient'

export const dostNavItems = [
  { icon: BarChart3, label: 'Analytics Dashboard', to: '/dost/dashboard' },
  { icon: ClipboardList, label: 'Submission Portal', to: '/dost/submissions' },
  { icon: ShieldCheck, label: 'Auto Validation', to: '/dost/validation' },
  { icon: Bell, label: 'Overlap Alerts', to: '/dost/overlap-alerts' },
  { icon: FileText, label: 'Report Generator', to: '/dost/reports' },
  { icon: Building2, label: 'HEI Management', to: '/dost/hei-management' },
  { icon: Users, label: 'USER Management', to: '/dost/user-management' },
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

function ActionModal({ open, onClose, onConfirm, action, loading }) {
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (open) setComment('')
  }, [open])

  if (!open) return null

  const isReject = action === 'REJECTED'
  const title = isReject ? 'Reject Submission' : 'Request Correction'
  const btnClass = isReject
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-amber-500 hover:bg-amber-600'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#1A1A2E]">{title}</h3>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          A comment is required explaining your decision.
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder={isReject
            ? 'e.g., Abstract word count is below the required 100-word minimum...'
            : 'e.g., Please update the abstract to meet the 100-word minimum...'}
          className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:ring-1 focus:ring-[#1A1A2E] resize-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Required for Correction and Reject. Optional for Approve.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(comment)}
            disabled={!comment.trim() || loading}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
          >
            {loading ? 'Submitting...' : 'Confirm'}
          </button>
        </div>
      </div>
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
            <p className="text-sm font-semibold text-emerald-600">Validation Passed</p>
          </div>
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

function ActionPanel({ submission, onAction, actionLoading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Dark header */}
      <div className="bg-[#1A1A2E] px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">UC-M4-02 · Step 4</p>
        <h3 className="mt-1 text-lg font-bold text-white">Take Action</h3>
      </div>

      <div className="px-5 py-5 space-y-3">
        {/* Approve */}
        <button
          type="button"
          onClick={() => onAction('APPROVED', '')}
          disabled={actionLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve
        </button>

        <p className="text-center text-xs text-slate-400">or</p>

        {/* Requires Correction */}
        <button
          type="button"
          onClick={() => onAction('REQUIRES_CORRECTION', null)}
          disabled={actionLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Requires Correction
        </button>

        <p className="text-center text-xs text-slate-400">or</p>

        {/* Reject */}
        <button
          type="button"
          onClick={() => onAction('REJECTED', null)}
          disabled={actionLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </button>

        {/* Comment box */}
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Comment / Reason</p>
          <textarea
            rows={4}
            placeholder="e.g., Abstract word count is below the required 100-word minimum..."
            className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-600 outline-none focus:ring-1 focus:ring-[#1A1A2E] resize-none"
            readOnly
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Required for Correction and Reject. Optional for Approve.
          </p>
        </div>

        {/* Explainer */}
        <div className="mt-3 space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
          <p className="font-semibold text-slate-600">What happens after each action?</p>
          <p><span className="text-emerald-600 font-medium">Approve</span> — Record goes public. Visible in discovery portal and HEI profile.</p>
          <p><span className="text-amber-600 font-medium">Requires Correction</span> — Returned to HEI staff with your comment. They can edit and resubmit.</p>
          <p><span className="text-red-600 font-medium">Reject</span> — Record is permanently rejected. HEI staff is notified with the reason.</p>
        </div>
      </div>
    </div>
  )
}

function ResultPage({ result, submission, onBackToSubmissions, onReviewNext }) {
  if (!result) return null

  const isApproved = result === 'APPROVED'
  const isCorrection = result === 'REQUIRES_CORRECTION'
  const isRejected = result === 'REJECTED'

  const breadcrumb = isApproved ? 'Approved' : isCorrection ? 'Correction Requested' : 'Rejected'
  const title = isApproved ? 'Record Approved' : isCorrection ? 'Correction Requested' : 'Record Rejected'
  const subtitle = isApproved ? 'Record is now publicly visible' : isCorrection ? 'Record returned to HEI staff for correction' : 'HEI staff has been notified'

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button type="button" onClick={onBackToSubmissions} className="hover:text-[#C9A84C]">
          Submissions
        </button>
        <span>›</span>
        <span className="text-[#C9A84C]">{breadcrumb}</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A2E]">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">ACADEMIC YEAR</p>
          <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
        </div>
      </div>

      {/* Result card */}
      <div className="flex justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          {/* Icon */}
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isApproved ? 'bg-emerald-100' : isCorrection ? 'bg-amber-100' : 'bg-red-100'}`}>
            {isApproved && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}
            {isCorrection && <AlertTriangle className="h-8 w-8 text-amber-500" />}
            {isRejected && <XCircle className="h-8 w-8 text-red-600" />}
          </div>

          <h2 className="mt-5 text-2xl font-bold text-[#1A1A2E]">
            {isApproved && 'Record Approved Successfully'}
            {isCorrection && 'Correction Request Sent'}
            {isRejected && 'Record Rejected'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            {isApproved && 'The research output is now publicly visible in the DASIG discovery portal and the HEI\'s institutional profile page.'}
            {isCorrection && 'The record has been returned to the HEI Research Office Staff with your comments. They can edit and resubmit from their Submission History.'}
            {isRejected && 'The research output has been rejected. The HEI Research Office Staff has been notified via email with the reason provided.'}
          </p>

          {/* Summary table */}
          {submission && (
            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100 text-left text-sm">
              <div className="flex justify-between px-5 py-3">
                <span className="text-slate-500">Reference No.</span>
                <span className="font-semibold text-[#1A1A2E]">{submission.referenceNumber}</span>
              </div>
              {submission.institution?.name || submission.institutionName ? (
                <div className="flex justify-between px-5 py-3">
                  <span className="text-slate-500">Submitting HEI</span>
                  <span className="font-semibold text-[#1A1A2E]">{submission.institution?.name || submission.institutionName}</span>
                </div>
              ) : null}
              <div className="flex justify-between px-5 py-3">
                <span className="text-slate-500">Record Status</span>
                <span className={`font-semibold flex items-center gap-1.5 ${isApproved ? 'text-emerald-600' : isCorrection ? 'text-amber-600' : 'text-red-600'}`}>
                  <span className={`h-2 w-2 rounded-full inline-block ${isApproved ? 'bg-emerald-500' : isCorrection ? 'bg-amber-500' : 'bg-red-500'}`} />
                  {isApproved ? 'Approved' : isCorrection ? 'Requires Correction' : 'Rejected'}
                </span>
              </div>
              {isApproved && (
                <div className="flex justify-between px-5 py-3">
                  <span className="text-slate-500">Public Visibility</span>
                  <span className="font-semibold text-emerald-600">Now publicly visible</span>
                </div>
              )}
              <div className="flex justify-between px-5 py-3">
                <span className="text-slate-500">HEI Notification</span>
                <span className="font-semibold text-slate-600">
                  {isApproved ? 'Email sent' : isCorrection ? 'Comment sent via email' : 'Rejection reason sent'}
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onBackToSubmissions}
              className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Back to Submissions
            </button>
            <button
              type="button"
              onClick={onReviewNext}
              className="flex-1 rounded-lg bg-[#1A1A2E] py-2.5 text-sm font-semibold text-white hover:bg-[#11111f] transition"
            >
              Review Next
            </button>
          </div>
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
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [resultSubmission, setResultSubmission] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [filterHei, setFilterHei] = useState('')

  const fetchSubmissions = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const [subRes, statsRes] = await Promise.all([
        apiClient.get('/admin/submissions', {
          params: { status: 'PENDING_REVIEW', page, size: 20 },
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
    setSelectedId(id)
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

  const handleAction = (action, comment) => {
    if ((action === 'REJECTED' || action === 'REQUIRES_CORRECTION') && comment === null) {
      setModalAction(action)
      return
    }
    submitAction(action, comment || '')
  }

  const submitAction = async (action, comment) => {
    if (!selectedId) return
    setActionLoading(true)
    try {
      await apiClient.patch(`/admin/submissions/${selectedId}/status`, { action, comment })
      setResult(action)
      setResultSubmission(selectedDetail)
      setSelectedId(null)
      setSelectedDetail(null)
      setModalAction(null)
      fetchSubmissions()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to process action.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleBackToSubmissions = () => {
    setResult(null)
    setResultSubmission(null)
  }

  const handleReviewNext = () => {
    setResult(null)
    setResultSubmission(null)
    if (items.length > 0) {
      loadDetail(items[0].id)
    }
  }

  const filteredItems = items.filter(item => {
    const matchSearch = !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.referenceNumber?.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || item.researchType === filterType
    return matchSearch && matchType
  })

  const formatDate = (val) => {
    if (!val) return '—'
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(val))
  }

  return (
    <>
      <DashboardLayout
        activeLabel="Submission Portal"
        userName="DOST Administrator"
        organization="DOST Region VII"
        navItems={dostNavItems}
      >
        {result ? (
          <ResultPage
            result={result}
            submission={resultSubmission}
            onBackToSubmissions={handleBackToSubmissions}
            onReviewNext={handleReviewNext}
          />
        ) : selectedDetail ? (
          /* Detail view */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button type="button" onClick={() => { setSelectedId(null); setSelectedDetail(null) }} className="hover:text-[#C9A84C]">
                Submissions
              </button>
              <span>›</span>
              <span className="text-[#C9A84C]">Review</span>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A2E]">Review Research Output</h1>
                <p className="mt-1 text-sm text-slate-500">Inspect full record details then approve, request correction, or reject</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">ACADEMIC YEAR</p>
                <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
              </div>
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px' }}>
              {/* Left — metadata */}
              <SubmissionMetadataPanel submission={selectedDetail} />
              {/* Right — action panel */}
              <div className="sticky top-6">
                <ActionPanel
                  submission={selectedDetail}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setSelectedId(null); setSelectedDetail(null) }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Back to Submissions
            </button>
          </div>
        ) : (
          /* List view */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  DASHBOARD &gt; <span className="text-[#C9A84C]">SUBMISSION PORTAL</span>
                </p>
                <h1 className="mt-2 text-3xl font-bold text-[#1A1A2E]">Pending Submissions</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Review and action submitted research output records from Region VII HEIs
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">ACADEMIC YEAR</p>
                <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
                <p className="text-xs text-slate-500">DOST Region VII</p>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Pending Review', key: 'PENDING_REVIEW', color: 'border-b-amber-400', detail: 'Awaiting action' },
                { label: 'Approved', key: 'APPROVED', color: 'border-b-emerald-400', detail: 'Already listed' },
                { label: 'Requiring Correction', key: 'REQUIRES_CORRECTION', color: 'border-b-orange-400', detail: 'Returned to HEI' },
                { label: 'Rejected', key: 'REJECTED', color: 'border-b-red-400', detail: 'Not accepted' },
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
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Submissions Awaiting Review
                </p>
              </div>

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
                  {filteredItems.length} records pending review — Click 'Review' to inspect and take action
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
                        No pending submissions found.
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
                          {item.principalInvestigator || ''}
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
                          Review →
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

      <ActionModal
        open={!!modalAction}
        action={modalAction}
        onClose={() => setModalAction(null)}
        onConfirm={(comment) => submitAction(modalAction, comment)}
        loading={actionLoading}
      />
    </>
  )
}