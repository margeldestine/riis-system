import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from './DashboardLayout'
import { dostNavItems } from './PendingSubmissionsPage'
import apiClient from '../../services/apiClient'

// ---------------------------------------------------------------------------
// API helpers — UC-M5-04
// GET  /api/v1/admin/users/directory?role=&status=&institutionId=&search=&page=&size=
// PATCH /api/v1/admin/users/{id}/status  { action, reason, newRole }
// ---------------------------------------------------------------------------
const fetchDirectory = async ({ role, status, institutionId, search, page }) => {
  const { data } = await apiClient.get('/admin/users/directory', {
    params: { role: role || undefined, status: status || undefined, institutionId: institutionId || undefined, search: search || undefined, page, size: 10 },
  })
  return data
}

const fetchInstitutionOptions = async () => {
  const { data } = await apiClient.get('/institutions/active')
  return Array.isArray(data) ? data : []
}

const patchAccountAction = async ({ id, action, reason, newRole }) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/status`, { action, reason, newRole })
  return data
}

const ROLES = ['SUPER_ADMIN', 'DOST_ADMIN', 'HEI_STAFF']
const STATUSES = ['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED', 'DEACTIVATED']

const STATUS_COLORS = {
  ACTIVE:       { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  PENDING:      { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' },
  REJECTED:     { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
  SUSPENDED:    { bg: '#fefce8', color: '#a16207', dot: '#eab308' },
  DEACTIVATED:  { bg: '#f3f4f6', color: '#4b5563', dot: '#9ca3af' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.PENDING
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20,
      padding: '3px 10px', fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {status}
    </span>
  )
}

// UC-M5-04: modal for the actions that need a reason and/or a target
// value — suspend, deactivate, reactivate (reason optional), and role
// change (needs newRole).
function AccountActionModal({ user, mode, onClose, onConfirm, loading, error }) {
  const [reason, setReason] = useState('')
  const [newRole, setNewRole] = useState(user.role || 'HEI_STAFF')

  const titles = {
    SUSPENDED: 'Suspend Account',
    DEACTIVATED: 'Deactivate Account',
    REACTIVATED: 'Reactivate Account',
    ROLE_CHANGED: 'Change Account Role',
  }
  const needsReason = mode === 'SUSPENDED' || mode === 'DEACTIVATED'
  const isRoleChange = mode === 'ROLE_CHANGED'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#111827' }}>{titles[mode]}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>
          {isRoleChange ? 'Choose a new role for' : 'This action applies to'} <strong>{user.fullName}</strong> ({user.email}).
        </p>

        {isRoleChange && (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              New Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ width: '100%', marginTop: 6, marginBottom: 16, padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </>
        )}

        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Reason {needsReason ? '' : '(optional)'}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          placeholder="Enter reason..."
        />
        {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ reason: reason.trim() || null, newRole: isRoleChange ? newRole : undefined })}
            disabled={loading || (needsReason && !reason.trim()) || (isRoleChange && newRole === user.role)}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: loading ? '#9ca3af' : '#1e3a5f', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}
          >
            {loading ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountDirectoryPage() {
  const [entries, setEntries] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [institutionOptions, setInstitutionOptions] = useState([])

  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterInstitution, setFilterInstitution] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [actionTarget, setActionTarget] = useState(null) // { user, mode }
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchDirectory({ role: filterRole, status: filterStatus, institutionId: filterInstitution, search, page })
      setEntries(Array.isArray(data) ? data : data?.content || [])
      setTotalPages(Array.isArray(data) ? 1 : data?.totalPages || 1)
    } catch (err) {
      console.error('[AccountDirectoryPage] Failed to load accounts:', err)
      setError(err?.response?.data?.message || 'Unable to load accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [filterRole, filterStatus, filterInstitution, search, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchInstitutionOptions().then(setInstitutionOptions).catch(() => {})
  }, [])

  const handleConfirmAction = async ({ reason, newRole }) => {
    if (!actionTarget) return
    setActionLoading(true)
    setActionError('')
    try {
      await patchAccountAction({ id: actionTarget.user.id, action: actionTarget.mode, reason, newRole })
      setActionTarget(null)
      await load()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to complete this action.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardLayout navItems={dostNavItems} userName="DOST Administrator" organization="DOST Region VII">
      {/* Header */}
      <div style={{ margin: '-32px -32px 0', width: 'calc(100% + 64px)' }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: '#f8fafc', padding: '32px' }}>
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '78% 32%', opacity: 0.18 }} />
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'rgba(13, 31, 60, 0.08)' }} />
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.26em', color: '#94a3b8', margin: 0 }}>
              DASHBOARD &gt; USER MANAGEMENT &gt; <span style={{ color: '#c9a84c' }}>ACCOUNT DIRECTORY</span>
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700, color: '#0d1f3c', fontFamily: "'Libre Baskerville', serif", letterSpacing: '-0.02em' }}>
              Account Directory
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
              Search and manage all DASIG accounts — change roles, suspend, deactivate, or reactivate
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
          <select
            value={filterRole}
            onChange={e => { setFilterRole(e.target.value); setPage(0) }}
            style={{ padding: '6px 28px 6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
            style={{ padding: '6px 28px 6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterInstitution}
            onChange={e => { setFilterInstitution(e.target.value); setPage(0) }}
            style={{ padding: '6px 28px 6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">All Institutions</option>
            {institutionOptions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
          </select>
          <div style={{ marginLeft: 'auto' }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search by name or email"
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
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading accounts…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No accounts found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name', 'Email', 'Role', 'Institution', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 14, color: '#111827' }}>{user.fullName}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{user.email}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{user.role || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{user.institutionName || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={user.status} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {user.status === 'ACTIVE' && (
                        <>
                          <button onClick={() => setActionTarget({ user, mode: 'ROLE_CHANGED' })} style={actionBtnStyle('#374151')}>Change Role</button>
                          <button onClick={() => setActionTarget({ user, mode: 'SUSPENDED' })} style={actionBtnStyle('#a16207')}>Suspend</button>
                          <button onClick={() => setActionTarget({ user, mode: 'DEACTIVATED' })} style={actionBtnStyle('#dc2626')}>Deactivate</button>
                        </>
                      )}
                      {(user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') && (
                        <button onClick={() => setActionTarget({ user, mode: 'REACTIVATED' })} style={actionBtnStyle('#15803d')}>Reactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && entries.length > 0 && (
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

      {actionTarget && (
        <AccountActionModal
          user={actionTarget.user}
          mode={actionTarget.mode}
          onClose={() => { setActionTarget(null); setActionError('') }}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
          error={actionError}
        />
      )}
    </DashboardLayout>
  )
}

function actionBtnStyle(color) {
  return {
    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: `1.5px solid ${color}33`, background: '#fff', color,
  }
}