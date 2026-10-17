import { useCallback, useEffect, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import DashboardLayout from '../admin/DashboardLayout'
import apiClient from '../../services/apiClient'
import { heiNavItems } from './HeiDashboard'

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'DECLINED', label: 'Declined' },
  { value: '', label: 'All' },
]

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallbackMessage
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function badgeClass(status) {
  if (status === 'FULFILLED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'DECLINED') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

function RequestCard({ item, onUpdated }) {
  const [action, setAction] = useState(null) // null | 'FULFILLED' | 'DECLINED'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mailto =
    `mailto:${encodeURIComponent(item.requesterEmail)}` +
    `?subject=${encodeURIComponent(`Full text request: ${item.referenceNumber}`)}`

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await apiClient.patch(`/hei/full-text-requests/${item.id}`, { status: action, note })
      setAction(null)
      setNote('')
      onUpdated()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Could not update this request.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-400">Ref. {item.referenceNumber}</p>
          <h3 className="mt-1 text-[15px] font-semibold text-[#0d1f3c]">{item.recordTitle}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeClass(item.status)}`}>
          {item.statusLabel}
        </span>
      </div>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Requester</p>
          <p className="text-[#0d1f3c]">{item.requesterName}</p>
          <p className="text-slate-600">{item.requesterEmail}</p>
          {item.requesterAffiliation ? <p className="text-slate-500">{item.requesterAffiliation}</p> : null}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Received</p>
          <p className="text-slate-700">{formatDate(item.createdAt)}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reason for request</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.purpose}</p>
      </div>

      {item.status !== 'PENDING' ? (
        <div className="mt-3 rounded-[8px] bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          {item.statusLabel} on {formatDate(item.handledAt)}
          {item.handlerNote ? <> — {item.handlerNote}</> : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm font-medium text-[#0d1f3c] hover:bg-slate-50"
            >
              <Mail className="h-4 w-4" /> Reply by email
            </a>
            <button
              type="button"
              onClick={() => setAction('FULFILLED')}
              className="rounded-[8px] bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Mark fulfilled
            </button>
            <button
              type="button"
              onClick={() => setAction('DECLINED')}
              className="rounded-[8px] bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Decline
            </button>
          </div>
          <p className="text-[12px] text-slate-500">
            DASIG does not send the full text. Reply to the requester yourself, then record the outcome here.
          </p>

          {action ? (
            <div className="space-y-2 rounded-[8px] border border-[#e5e7eb] bg-slate-50 p-3">
              <p className="text-[13px] font-semibold text-[#0d1f3c]">
                {action === 'FULFILLED' ? 'Mark as fulfilled' : 'Decline this request'}
              </p>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Optional note (kept internally)"
                className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
              />
              {error ? <p className="text-[12px] font-medium text-red-600">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[#0d1f3c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAction(null)
                    setError('')
                  }}
                  className="rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** Research-office inbox for "Request full text" submissions. */
export default function FullTextRequestsInboxPage() {
  const [tab, setTab] = useState('PENDING')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0 })
  const [state, setState] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const params = { page, size: 10 }
      if (tab) params.status = tab
      const response = await apiClient.get('/hei/full-text-requests', { params })
      setData({
        content: response?.data?.content || [],
        totalPages: response?.data?.totalPages || 0,
      })
      setError('')
      setState('ready')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Could not load requests right now.'))
      setState('error')
    }
  }, [tab, page])

  useEffect(() => {
    load()
  }, [load])

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  return (
    <DashboardLayout
      activeLabel="Full-Text Requests"
      userName="HEI Research User"
      organization={institutionName}
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
                  DASHBOARD &gt; <span className="text-[#c9a84c]">FULL-TEXT REQUESTS</span>
                </p>
                <h1
                  className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                  style={{ fontFamily: "'Libre Baskerville', serif" }}
                >
                  Full-Text Requests
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Requests from visitors who want the full text of your institution&apos;s research. You decide whether to share it.
                </p>
              </div>
              <div className="text-right">
                <p className="mt-1 text-[12px] text-[#6b7280]">{institutionName}</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setState('loading')
                setTab(item.value)
                setPage(0)
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === item.value
                  ? 'bg-[#0d1f3c] text-white'
                  : 'bg-white text-slate-600 ring-1 ring-[#e5e7eb] hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {state === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests...
          </div>
        ) : null}

        {state === 'error' ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {state === 'ready' && data.content.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#e5e7eb] bg-white px-6 py-10 text-center text-sm text-slate-500">
            No requests here.
          </div>
        ) : null}

        {state === 'ready' ? (
          <div className="space-y-4">
            {data.content.map((item) => (
              <RequestCard key={item.id} item={item} onUpdated={load} />
            ))}
          </div>
        ) : null}

        {data.totalPages > 1 ? (
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => {
                setState('loading')
                setPage((p) => Math.max(0, p - 1))
              }}
              className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {page + 1} of {data.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.totalPages - 1}
              onClick={() => {
                setState('loading')
                setPage((p) => Math.min(data.totalPages - 1, p + 1))
              }}
              className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}