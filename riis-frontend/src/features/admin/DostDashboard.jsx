import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import DashboardLayout from './DashboardLayout'
import AnalyticsDashboard from './AnalyticsDashboard'
import { dostNavItems } from './PendingSubmissionsPage'

function extractApiErrorMessage(error) {
  const data = error?.response?.data
  if (!data) return error?.message || 'Unable to process the request.'
  if (typeof data === 'string') return data

  return (
    data.message ||
    data.detail ||
    data.error ||
    data.title ||
    'Unable to process the request.'
  )
}

function getUserId(user) {
  return user?.id ?? user?.userId ?? null
}

function getInstitutionName(user) {
  return (
    user?.institution ||
    user?.institutionName ||
    user?.institution?.name ||
    'Institution unavailable'
  )
}

function getDisplayName(user) {
  return user?.fullName || user?.name || 'Unnamed account'
}

function ReviewModal({
  open,
  onClose,
  users,
  status,
  error,
  approvingUserId,
  onApprove,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-8 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Pending Review
            </p>
            <h3 className="mt-2 font-serif text-3xl font-bold tracking-tight text-slate-900">
              HEI Account Approval Queue
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Review institutional requests and approve verified accounts without
              leaving the analytics dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mx-8 mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto px-8 py-6">
          {status === 'loading' ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading pending registrations...
              </div>
            </div>
          ) : users.length ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Institution
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Position
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((user) => {
                    const userId = getUserId(user)
                    const isApproving = approvingUserId === userId

                    return (
                      <tr key={userId || `${user.email}-${getInstitutionName(user)}`}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {getDisplayName(user)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {user?.email || 'No email provided'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {getInstitutionName(user)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {user?.department || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {user?.position || '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => onApprove(userId)}
                            disabled={!userId || isApproving}
                            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isApproving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <div className="rounded-full bg-emerald-50 p-4 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">
                All pending accounts are reviewed
              </h4>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                New HEI account requests will appear here automatically when they
                are submitted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DostDashboard() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [pendingStatus, setPendingStatus] = useState('idle')
  const [dashboardError, setDashboardError] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewUsers, setReviewUsers] = useState([])
  const [reviewStatus, setReviewStatus] = useState('idle')
  const [reviewError, setReviewError] = useState('')
  const [approvingUserId, setApprovingUserId] = useState(null)

  const fetchPendingUsers = async ({ signal, setStatus, setUsers, setError }) => {
    setStatus('loading')
    setError('')

    try {
      const response = await apiClient.get('/admin/users', {
        params: { role: 'HEI_STAFF', status: 'PENDING' },
        signal,
      })
      const users = Array.isArray(response.data) ? response.data : []
      setUsers(users)
      setStatus('success')
      return users
    } catch (err) {
      setUsers([])
      setStatus('error')
      setError(extractApiErrorMessage(err))
      return []
    }
  }

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    fetchPendingUsers({
      signal: controller.signal,
      setStatus: (value) => {
        if (isActive) setPendingStatus(value)
      },
      setUsers: (value) => {
        if (isActive) setPendingUsers(value)
      },
      setError: (value) => {
        if (isActive) setDashboardError(value)
      },
    })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!reviewOpen) return undefined

    let isActive = true
    const controller = new AbortController()

    fetchPendingUsers({
      signal: controller.signal,
      setStatus: (value) => {
        if (isActive) setReviewStatus(value)
      },
      setUsers: (value) => {
        if (isActive) setReviewUsers(value)
      },
      setError: (value) => {
        if (isActive) setReviewError(value)
      },
    })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [reviewOpen])

  const handleApprove = async (userId) => {
    setApprovingUserId(userId)
    setDashboardError('')
    setReviewError('')

    try {
      const response = await apiClient.patch(`/admin/users/${userId}/approve`)

      if (response.status === 200) {
        setPendingUsers((current) =>
          current.filter((user) => getUserId(user) !== userId),
        )
        setReviewUsers((current) =>
          current.filter((user) => getUserId(user) !== userId),
        )
        return
      }

      setReviewError('Unable to approve the account. Please try again.')
    } catch (err) {
      const message = extractApiErrorMessage(err)
      setReviewError(message)
      setDashboardError(message)
    } finally {
      setApprovingUserId(null)
    }
  }

  return (
    <>
      <DashboardLayout
        navItems={dostNavItems}
        userName="DOST Administrator"
        organization="DOST Region VII"
      >
        <AnalyticsDashboard
          pendingCount={pendingUsers.length}
          pendingStatus={pendingStatus}
          onReviewAction={() => setReviewOpen(true)}
        />

        {dashboardError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {dashboardError}
          </div>
        ) : null}
      </DashboardLayout>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        users={reviewUsers}
        status={reviewStatus}
        error={reviewError}
        approvingUserId={approvingUserId}
        onApprove={handleApprove}
      />
    </>
  )
}
