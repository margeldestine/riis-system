import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../admin/DashboardLayout'
import apiClient from '../../services/apiClient'
import { heiNavItems } from './HeiDashboard'

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallbackMessage
}

function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const avatarColors = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-orange-500',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-amber-600',
]

function getAvatarColor(name) {
  if (!name) return avatarColors[0]
  const index = name.charCodeAt(0) % avatarColors.length
  return avatarColors[index]
}

function getTypeBadge(type) {
  if (!type) return null
  const val = type.toUpperCase()
  if (val.includes('SUC') || val.includes('STATE') || val.includes('UNIVERSITY')) {
    return <span className="text-xs font-medium text-blue-500">{type}</span>
  }
  return <span className="text-xs font-medium text-purple-500">{type}</span>
}

function InstitutionCard({ institution, onClick }) {
  const initials = getInitials(institution.name)
  const avatarColor = getAvatarColor(institution.name)
  const visibleTags = institution.themeKeywords?.slice(0, 3) || []
  const extraCount = (institution.themeKeywords?.length || 0) - visibleTags.length

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarColor}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#1A1A2E] leading-snug">{institution.name}</p>
          <div className="mt-0.5 flex items-center gap-1">
            {getTypeBadge(institution.type)}
            {institution.province ? (
              <span className="text-xs text-slate-400">· {institution.province}</span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>📄</span>
            <span className="font-medium text-emerald-600">{institution.approvedOutputCount} research outputs</span>
          </div>
        </div>
      </div>

      {visibleTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTags.map((tag, i) => {
            const tagColors = [
              'bg-emerald-100 text-emerald-700',
              'bg-blue-100 text-blue-700',
              'bg-yellow-100 text-yellow-700',
              'bg-purple-100 text-purple-700',
              'bg-rose-100 text-rose-700',
            ]
            return (
              <span
                key={tag.keyword || tag}
                className={`rounded-full px-3 py-1 text-xs font-medium ${tagColors[i % 5]}`}
              >
                {tag.keyword || tag}
              </span>
            )
          })}
          {extraCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400">
              +{extraCount} more
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function HeiResearchProfiles() {
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const academicYearLabel = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`

  useEffect(() => {
    const controller = new AbortController()
    const fetchInstitutions = async () => {
      setStatus('loading')
      setError('')
      try {
        const response = await apiClient.get('/institutions', { signal: controller.signal })
        const data = response.data
        setInstitutions(Array.isArray(data) ? data : [])
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(extractApiErrorMessage(err, 'Unable to load institutions right now.'))
      }
    }
    fetchInstitutions()
    return () => controller.abort()
  }, [])

  return (
    <DashboardLayout
      activeLabel="HEI Research Profiles"
      userName="HEI Research User"
      organization="Higher Education Institution"
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
                  DASHBOARD &gt; <span className="text-[#c9a84c]">HEI RESEARCH PROFILES</span>
                </p>
                <h1
                  className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                  style={{ fontFamily: "'Libre Baskerville', serif" }}
                >
                  HEI Research Profiles
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Research institution profiles and output statistics
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">ACADEMIC YEAR</p>
                <p className="text-[13px] font-bold text-[#0d1f3c]">{academicYearLabel}</p>
                <p className="mt-1 text-[12px] text-[#6b7280]">System Administration</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-8 py-6">
            {status === 'loading' ? (
              <div className="text-sm text-slate-500">Loading institutions...</div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : institutions.length === 0 ? (
              <div className="text-sm text-slate-500">No institutions found.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {institutions.map((inst) => (
                  <InstitutionCard
                    key={inst.id}
                    institution={inst}
                    onClick={() => navigate(`/hei/institutions/${inst.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
