import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
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
  const stopwords = new Set(['of', 'the', 'and', '&'])
  const words = name
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .filter(Boolean)
    .filter((word) => !stopwords.has(word.toLowerCase()))

  const initials = words.map((word) => word[0].toUpperCase()).join('')
  return initials.slice(0, 4) || '??'
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
  return <span className="text-xs text-slate-500">{type}</span>
}

function InstitutionCard({ institution, onClick }) {
  const initials = getInitials(institution.name)
  const avatarColor = getAvatarColor(institution.name)
  const visibleTags = institution.themeKeywords?.slice(0, 4) || []
  const extraCount = (institution.themeKeywords?.length || 0) - visibleTags.length

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[10px] border border-[#e5e7eb] bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold text-white ${avatarColor}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-snug text-[#0d1f3c]">
            {institution.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            {getTypeBadge(institution.type)}
            {institution.province || institution.city ? (
              <span className="text-xs text-slate-400">
                · {institution.city || institution.province}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-emerald-600">
              {institution.approvedOutputCount} research outputs
            </span>
          </div>
        </div>
      </div>

      {visibleTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTags.map((tag, i) => {
            const tagColors = [
              'bg-emerald-100 text-emerald-700',
              'bg-violet-100 text-violet-700',
              'bg-sky-100 text-sky-700',
              'bg-amber-100 text-amber-700',
              'bg-rose-100 text-rose-700',
            ]
            return (
              <span
                key={tag.keyword || tag}
                className={`rounded-[6px] px-2.5 py-1 text-[11px] font-medium ${tagColors[i % 5]}`}
              >
                {tag.keyword || tag}
              </span>
            )
          })}
          {extraCount > 0 ? (
            <span className="rounded-[6px] bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
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

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

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
                <p className="mt-1 text-[12px] text-[#6b7280]">{institutionName}</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        {status === 'loading' ? (
          <div className="text-sm text-slate-500">Loading institutions...</div>
        ) : error ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
    </DashboardLayout>
  )
}
