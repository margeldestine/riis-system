import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from './DashboardLayout'
import { dostNavItems } from './PendingSubmissionsPage'
import apiClient from '../../services/apiClient'

// ---------------------------------------------------------------------------
// API helper — UC-M5-05
// GET /api/v1/admin/audit-log?dateFrom=&dateTo=&actorId=&actionType=&page=&size=
// ---------------------------------------------------------------------------
const fetchAuditLog = async ({ dateFrom, dateTo, actorId, actionType, page }) => {
  const { data } = await apiClient.get('/admin/audit-log', {
    params: {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      actorId: actorId || undefined,
      actionType: actionType || undefined,
      page,
      size: 20,
    },
  })
  return data
}

const ACTION_TYPES = [
  'APPROVE_SUBMISSION', 'REJECT_SUBMISSION', 'REQUEST_SUBMISSION_CORRECTION',
  'APPROVE_ACCOUNT', 'REJECT_ACCOUNT', 'SUSPEND_ACCOUNT', 'DEACTIVATE_ACCOUNT',
  'REACTIVATE_ACCOUNT', 'CHANGE_ACCOUNT_ROLE',
  'REGISTER_HEI', 'UPDATE_HEI_STATUS', 'UPDATE_HEI_DETAILS',
  'SUBMISSION_RESUBMITTED',
]

const ACTION_LABELS = {
  APPROVE_SUBMISSION: 'Submission Approved',
  REJECT_SUBMISSION: 'Submission Rejected',
  REQUEST_SUBMISSION_CORRECTION: 'Correction Requested',
  APPROVE_ACCOUNT: 'Account Approved',
  REJECT_ACCOUNT: 'Account Rejected',
  SUSPEND_ACCOUNT: 'Account Suspended',
  DEACTIVATE_ACCOUNT: 'Account Deactivated',
  REACTIVATE_ACCOUNT: 'Account Reactivated',
  CHANGE_ACCOUNT_ROLE: 'Role Changed',
  REGISTER_HEI: 'HEI Registered',
  UPDATE_HEI_STATUS: 'HEI Status Updated',
  UPDATE_HEI_DETAILS: 'HEI Details Updated',
  SUBMISSION_RESUBMITTED: 'Submission Resubmitted',
}

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionType, setActionType] = useState('')
  const [actorSearch, setActorSearch] = useState('')
  const [page, setPage] = useState(0)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchAuditLog({ dateFrom, dateTo, actionType, page })
      const content = Array.isArray(data) ? data : data?.content || []
      setEntries(content)
      setTotalPages(Array.isArray(data) ? 1 : data?.totalPages || 1)
    } catch (err) {
      console.error('[AuditLogPage] Failed to load audit log:', err)
      setError(err?.response?.data?.message || 'Unable to load audit log.')
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, actionType, page])

  useEffect(() => { load() }, [load])

  // Actor filtering is done client-side against the loaded page — the
  // backend filters by actorId (a UUID), and this page doesn't have a
  // separate actor picker; searching by name/email narrows what's shown.
  const filteredEntries = entries.filter((e) => {
    if (!actorSearch) return true
    const term = actorSearch.toLowerCase()
    return e.actorName?.toLowerCase().includes(term) || e.actorEmail?.toLowerCase().includes(term)
  })

  return (
    <DashboardLayout navItems={dostNavItems} userName="DOST Administrator" organization="DOST Region VII">
      {/* Header */}
      <div style={{ margin: '-32px -32px 0', width: 'calc(100% + 64px)' }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: '#f8fafc', padding: '32px' }}>
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '78% 32%', opacity: 0.18 }} />
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'rgba(13, 31, 60, 0.08)' }} />
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.26em', color: '#94a3b8', margin: 0 }}>
              DASHBOARD &gt; <span style={{ color: '#c9a84c' }}>AUDIT LOG</span>
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700, color: '#0d1f3c', fontFamily: "'Libre Baskerville', serif", letterSpacing: '-0.02em' }}>
              Audit Log
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
              Every administrative action taken across DASIG, with timestamp, actor, and affected record
            </p>
          </div>
        </div>
        <div style={{ height: 1, width: '100%', background: '#c9a84c' }} />
      </div>

      {/* Table section */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: 24 }}>
        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Filter by</span>
          <div>
            <label style={{ fontSize: 11, color: '#9ca3af', marginRight: 6 }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0) }}
              style={{ padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#9ca3af', marginRight: 6 }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0) }}
              style={{ padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151' }}
            />
          </div>
          <select
            value={actionType}
            onChange={e => { setActionType(e.target.value); setPage(0) }}
            style={{ padding: '6px 28px 6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">All Action Types</option>
            {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_LABELS[t] || t}</option>)}
          </select>
          <div style={{ marginLeft: 'auto' }}>
            <input
              value={actorSearch}
              onChange={e => setActorSearch(e.target.value)}
              placeholder="Search actor by name or email"
              style={{ padding: '7px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, width: 240, outline: 'none' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ margin: '16px 24px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading audit log…</div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No audit log entries found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Timestamp', 'Actor', 'Action', 'Affected Record', 'Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{formatTimestamp(entry.createdAt)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#111827' }}>
                    {entry.actorName ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{entry.actorName}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{entry.actorEmail}</div>
                      </>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>System</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {ACTION_LABELS[entry.actionType] || entry.actionType}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>
                    {entry.targetType ? `${entry.targetType} · ${entry.targetId?.slice(0, 8) || '—'}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280', maxWidth: 320 }}>
                    {entry.comment || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && filteredEntries.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: page === 0 ? 'not-allowed' : 'pointer', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', opacity: page === 0 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <span>Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', opacity: page >= totalPages - 1 ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}