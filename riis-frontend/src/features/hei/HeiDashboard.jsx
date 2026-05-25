import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  FileSearch,
  FileText,
  FolderKanban,
  Loader2,
  Users,
} from 'lucide-react'
import apiClient from '../../services/apiClient'
import DashboardLayout from '../admin/DashboardLayout'
import SubmissionPortal from './SubmissionPortal'

const cardClass =
  'rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'

export const heiNavItems = [
  { icon: ClipboardList, label: 'Submission Portal', to: '/hei/submission-portal' },
  { icon: FolderKanban, label: 'Submission History', to: '/hei/submission-history' },
  { icon: Users, label: 'HEI Research Profiles', to: '/hei/research-profiles' },
  { icon: FileSearch, label: 'Browse Research', to: '/hei/browse-research' },
  { icon: FileText, label: 'Reports', to: '/hei/reports' },
]

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (data?.error) return data.error
  if (typeof data === 'string') return data
  return fallbackMessage
}

function formatSubmissionDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function normalizeStatus(value) {
  const status = (value || '').trim().toUpperCase()
  if (
    status === 'APPROVED' ||
    status === 'ACTIVE' ||
    status === 'VALIDATED'
  ) {
    return 'Approved'
  }

  return 'Pending'
}

function StatusTag({ status }) {
  const normalized = normalizeStatus(status)
  const className =
    normalized === 'Approved'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-600'

  return (
    <span
      className={`inline-flex rounded-full px-[12px] py-[4px] text-[11px] font-medium ${className}`}
    >
      {normalized}
    </span>
  )
}

function KpiCard({ value, label, detail }) {
  return (
    <div className={cardClass}>
      <p className="text-[38px] font-bold leading-none text-[#1A1A2E]">{value}</p>
      <p className="mt-4 text-[12px] font-semibold text-[#1A1A2E]">{label}</p>
      <p className="mt-1 text-[12px] font-medium text-[#6B7280]">{detail}</p>
    </div>
  )
}

export default function HeiDashboard() {
  const [submissions, setSubmissions] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  const academicYearLabel = useMemo(() => {
    const year = new Date().getFullYear()
    return `${year - 1}-${year}`
  }, [])

  const fetchSubmissions = useCallback(async (signal) => {
    setStatus('loading')
    setError('')

    try {
      const response = await apiClient.get('/research/my-submissions', { signal })
      const items = Array.isArray(response.data) ? response.data : []
      setSubmissions(items)
      setStatus('success')
    } catch (err) {
      if (signal?.aborted) return
      setSubmissions([])
      setStatus('error')
      setError(
        extractApiErrorMessage(
          err,
          'Unable to load your recent submissions right now.',
        ),
      )
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchSubmissions(controller.signal)

    return () => controller.abort()
  }, [])

  const summary = useMemo(() => {
    const total = submissions.length
    const pending = submissions.filter(
      (item) => normalizeStatus(item?.status) === 'Pending',
    ).length
    const approved = submissions.filter(
      (item) => normalizeStatus(item?.status) === 'Approved',
    ).length

    return {
      total,
      pending,
      approved,
    }
  }, [submissions])

  return (
    <>
      <DashboardLayout
        activeLabel="Submission Portal"
        userName="HEI Research User"
        organization="Higher Education Institution"
        navItems={heiNavItems}
      >
        <div className="space-y-5">
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
                    DASHBOARD &gt; <span className="text-[#c9a84c]">SUBMISSION PORTAL</span>
                  </p>
                  <h1
                    className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                    style={{ fontFamily: "'Libre Baskerville', serif" }}
                  >
                    Dashboard
                  </h1>
                  <p className="mt-2 text-[13px] text-[#6b7280]">
                    Manage institutional research entries, submit new outputs, and monitor validation progress.
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

          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard
              value={summary.total}
              label="Total Submissions"
              detail="All research entries recorded in your portal."
            />
            <KpiCard
              value={summary.pending}
              label="Pending Validation"
              detail="Entries still awaiting review or automated checks."
            />
            <KpiCard
              value={summary.approved}
              label="Approved Outputs"
              detail="Validated outputs ready for regional reporting."
            />
          </section>

          <section className={`${cardClass} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
            <div>
              <h2 className="text-[18px] font-semibold text-[#1A1A2E]">
                Research Submission Actions
              </h2>
              <p className="mt-2 text-sm text-[#6B7280]">
                Start a new submission or continue monitoring the latest entries
                from your institution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/hei/submission-portal')}
              className="inline-flex items-center justify-center rounded-[8px] bg-[#1A1A2E] px-[20px] py-[12px] font-semibold text-white transition hover:bg-[#11111f]"
            >
              Open Submission Portal
            </button>
          </section>

          <section className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold text-[#1A1A2E]">
                  Recent Submissions
                </h2>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Latest research outputs submitted by your HEI account.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-[12px] py-[4px] text-[11px] font-medium text-[#6B7280]">
                {status === 'loading' ? 'Loading' : `${submissions.length} Records`}
              </span>
            </div>

            {error ? (
              <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {status === 'loading' ? (
              <div className="mt-6 flex min-h-52 items-center justify-center text-sm text-[#6B7280]">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading your submissions...
                </div>
              </div>
            ) : submissions.length ? (
              <div className="mt-6 overflow-hidden rounded-[12px] border border-[#E5E7EB]">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                        Title
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                        Theme
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                        Date Submitted
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] bg-white">
                    {submissions.map((item, index) => (
                      <tr key={item?.id || `${item?.title}-${index}`}>
                        <td className="px-5 py-4 text-sm font-medium text-[#1A1A2E]">
                          {item?.title || 'Untitled submission'}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#6B7280]">
                          {item?.theme || item?.researchType || 'Unspecified'}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#6B7280]">
                          {formatSubmissionDate(
                            item?.submittedAt || item?.createdAt || item?.dateSubmitted,
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusTag status={item?.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-6 text-center">
                <ClipboardList className="h-8 w-8 text-[#9CA3AF]" />
                <h3 className="mt-4 text-[18px] font-semibold text-[#1A1A2E]">
                  No submissions yet
                </h3>
                <p className="mt-2 max-w-md text-sm text-[#6B7280]">
                  Submit your first research output to begin building your HEI
                  activity history.
                </p>
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </>
  )
}

export function HeiSubmissionPortalPage() {
  return (
    <DashboardLayout
      activeLabel="Submission Portal"
      userName="HEI Research User"
      organization="Higher Education Institution"
      navItems={heiNavItems}
    >
      <SubmissionPortal />
    </DashboardLayout>
  )
}
