import { useEffect, useState } from 'react'
import DashboardLayout from './DashboardLayout'
import { dostNavItems } from './PendingSubmissionsPage'
import apiClient from '../../services/apiClient'

const fetchPendingUsers = async () => {
  const { data } = await apiClient.get('/admin/users', {
    params: { role: 'HEI_STAFF', status: 'PENDING' },
  })
  return Array.isArray(data) ? data : []
}

const patchUserStatus = async ({ id, action, reason }) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/status`, { action, reason })
  return data
}

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function StatCard({ value, label, sublabel, borderColor, textColor }) {
  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 10, padding: '20px 24px', flex: 1 }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: textColor, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: 600, marginTop: 6, color: '#111827' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{sublabel}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    PENDING: { bg: '#fff7ed', color: '#c2410c', dot: '#f97316', label: 'Pending' },
    ACTIVE:  { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Active'  },
    REJECTED:{ bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444', label: 'Rejected'},
  }
  const s = map[status] || map.PENDING
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20,
      padding: '3px 10px', fontSize: 13, fontWeight: 500,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function Field({ label, value, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </div>
      {children || <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{value || '—'}</div>}
    </div>
  )
}

function RejectModal({ user, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#111827' }}>Reject Registration</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>
          Provide a reason for rejecting <strong>{user.fullName}</strong>'s registration request.
        </p>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Comment / Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          placeholder="Enter reason..."
        />
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 20px' }}>
          Rejecting requests will immediately block registration and notify the applicant via email.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: !reason.trim() ? '#fca5a5' : '#dc2626', color: '#fff', cursor: !reason.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            ⊗ Reject Registration
          </button>
        </div>
      </div>
    </div>
  )
}

function QueueScreen({ users, onReview }) {
  const [search, setSearch] = useState('')
  const filtered = users.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      {/* Hero Header */}
      <div style={{ margin: '-32px -32px 0', width: 'calc(100% + 64px)', marginBottom: 24 }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: '#f8fafc', padding: '32px' }}>
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '78% 32%', opacity: 0.18 }} />
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'rgba(13, 31, 60, 0.08)' }} />
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.26em', color: '#94a3b8', margin: 0 }}>
                DASHBOARD &gt; <span style={{ color: '#c9a84c' }}>USER MANAGEMENT</span>
              </p>
              <h1 style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700, color: '#0d1f3c', fontFamily: "'Libre Baskerville', serif", letterSpacing: '-0.02em' }}>
                User Management
              </h1>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                Review and approve pending HEI Research Office staff registrations
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.26em', color: '#94a3b8', margin: 0 }}>ACADEMIC YEAR</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0d1f3c', margin: '4px 0 0' }}>2025-2026</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>DOST Region VII</p>
            </div>
          </div>
        </div>
        <div style={{ height: 1, width: '100%', background: '#c9a84c' }} />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <StatCard value={users.length}  label="Pending Review"       sublabel="Require action"       borderColor="#fca5a5" textColor="#dc2626" />
        <StatCard value="—"             label="Approved"             sublabel="Active staff accounts" borderColor="#86efac" textColor="#16a34a" />
        <StatCard value="—"             label="Rejected"             sublabel="All time"              borderColor="#d1d5db" textColor="#374151" />
        <StatCard value="—"             label="Total Registrations"  sublabel="All time"              borderColor="#fcd34d" textColor="#d97706" />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Pending Registrations
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, width: 260, outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>HEI Staff Registration Requests</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {filtered.length} account{filtered.length !== 1 ? 's' : ''} awaiting review — click below to inspect and take action
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>No pending registrations.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f3f4f6' }}>
                {['Applicant', 'Institution', 'Department / Position', 'Submitted', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(user.fullName)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{user.fullName}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: 14, color: '#374151' }}>{user.institutionName}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ fontSize: 14, color: '#374151' }}>{user.department}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{user.position}</div>
                  </td>
                  <td style={{ padding: '14px 12px', fontSize: 14, color: '#374151' }}>{formatDate(user.submittedAt)}</td>
                  <td style={{ padding: '14px 12px' }}><StatusBadge status={user.status} /></td>
                  <td style={{ padding: '14px 12px' }}>
                    <button
                      onClick={() => onReview(user)}
                      style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Review »
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function ReviewScreen({ user, onBack, onApprove, onReject, loading }) {
  const emailDomain = user.emailDomain || (user.email?.includes('@') ? `@${user.email.split('@')[1]}` : '')

  return (
    <>
      {/* Hero Header */}
      <div style={{ margin: '-32px -32px 0', width: 'calc(100% + 64px)', marginBottom: 24 }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: '#f8fafc', padding: '32px' }}>
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '78% 32%', opacity: 0.18 }} />
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'rgba(13, 31, 60, 0.08)' }} />
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.26em', color: '#94a3b8', margin: 0 }}>
                DASHBOARD &gt; USER MANAGEMENT &gt; <span style={{ color: '#c9a84c' }}>REVIEW</span>
              </p>
              <h1 style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700, color: '#0d1f3c', fontFamily: "'Libre Baskerville', serif", letterSpacing: '-0.02em' }}>
                Review Registration Request
              </h1>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                Review and approve pending HEI Research Office staff registrations
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.26em', color: '#94a3b8', margin: 0 }}>ACADEMIC YEAR</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0d1f3c', margin: '4px 0 0' }}>2025-2026</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>DOST Region VII</p>
            </div>
          </div>
        </div>
        <div style={{ height: 1, width: '100%', background: '#c9a84c' }} />
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #162d4a 100%)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: 12, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
          {getInitials(user.fullName)}
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{user.fullName}</div>
          <div style={{ fontSize: 14, color: '#93c5fd', marginTop: 4 }}>
            {user.email} &bull; Submitted: {formatDate(user.submittedAt)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Account Information</div>
            <Field label="Full Name" value={user.fullName} />
            <Field label="Institutional Email">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                  ✉ {user.email}
                </span>
                <span style={{ fontSize: 12, color: '#16a34a' }}>— Verified whitelisted domain</span>
              </div>
            </Field>
            <Field label="Email Domain Check">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                  ✉ {emailDomain}
                </span>
                <span style={{ fontSize: 12, color: '#16a34a' }}>— Verified whitelisted domain</span>
              </div>
            </Field>
            <div style={{ marginTop: 16 }}><StatusBadge status={user.status} /></div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Institution Information</div>
            <Field label="Institution Name"       value={user.institutionName} />
            <Field label="Institution Type"       value={user.institutionType} />
            <Field label="Employee ID"            value={user.employeeId} />
            <Field label="Department / Office"    value={user.department} />
            <Field label="Position / Designation" value={user.position} />
            <Field label="Province"               value={user.province} />
          </div>
        </div>

        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              USER APPROVAL
            </div>
            <p style={{ fontSize: 13, color: '#374151', margin: '0 0 16px', lineHeight: 1.5 }}>
              Approve this account to grant immediate DASIG access. Staff will be able to log in immediately.
            </p>
            <button
              onClick={onApprove}
              disabled={loading}
              style={{ width: '100%', padding: 11, borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              ✓ Approve Account
            </button>
          </div>

          <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              REJECT REGISTRATION
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>COMMENT / REASON</div>
            <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', background: '#fff', minHeight: 40, fontSize: 13, color: '#9ca3af', marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5 }}>
              Rejecting requests will immediately block registration and notify the applicant via email.
            </p>
            <button
              onClick={onReject}
              disabled={loading}
              style={{ width: '100%', padding: 11, borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              ⊗ Reject Registration
            </button>
          </div>

          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 12, fontSize: 14 }}>What happens next?</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              <div style={{ marginBottom: 6 }}>✓ <strong>Approve</strong> — Account status changes to Active. Staff receives email notification and can log in immediately. Admin can manage their account from the User Dashboard.</div>
              <div>✕ <strong>Reject</strong> — Registration is cancelled. Staff receives email with the reason provided.</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        style={{ marginTop: 24, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
      >
        « Back to Queue
      </button>
    </>
  )
}

function SuccessScreen({ user, onBackToQueue, onReviewNext }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 56px', maxWidth: 560, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', background: '#f0fdf4' }}>
          <span style={{ fontSize: 32, color: '#16a34a' }}>✓</span>
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#111827' }}>Account Approved Successfully</h2>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
          The HEI Staff account is now active. An email notification has been sent — the staff member can now log in to DASIG.
        </p>
        <div style={{ borderTop: '1px solid #f3f4f6', textAlign: 'left' }}>
          {[
            { label: 'Full Name',           value: user.fullName },
            { label: 'Institution',         value: user.institutionName },
            { label: 'Email Address',       value: user.email },
            { label: 'Account Status',      value: '● Active', green: true },
            { label: 'Email Notification',  value: 'Sent successfully' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
              <span style={{ color: '#6b7280' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: row.green ? '#16a34a' : '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'center' }}>
          <button onClick={onBackToQueue} style={{ padding: '11px 24px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#374151' }}>
            Back to Queue
          </button>
          <button onClick={onReviewNext} style={{ padding: '11px 24px', borderRadius: 8, border: 'none', background: '#1e3a5f', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Review Next »
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const [screen, setScreen] = useState('queue')
  const [selectedUser, setSelectedUser] = useState(null)
  const [approvedUser, setApprovedUser] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const [pendingUsers, setPendingUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true)

      const users = await fetchPendingUsers()

      setPendingUsers(users)
    } catch (error) {
      console.error(error)
      setPendingUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPendingUsers()
  }, [])

  const handleApprove = async () => {
    try {
      setLoadingAction(true)

      await patchUserStatus({
        id: selectedUser.id,
        action: 'APPROVED',
      })

      setApprovedUser(selectedUser)
      setScreen('success')

      await loadPendingUsers()
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleRejectConfirm = async (reason) => {
    try {
      setLoadingAction(true)

      await patchUserStatus({
        id: selectedUser.id,
        action: 'REJECTED',
        reason,
      })

      setScreen('queue')
      setSelectedUser(null)
      setShowRejectModal(false)

      await loadPendingUsers()
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleBackToQueue = () => {
    setScreen('queue')
    setSelectedUser(null)
    setApprovedUser(null)
  }

  const handleReviewNext = () => {
    const remaining = pendingUsers.filter(
      (u) => u.id !== approvedUser?.id
    )

    if (remaining.length > 0) {
      setSelectedUser(remaining[0])
      setApprovedUser(null)
      setScreen('review')
    } else {
      handleBackToQueue()
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout
        navItems={dostNavItems}
        userName="DOST Administrator"
        organization="DOST Region VII"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          Loading...
        </div>
      </DashboardLayout>
    )
  }

  if (screen === 'success' && approvedUser) {
    return (
      <DashboardLayout
        navItems={dostNavItems}
        userName="DOST Administrator"
        organization="DOST Region VII"
      >
        <SuccessScreen
          user={approvedUser}
          onBackToQueue={handleBackToQueue}
          onReviewNext={handleReviewNext}
        />
      </DashboardLayout>
    )
  }

  if (screen === 'review' && selectedUser) {
    return (
      <DashboardLayout
        navItems={dostNavItems}
        userName="DOST Administrator"
        organization="DOST Region VII"
      >
        <ReviewScreen
          user={selectedUser}
          onBack={handleBackToQueue}
          onApprove={handleApprove}
          onReject={() => setShowRejectModal(true)}
          loading={loadingAction}
        />

        {showRejectModal && (
          <RejectModal
            user={selectedUser}
            onConfirm={handleRejectConfirm}
            onCancel={() => setShowRejectModal(false)}
            loading={loadingAction}
          />
        )}
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={dostNavItems}
      userName="DOST Administrator"
      organization="DOST Region VII"
    >
      <QueueScreen
        users={pendingUsers}
        onReview={(user) => {
          setSelectedUser(user)
          setScreen('review')
        }}
      />
    </DashboardLayout>
  )
}