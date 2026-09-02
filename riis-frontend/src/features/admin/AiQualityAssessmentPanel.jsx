import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Bot, CheckCircle2, ChevronDown, ChevronUp, HelpCircle,
  History, Loader2, RefreshCw, Search, Sparkles, XCircle,
} from 'lucide-react'
import apiClient from '../../services/apiClient'
import {
  getLatestQualityReview,
  getQualityReviewHistory,
  recordQualityReviewDecision,
  regenerateQualityReview,
  runQualityReview,
} from '../../api/qualityReviews'

const cardClass = 'rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'

const CRITERIA = [
  { key: 'methodology', label: 'Methodology' },
  { key: 'originality', label: 'Originality' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'alignment', label: 'Alignment' },
  { key: 'data_integrity', label: 'Data Integrity' },
]

const DECISIONS = [
  { value: 'AGREE', label: 'Agree', icon: CheckCircle2 },
  { value: 'OVERRIDE', label: 'Override', icon: AlertTriangle },
  { value: 'NEEDS_MORE_INFO', label: 'Request More Info', icon: HelpCircle },
]

function extractApiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallback
}

// Claude's criteria/flags JSON may use snake_case or camelCase keys
// depending on how the assessment was serialized, so read both.
function getCriterion(criteria, key) {
  if (!criteria) return null
  const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

  // Some rubric versions return criteria as a list of
  // { name, score, justification } rather than an object keyed by
  // criterion name — match on the "name" field in that case.
  if (Array.isArray(criteria)) {
    return criteria.find((c) => c?.name === key || c?.name === camel) || null
  }

  return criteria[key] || criteria[camel] || null
}

function normalizeFlags(flags) {
  if (!Array.isArray(flags)) return []
  return flags.map((f, i) => {
    if (typeof f === 'string') return { id: i, label: f }
    return { id: f.id ?? f.code ?? i, label: f.label || f.message || f.flag || String(f) }
  })
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function RubricBadge({ version }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
      Rubric {version || 'unknown'}
    </span>
  )
}

function AdvisoryBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-indigo-100 bg-indigo-50 px-4 py-3">
      <Sparkles className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
      <p className="text-xs text-indigo-700">
        <span className="font-bold">Automated advisory assessment.</span>{' '}
        This output is a research aid for DOST reviewers only — it does not approve, reject, or award submissions. 
        Final decisions rest with DOST review staff.
      </p>
    </div>
  )
}

