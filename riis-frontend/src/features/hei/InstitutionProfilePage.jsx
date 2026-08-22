import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  Copy,
  ExternalLink,
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

function OutputCard({ output, isOwnInstitution, onViewDetails }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
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
      </div>

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

      {output.abstractExcerpt ? (
        <p className="text-xs text-slate-500 leading-relaxed">{output.abstractExcerpt}</p>
      ) : null}

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

      <div className="pt-1">
        <button
          type="button"
          onClick={() => onViewDetails(output)}
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
            className="flex w-full cursor-pointer items-start gap-4 rounded-[10px] border border-[#e5e7eb] bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold text-white ${getAvatarColor(hei.name)}`}
            >
              {getInitials(hei.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-snug text-[#0d1f3c]">
                {hei.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                {hei.type ? (
                  <span className="text-xs text-slate-500">{hei.type}</span>
                ) : null}
                {hei.province ? (
                  <span className="text-xs text-slate-400">· {hei.province}</span>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-emerald-600">
                  {hei.approvedOutputCount ?? 0} research output{(hei.approvedOutputCount ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TypeBadge({ type }) {
  const colors = {
    'Funded Project': 'bg-amber-100 text-amber-700',
    'Journal Article': 'bg-blue-100 text-blue-700',
    'Conference Paper': 'bg-purple-100 text-purple-700',
    'Innovation Output': 'bg-teal-100 text-teal-700',
    'IP Registration': 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type] || 'bg-slate-100 text-slate-600'}`}>
      {type || '—'}
    </span>
  )
}

function MetaField({ label, value, children }) {
  if (!value && !children) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      {children || <p className="text-sm font-medium text-[#1A1A2E]">{value}</p>}
    </div>
  )
}

function RelatedCard({ record, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(record.id)}
      className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition space-y-1.5"
    >
      <p className="text-sm font-semibold text-[#1A1A2E] leading-snug line-clamp-2">{record.title}</p>
      <span className="text-xs text-slate-500">{record.institutionName}</span>
    </button>
  )
}

function OutputFullDetailView({ output, onBack }) {
  const [currentId, setCurrentId] = useState(output.id)
  const [record, setRecord] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentId) return
    setLoading(true)
    setError('')

    Promise.all([
      apiClient.get(`/search/${currentId}`),
      apiClient.get(`/search/related/${currentId}`).catch(() => ({ data: [] })),
    ])
      .then(([recordRes, relatedRes]) => {
        setRecord(recordRes.data)
        setRelated(Array.isArray(relatedRes.data) ? relatedRes.data : [])
      })
      .catch((err) => setError(extractApiErrorMessage(err, 'Unable to load research record.')))
      .finally(() => setLoading(false))
  }, [currentId])

  const handleCopyCitation = () => {
    if (!record) return
    const authors = Array.isArray(record.authors)
      ? record.authors.map((a) => a.fullName).filter(Boolean).join(', ')
      : ''
    const citation = `${authors} (${record.completionYear}). ${record.title}. ${record.publicationVenue || record.institutionName || ''}. ${record.doi ? `https://doi.org/${record.doi}` : ''}`
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const keywords = Array.isArray(record?.keywords) ? record.keywords : []
  const authors = Array.isArray(record?.authors) ? record.authors : []
  const principalInvestigator = authors[0]?.fullName || '—'

  return (
    <div className="space-y-0">
      <div className="relative overflow-hidden rounded-[12px]" style={{ background: '#1a3a6b' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/DOST_Building.png)',
            backgroundSize: 'cover',
            backgroundPosition: '60% 10%',
            opacity: 0.25,
            mixBlendMode: 'luminosity',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(15, 40, 90, 0.72)' }} />
        <div className="relative z-10 px-8 py-7 w-full">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition mb-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Research Outputs
          </button>
          <h1
            className="text-2xl leading-snug text-white"
            style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
          >
            {record?.title || output.title || 'Research Output Details'}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {record?.institutionName && (
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-xs text-white/90">
                {record.institutionName}
              </span>
            )}
            {record?.province && (
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-xs text-white/90">
                {record.province}
              </span>
            )}
            {record?.subjectDc && (
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-xs text-white/90">
                {record.subjectDc}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : record ? (
        <div className="mt-6 flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-5">
                Record Metadata
              </p>

              <div className="grid grid-cols-3 gap-x-8 gap-y-5">
                <MetaField label="Content Authors">
                  <div className="space-y-0.5">
                    {authors.length > 0 ? authors.map((a, i) => (
                      <p key={i} className="text-sm font-medium text-[#1A1A2E]">
                        {a.fullName}
                        {a.orcidId && (
                          <a
                            href={`https://orcid.org/${a.orcidId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 text-[#A6CE39] text-xs font-bold hover:underline"
                          >
                            iD
                          </a>
                        )}
                      </p>
                    )) : <p className="text-sm text-slate-400">—</p>}
                  </div>
                </MetaField>

                <MetaField label="Funding Source" value={record.fundingSource} />

                <MetaField label="DOI">
                  {record.doi ? (
                    <a
                      href={`https://doi.org/${record.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {record.doi}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <p className="text-sm text-slate-400">—</p>}
                </MetaField>

                <MetaField label="Completion Year" value={record.completionYear} />
                <MetaField label="Publisher" value={record.publisherDc || record.publicationVenue} />
                <MetaField label="Research Type">
                  <TypeBadge type={record.researchType} />
                </MetaField>

                <MetaField label="DC Coverage" value={record.coverageDc} />
                <MetaField label="Principal Investigator" value={principalInvestigator} />
                <MetaField label="Has License" value={record.rightsDc} />

                {record.subjectDc && (
                  <MetaField label="S&T Cluster" value={record.subjectDc} />
                )}
              </div>
            </div>

            {(record.abstractText || record.abstractExcerpt) && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Abstract
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {record.abstractText || record.abstractExcerpt}
                </p>
              </div>
            )}

            {keywords.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs text-slate-600"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-72 shrink-0 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Access
              </p>
              {record.doi ? (
                <a
                  href={`https://doi.org/${record.doi}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition"
                  style={{ background: '#1a6e3c' }}
                >
                  <FileText className="h-4 w-4" />
                  View Full Paper PDF
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
                  <FileText className="h-4 w-4" />
                  No PDF available
                </div>
              )}
              <button
                type="button"
                onClick={handleCopyCitation}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Citation'}
              </button>
            </div>

            {related.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  You Might Also Be Interested In
                </p>
                {related.map((r) => (
                  <RelatedCard
                    key={r.id}
                    record={r}
                    onSelect={(newId) => setCurrentId(newId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function InstitutionProfilePage() {
  const { id } = useParams()
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
  const [selectedOutput, setSelectedOutput] = useState(null)

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
        {selectedOutput ? (
          <OutputFullDetailView
            output={selectedOutput}
            onBack={() => setSelectedOutput(null)}
          />
        ) : status === 'loading' && !profile ? (
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
                        2015 – 2026
                      </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { value: profile.stats?.totalApprovedOutputs ?? 0, label: 'Total Outputs' },
                  { value: Object.entries(profile.stats?.researchTypeDistribution || {}).find(([k]) => k.toLowerCase().includes('funded'))?.[1] ?? 0, label: 'Funded Projects' },
                  { value: profile.stats?.totalUniqueAuthors ?? 0, label: 'Unique Authors' },
                ].map((s, i) => (
                  <div key={i} className="rounded-[10px] bg-white/10 px-6 py-4">
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="mt-1 text-xs text-white/70">{s.label}</p>
                  </div>
                ))}
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
                  <p className="text-xs text-slate-500">
                    Showing {outputs.length} of {profile.stats?.totalApprovedOutputs ?? 0} results
                  </p>
                </div>

                {isFiltering ? (
                  <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Searching...
                  </div>
                ) : outputs.length === 0 ? (
                  <p className="text-sm text-slate-500">No outputs yet.</p>
                ) : (
                  <div className="space-y-4">
                    {outputs.map((output) => (
                      <OutputCard
                        key={output.id}
                        output={output}
                        isOwnInstitution={isOwnInstitution}
                        onViewDetails={setSelectedOutput}
                      />
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
                              setSelectedTypes((prev) =>
                                prev.includes(type)
                                  ? prev.filter((t) => t !== type)
                                  : [...prev, type],
                              )
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
                        max="2026"
                        value={yearRange || 2026}
                        className="w-full accent-[#C9A84C]"
                        onChange={(event) => {
                          setYearRange(Number(event.target.value))
                          setPage(0)
                        }}
                      />
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>2015</span>
                        <span>2026</span>
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