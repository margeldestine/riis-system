import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  FileText,
  Globe,
  MapPin,
  User,
} from 'lucide-react'
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
  'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-500',
  'bg-rose-600', 'bg-teal-600', 'bg-indigo-600', 'bg-amber-600',
]

function getAvatarColor(name) {
  if (!name) return avatarColors[0]
  return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

function getTypeBadgeClass(type) {
  if (!type) return 'bg-slate-100 text-slate-600'
  const val = type.toUpperCase()
  if (val.includes('SUC') || val.includes('STATE')) return 'bg-blue-100 text-blue-700'
  if (val.includes('PRIVATE')) return 'bg-purple-100 text-purple-700'
  return 'bg-slate-100 text-slate-600'
}

function StatCard({ value, label }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-300">{label}</p>
    </div>
  )
}

function ResearchTypeBar({ distribution }) {
  if (!distribution || Object.keys(distribution).length === 0) return null
  const total = Object.values(distribution).reduce((a, b) => a + b, 0)
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500',
  ]
  const entries = Object.entries(distribution)

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {entries.map(([type, count], i) => (
          <div
            key={type}
            className={colors[i % colors.length]}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${type}: ${count}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {entries.map(([type, count], i) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
            <span>{type} ({count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OutputCard({ output, isOwnInstitution }) {
  const navigate = useNavigate()
  const statusColors = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING_REVIEW: 'bg-blue-100 text-blue-700',
    REQUIRES_CORRECTION: 'bg-red-100 text-red-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  const statusLabel = output.status === 'APPROVED' ? 'Approved'
    : output.status === 'PENDING_REVIEW' ? 'Under Review'
      : output.status === 'REQUIRES_CORRECTION' ? 'Requires Correction'
        : output.status || 'Unknown'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 border-l-4 border-l-emerald-500">
      {/* Title + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {output.doi ? (
            <a
              href={`https://doi.org/${output.doi}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#1A1A2E] hover:text-blue-600 leading-snug"
            >
              {output.title}
            </a>
          ) : (
            <p className="font-semibold text-[#1A1A2E] leading-snug">{output.title}</p>
          )}
        </div>
        {isOwnInstitution ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              statusColors[output.status] || 'bg-slate-100 text-slate-600'
            }`}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>

      {/* Authors */}
      {output.authors?.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {output.authors.map((author, i) => (
            <span key={i} className="flex items-center gap-1">
              {author.fullName}
              {author.orcidId ? (
                <a
                  href={`https://orcid.org/${author.orcidId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#A6CE39] font-bold hover:underline"
                  title={`ORCID: ${author.orcidId}`}
                >
                  iD
                </a>
              ) : null}
              {i < output.authors.length - 1 ? '·' : ''}
            </span>
          ))}
        </div>
      ) : null}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {output.researchType ? (
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400" />
            {output.researchType}
          </span>
        ) : null}
        {output.publicationVenue ? (
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            {output.publicationVenue}
          </span>
        ) : null}
        {output.completionYear ? (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {output.completionYear}
          </span>
        ) : null}
        {output.fundingSource ? (
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            {output.fundingSource}
          </span>
        ) : null}
      </div>

      {/* Abstract excerpt */}
      {output.abstractExcerpt ? (
        <p className="text-xs text-slate-500 leading-relaxed">{output.abstractExcerpt}</p>
      ) : null}

      {/* DOI */}
      {output.doi ? (
        <p className="text-xs text-slate-400">
          DOI:{' '}
          <a
            href={`https://doi.org/${output.doi}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:underline"
          >
            {output.doi}
          </a>
        </p>
      ) : null}

      {/* View Details */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => navigate(`/research/${output.id}`)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

function OtherHEIsPanel({ currentId }) {
  const navigate = useNavigate()
  const [others, setOthers] = useState([])

  useEffect(() => {
    apiClient.get('/institutions')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.content ?? []
        setOthers(list.filter((h) => String(h.id) !== String(currentId)).slice(0, 4))
      })
      .catch(() => {})
  }, [currentId])

  if (others.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
        <Building2 className="h-4 w-4 text-slate-500" />
        Other Region VII HEIs
      </h3>
      <div className="space-y-3">
        {others.map((hei) => (
          <button
            key={hei.id}
            type="button"
            onClick={() => navigate(`/hei/institutions/${hei.id}`)}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 transition"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${getAvatarColor(hei.name)}`}>
              {getInitials(hei.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#1A1A2E]">{hei.name}</p>
              <p className="text-[10px] text-slate-400">{hei.approvedOutputCount ?? 0} outputs · {hei.province}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function InstitutionProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedClusters, setSelectedClusters] = useState([])
  const [yearRange, setYearRange] = useState(0)
  const [isFiltering, setIsFiltering] = useState(false)

  const loggedInInstitutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  const academicYearLabel = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`
  const clusterOptions = [
    { label: 'Climate & Environment', value: 'Climate & Env' },
    { label: 'Health & Medical', value: 'Health & Medical' },
    { label: 'Agriculture & Food', value: 'Agriculture' },
    { label: 'Education & Social', value: 'Education & Social' },
    { label: 'Tech, Engr & Innovation', value: 'Tech & Innovation' },
  ]

  useEffect(() => {
    setIsFiltering(true)
    const handle = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword)
    }, 350)
    return () => clearTimeout(handle)
  }, [searchKeyword])

  useEffect(() => {
    setIsFiltering(true)
  }, [selectedTypes, yearRange])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const fetchProfile = async () => {
      setStatus('loading')
      setError('')
      try {
        const response = await apiClient.get(`/institutions/${id}/profile`, {
          params: {
            page,
            size: 5,
            keyword: debouncedSearchKeyword || undefined,
            researchTypes:
              selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
            subjects:
              selectedClusters.length > 0
                ? selectedClusters.join(',')
                : undefined,
            yearTo: yearRange || undefined,
          },
          signal: controller.signal,
        })
        setProfile(response.data)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(extractApiErrorMessage(err, 'Unable to load institution profile.'))
      } finally {
        setIsFiltering(false)
      }
    }
    fetchProfile()
    return () => controller.abort()
  }, [id, page, debouncedSearchKeyword, selectedTypes, selectedClusters, yearRange])

  const initials = getInitials(profile?.name)
  const avatarColor = getAvatarColor(profile?.name)
  const totalPages = profile?.outputs?.totalPages || 1
  const outputs = profile?.outputs?.content || []
  const isOwnInstitution = String(profile?.name || '') === String(localStorage.getItem('institutionName') || localStorage.getItem('userInstitution') || '')

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
                  DASHBOARD &gt; <span className="text-[#c9a84c]">RESEARCH DETAILS</span>
                </p>
                <h1
                  className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                  style={{ fontFamily: "'Libre Baskerville', serif" }}
                >
                  Research Output Details
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Full research project details and metadata
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">
                  ACADEMIC YEAR
                </p>
                <p className="text-[13px] font-bold text-[#0d1f3c]">{academicYearLabel}</p>
                <p className="mt-1 text-[12px] text-[#6b7280]">{loggedInInstitutionName}</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        {status === 'loading' && !profile ? (
          <div className="text-sm text-slate-500">Loading profile...</div>
        ) : error ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : profile ? (
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="rounded-[12px] bg-[#0d1f3c] p-6 text-white shadow-sm">
              <div className="flex items-start gap-5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-[16px] font-bold text-white ${avatarColor}`}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold text-white">{profile.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-white/70">
                    {profile.type ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getTypeBadgeClass(profile.type)}`}>
                        {profile.type}
                      </span>
                    ) : null}
                      {profile.province ? (
                        <span className="inline-flex items-center gap-1 text-[12px]">
                          <MapPin className="h-3.5 w-3.5 text-white/60" />
                          {profile.province}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 text-[12px]">
                        <Globe className="h-3.5 w-3.5 text-white/60" />
                        DOST Region VII
                      </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                        <Globe className="h-3.5 w-3.5" />
                        Public Access
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                        <Calendar className="h-3.5 w-3.5 text-white/80" />
                        2016–2025
                      </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="rounded-[10px] bg-white/10 px-6 py-4">
                  <p className="text-2xl font-bold text-white">{profile.stats?.totalApprovedOutputs ?? 0}</p>
                  <p className="mt-1 text-xs text-white/70">Total Outputs</p>
                </div>
                <div className="rounded-[10px] bg-white/10 px-6 py-4">
                  <p className="text-2xl font-bold text-white">{profile.stats?.totalApprovedOutputs ?? 0}</p>
                  <p className="mt-1 text-xs text-white/70">Approved</p>
                </div>
                <div className="rounded-[10px] bg-white/10 px-6 py-4">
                  <p className="text-2xl font-bold text-white">
                    {Object.entries(profile.stats?.researchTypeDistribution || {}).find(([k]) => k.toLowerCase().includes('funded'))?.[1] ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-white/70">Funded Projects</p>
                </div>
                <div className="rounded-[10px] bg-white/10 px-6 py-4">
                  <p className="text-2xl font-bold text-white">
                    {Object.entries(profile.stats?.researchTypeDistribution || {}).find(([k]) => k.toLowerCase().includes('applied'))?.[1] ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-white/70">Applied Research</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <div className="rounded-[12px] border border-slate-200 bg-white p-5">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
                      <BarChart3 className="h-4 w-4 text-slate-500" />
                      Research Profile
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Research areas and specializations, ranked by recent impact over last 12 months
                    </p>
                  </div>

                  {profile.themeKeywords?.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {profile.themeKeywords.slice(0, 6).map((tag, i) => {
                          const tagColors = [
                            'bg-emerald-50 text-emerald-700',
                            'bg-blue-50 text-blue-700',
                            'bg-yellow-50 text-yellow-700',
                            'bg-purple-50 text-purple-700',
                            'bg-rose-50 text-rose-700',
                            'bg-teal-50 text-teal-700',
                          ]
                          return (
                            <span
                              key={tag.keyword}
                              className={`rounded-full px-3 py-1 text-xs font-medium ${tagColors[i % tagColors.length]}`}
                            >
                              {tag.keyword}
                            </span>
                          )
                        })}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Top Research Areas by Research Impact
                        </p>
                        {profile.themeKeywords.slice(0, 6).map((tag) => (
                          <div key={tag.keyword} className="flex items-center gap-3">
                            <p className="w-40 shrink-0 text-xs text-slate-600">{tag.keyword}</p>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(100, tag.weight * 10)}%` }}
                              />
                            </div>
                            <p className="w-10 text-right text-xs font-semibold text-emerald-600">
                              {(tag.weight * 10).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs italic text-slate-400">
                        Research niche profile will appear here once AI analysis is complete.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Research Outputs
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Publications from this institution on record
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Filter research..."
                        value={searchKeyword}
                        onChange={(event) => {
                          setSearchKeyword(event.target.value)
                          setPage(0)
                        }}
                        className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Showing {outputs.length} of {profile.stats?.totalApprovedOutputs ?? 0} approved results
                  </p>
                </div>

                {status === 'loading' ? (
                  <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Searching...
                  </div>
                ) : outputs.length === 0 ? (
                  <p className="text-sm text-slate-500">No approved outputs yet.</p>
                ) : (
                  <div className="space-y-4">
                    {outputs.map((output) => (
                      <OutputCard key={output.id} output={output} isOwnInstitution={isOwnInstitution} />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <p className="text-sm text-slate-500">
                    Page {page + 1} of {totalPages}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                    Filter Outputs
                  </h3>
                  <div className="space-y-4 text-xs text-slate-600">
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Research Type
                      </p>
                      {['Funded Project', 'Journal Article', 'Conference Paper', 'Innovation Output', 'IP Registration'].map((type) => (
                        <label key={type} className="flex cursor-pointer items-center gap-2 py-1 hover:text-[#1A1A2E]">
                          <input
                            type="checkbox"
                            className="h-3 w-3 accent-[#1A1A2E]"
                            checked={selectedTypes.includes(type)}
                            onChange={() => {
                              setSelectedTypes((prev) => {
                                const next = prev.includes(type)
                                  ? prev.filter((t) => t !== type)
                                  : [...prev, type]
                                return next
                              })
                              setPage(0)
                            }}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Year Range
                      </p>
                      <input
                        type="range"
                        min="2015"
                        max="2025"
                        className="w-full accent-[#C9A84C]"
                        onChange={(event) => {
                          setYearRange(Number(event.target.value))
                          setPage(0)
                        }}
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                        <span>2015</span>
                        <span>2025</span>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        S&amp;T Cluster
                      </p>
                      {clusterOptions.map(({ label, value }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2 py-1 hover:text-[#1A1A2E]">
                          <input
                            type="checkbox"
                            className="h-3 w-3 accent-[#1A1A2E]"
                            checked={selectedClusters.includes(value)}
                            onChange={() => {
                              setSelectedClusters((prev) => prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value])
                              setPage(0)
                            }}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    Institution Details
                  </h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    {profile.type ? (
                      <p>
                        <span className="text-slate-400">Type: </span>
                        <span className="font-medium text-[#1A1A2E]">{profile.type}</span>
                      </p>
                    ) : null}
                    {profile.province ? (
                      <p>
                        <span className="text-slate-400">Province: </span>
                        <span className="font-medium text-[#1A1A2E]">{profile.province}</span>
                      </p>
                    ) : null}
                    {profile.contactEmail ? (
                      <p>
                        <span className="text-slate-400">Contact: </span>
                        <span className="font-medium text-[#1A1A2E]">{profile.contactEmail}</span>
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="mt-4 flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    Export Report
                  </button>
                </div>

                <OtherHEIsPanel currentId={id} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