function OutputPicker({ outputs, loading, search, onSearch, selectedId, onSelect }) {
  const filtered = outputs.filter((o) => {
    const term = search.toLowerCase()
    if (!term) return true
    return (
      o.title?.toLowerCase().includes(term) ||
      o.referenceNumber?.toLowerCase().includes(term) ||
      o.institutionName?.toLowerCase().includes(term)
    )
  })

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2 w-2 rounded-full bg-indigo-500" />
        <h2 className="text-[17px] font-semibold text-[#1A1A2E]">Research Outputs</h2>
      </div>
      <p className="text-xs text-slate-400 mb-3">Select an output to view or run its AI assessment</p>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search title, reference #, or HEI..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">No research outputs found.</p>
      ) : (
        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                selectedId === o.id
                  ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <p className="text-xs font-semibold leading-snug line-clamp-2">{o.title}</p>
              <p className={`mt-1 text-[10px] ${selectedId === o.id ? 'text-slate-300' : 'text-slate-400'}`}>
                {o.institutionName || 'Unknown HEI'} · {o.referenceNumber || o.id}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CriterionRow({ label, criterion }) {
  const score = typeof criterion?.score === 'number' ? criterion.score : null
  const justification = criterion?.justification || criterion?.notes || 'No justification provided.'
  const pct = score !== null ? Math.min(100, Math.max(0, (score / 20) * 100)) : 0

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-[#1A1A2E]">{score !== null ? `${score}/20` : '—'}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${score !== null && score < 10 ? 'bg-amber-400' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{justification}</p>
    </div>
  )
}

function HistoryDrawer({ open, onToggle, loading, history }) {
  return (
    <div className={cardClass}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          <h3 className="text-[13px] font-semibold text-[#1A1A2E]">Review History</h3>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">No prior runs for this output.</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Run Date', 'Rubric', 'Score', 'Admin Decision'].map((h) => (
                    <th key={h} className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 pr-4 text-xs text-slate-600">{formatDate(h.createdAt)}</td>
                    <td className="py-2 pr-4 text-xs text-slate-600">{h.rubricVersion || '—'}</td>
                    <td className="py-2 pr-4 text-xs font-semibold text-[#1A1A2E]">
                      {h.overallScore !== null && h.overallScore !== undefined ? `${h.overallScore}/100` : '—'}
                    </td>
                    <td className="py-2 text-xs text-slate-600">{h.adminDecision || 'Not yet reviewed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default function AiQualityAssessmentPanel() {
  const [outputs, setOutputs] = useState([])
  const [outputsLoading, setOutputsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOutputId, setSelectedOutputId] = useState(null)

  // 'idle' | 'loading' | 'unreviewed' | 'starting' | 'polling' | 'failed' | 'complete' | 'error'
  const [phase, setPhase] = useState('idle')
  const [review, setReview] = useState(null)
  const [actionError, setActionError] = useState('')

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const [selectedDecision, setSelectedDecision] = useState(null)
  const [notesText, setNotesText] = useState('')
  const [decisionSubmitting, setDecisionSubmitting] = useState(false)
  const [decisionError, setDecisionError] = useState('')

  // Load the list of research outputs to pick from.
  useEffect(() => {
    const controller = new AbortController()
    setOutputsLoading(true)
    apiClient.get('/admin/submissions', {
      params: { status: 'APPROVED', page: 0, size: 50 },
      signal: controller.signal,
    })
      .then((res) => {
        const data = res.data
        const content = Array.isArray(data) ? data : data?.content || []
        setOutputs(content)
      })
      .catch(() => {})
      .finally(() => setOutputsLoading(false))
    return () => controller.abort()
  }, [])

  const applyReview = useCallback((data) => {
    setReview(data)
    setSelectedDecision(data.adminDecision || null)
    setNotesText(data.adminNotes || '')
    if (data.status === 'PENDING' || data.status === 'PROCESSING') {
      setPhase('polling')
    } else if (data.status === 'FAILED') {
      setPhase('failed')
    } else if (data.status === 'COMPLETE') {
      setPhase('complete')
    } else {
      setPhase('unreviewed')
    }
  }, [])

  const fetchLatest = useCallback(async (id) => {
    setPhase('loading')
    setActionError('')
    try {
      const res = await getLatestQualityReview(id)
      applyReview(res.data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setReview(null)
        setPhase('unreviewed')
      } else {
        setPhase('error')
        setActionError(extractApiErrorMessage(err, 'Unable to load the AI assessment.'))
      }
    }
  }, [applyReview])

  const fetchHistory = useCallback(async (id) => {
    setHistoryLoading(true)
    try {
      const res = await getQualityReviewHistory(id)
      setHistory(Array.isArray(res.data) ? res.data : [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Reset panel state whenever a different research output is selected.
  useEffect(() => {
    if (!selectedOutputId) return
    setHistory([])
    setHistoryOpen(false)
    setDecisionError('')
    fetchLatest(selectedOutputId)
  }, [selectedOutputId, fetchLatest])

  // Poll every 3s while a review is PENDING/PROCESSING.
  useEffect(() => {
    if (phase !== 'polling' || !selectedOutputId) return
    const interval = setInterval(async () => {
      try {
        const res = await getLatestQualityReview(selectedOutputId)
        applyReview(res.data)
      } catch (err) {
        if (err?.response?.status === 404) setPhase('unreviewed')
        // transient errors: keep polling silently
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [phase, selectedOutputId, applyReview])

  // Load history once an assessment reaches a terminal state.
  useEffect(() => {
    if (!selectedOutputId) return
    if (phase === 'complete' || phase === 'failed') fetchHistory(selectedOutputId)
  }, [phase, selectedOutputId, fetchHistory])

  const handleRun = async () => {
    if (!selectedOutputId) return
    setActionError('')
    setPhase('starting')
    try {
      const res = await runQualityReview(selectedOutputId)
      setReview({ id: res.data.reviewId, status: res.data.status, researchOutputId: selectedOutputId })
      setSelectedDecision(null)
      setNotesText('')
      setPhase('polling')
    } catch (err) {
      setPhase('unreviewed')
      setActionError(extractApiErrorMessage(err, 'Unable to start the AI assessment.'))
    }
  }

  const handleRegenerate = async () => {
    if (!review?.id) return
    setRegenerating(true)
    setActionError('')
    try {
      const res = await regenerateQualityReview(review.id)
      setReview({ id: res.data.reviewId, status: res.data.status, researchOutputId: selectedOutputId })
      setSelectedDecision(null)
      setNotesText('')
      setPhase('polling')
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Unable to regenerate the assessment.'))
    } finally {
      setRegenerating(false)
    }
  }

  const decisionInvalid = selectedDecision === 'OVERRIDE' && !notesText.trim()

  const handleSubmitDecision = async () => {
    if (!review?.id || !selectedDecision || decisionInvalid) return
    setDecisionSubmitting(true)
    setDecisionError('')
    try {
      const res = await recordQualityReviewDecision(review.id, selectedDecision, notesText.trim() || null)
      applyReview(res.data)
      fetchHistory(selectedOutputId)
    } catch (err) {
      setDecisionError(extractApiErrorMessage(err, 'Unable to save the admin decision.'))
    } finally {
      setDecisionSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div>
        <OutputPicker
          outputs={outputs}
          loading={outputsLoading}
          search={search}
          onSearch={setSearch}
          selectedId={selectedOutputId}
          onSelect={setSelectedOutputId}
        />
      </div>

      <div className="col-span-2 space-y-4">
        {!selectedOutputId ? (
          <div className={cardClass}>
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Bot className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Select a research output</p>
              <p className="text-xs text-slate-400 mt-1">Choose an output from the list to view or run its AI quality assessment.</p>
            </div>
          </div>
        ) : phase === 'loading' ? (
          <div className={cardClass}>
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          </div>
        ) : phase === 'error' ? (
          <div className={cardClass}>
            <div className="flex items-start gap-2.5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <p className="text-xs text-red-700">{actionError}</p>
            </div>
          </div>
        ) : phase === 'unreviewed' ? (
          <div className={cardClass}>
            <AdvisoryBanner />
            <div className="mt-4 flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-indigo-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">No AI assessment yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Run a Claude holistic review of this output's PDF to get an advisory quality
                assessment for the reviewing admin.
              </p>
              {actionError && <p className="mt-3 text-xs text-red-600">{actionError}</p>}
              <button
                type="button"
                onClick={handleRun}
                className="mt-5 flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2a45]"
              >
                <Sparkles className="h-4 w-4" />
                Run AI Assessment
              </button>
            </div>
          </div>
        ) : phase === 'starting' || phase === 'polling' ? (
          <div className={cardClass}>
            <AdvisoryBanner />
            <div className="mt-4 flex flex-col items-center justify-center py-14 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Assessment in progress…</p>
              <p className="text-xs text-slate-400 mt-1">
                Claude is reviewing the submission PDF against rubric {review?.rubricVersion || 'v1-tentative'}.
                This page checks for updates every few seconds.
              </p>
            </div>
          </div>
        ) : phase === 'failed' ? (
          <div className="space-y-4">
            <div className={cardClass}>
              <AdvisoryBanner />
              <div className="mt-4 flex items-start gap-3 rounded-[10px] border-2 border-red-300 bg-red-50 px-4 py-4">
                <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-700">Assessment failed</p>
                  <p className="mt-1 text-xs text-red-600">
                    {review?.failureReason || 'The assessment could not be completed.'}
                  </p>
                  {actionError && <p className="mt-1 text-xs text-red-600">{actionError}</p>}
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Retry / Run Assessment
                  </button>
                </div>
              </div>
            </div>

            <HistoryDrawer
              open={historyOpen}
              onToggle={() => setHistoryOpen((v) => !v)}
              loading={historyLoading}
              history={history}
            />
          </div>
        ) : phase === 'complete' && review ? (
          <div className="space-y-4">
            <div className={cardClass}>
              <AdvisoryBanner />

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RubricBadge version={review.rubricVersion} />
                  {review.adminDecision && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Reviewed: {review.adminDecision.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate Assessment
                </button>
              </div>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-[#1A1A2E]">{review.overallScore ?? '—'}</span>
                <span className="mb-1 text-sm text-slate-400">/ 100 overall</span>
              </div>

              {normalizeFlags(review.flags).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {normalizeFlags(review.flags).map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {f.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 divide-y divide-slate-50">
                {CRITERIA.map((c) => (
                  <CriterionRow key={c.key} label={c.label} criterion={getCriterion(review.criteria, c.key)} />
                ))}
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="text-[13px] font-semibold text-[#1A1A2E] mb-2">Executive Summary</h3>
              <p className="text-xs leading-relaxed text-slate-600">{review.summary || 'No summary provided.'}</p>
            </div>

            <div className={cardClass}>
              <h3 className="text-[13px] font-semibold text-[#1A1A2E] mb-1">Admin Decision</h3>
              <p className="text-xs text-slate-400 mb-4">
                Record your read on this assessment. This does not change the submission's approval status.
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {DECISIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedDecision(value)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                      selectedDecision === value
                        ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder={
                  selectedDecision === 'OVERRIDE'
                    ? 'Required: explain why you are overriding this assessment...'
                    : 'Optional notes...'
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-700 outline-none focus:border-slate-400"
              />
              {selectedDecision === 'OVERRIDE' && !notesText.trim() && (
                <p className="mt-1 text-[11px] text-red-500">Notes are required when overriding an assessment.</p>
              )}
              {decisionError && <p className="mt-1 text-[11px] text-red-500">{decisionError}</p>}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  {review.reviewedAt ? `Last recorded ${formatDate(review.reviewedAt)}` : 'No decision recorded yet.'}
                </p>
                <button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={!selectedDecision || decisionInvalid || decisionSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2a2a45] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {decisionSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Decision
                </button>
              </div>
            </div>

            <HistoryDrawer
              open={historyOpen}
              onToggle={() => setHistoryOpen((v) => !v)}
              loading={historyLoading}
              history={history}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}