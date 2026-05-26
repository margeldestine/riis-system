import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart3, Building2, Calendar, ChevronDown, FileText, Globe, MapPin, User } from 'lucide-react'
import apiClient from '../../services/apiClient'

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

function getTypeBadge(type) {
  if (!type) return { bg: '#f1f5f9', color: '#475569' }
  const val = type.toUpperCase()
  if (val.includes('SUC') || val.includes('STATE')) return { bg: '#dbeafe', color: '#1d4ed8' }
  if (val.includes('PRIVATE')) return { bg: '#ede9fe', color: '#7c3aed' }
  return { bg: '#f1f5f9', color: '#475569' }
}

function OutputCard({ output, isOwnInstitution }) {
  const navigate = useNavigate()
  const statusColors = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING_REVIEW: 'bg-blue-100 text-blue-700',
    REQUIRES_CORRECTION: 'bg-red-100 text-red-700',
    REJECTED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 border-l-4 border-l-emerald-500">
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
            {output.status}
          </span>
        ) : null}
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
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.content ?? []
        setOthers(list.filter(h => String(h.id) !== String(currentId)).slice(0, 4))
      })
      .catch(() => {})
  }, [currentId])

  if (!others.length) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
        <Building2 className="h-4 w-4 text-slate-500" />
        Other Region VII HEIs
      </h3>
      <div className="space-y-3">
        {others.map(hei => (
          <button
            key={hei.id}
            type="button"
            onClick={() => navigate(`/institutions/${hei.id}`)}
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
                  {hei.approvedOutputCount ?? 0} research outputs
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PublicInstitutionProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading')
  const [page, setPage] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedClusters, setSelectedClusters] = useState([])
  const [yearRange, setYearRange] = useState(0)
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    if (profile) {
      setIsFiltering(true)
    } else {
      setStatus('loading')
    }
    apiClient.get(`/institutions/${id}/profile`, {
      params: {
        page,
        size: 5,
        keyword: searchKeyword || undefined,
        researchTypes: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
        subjects: selectedClusters.length > 0 ? selectedClusters.join(',') : undefined,
        yearTo: yearRange || undefined,
      },
      signal: controller.signal,
    })
      .then(res => { setProfile(res.data); setStatus('success') })
      .catch(err => { if (!controller.signal.aborted) setStatus('error') })
      .finally(() => { setIsFiltering(false) })
    return () => controller.abort()
  }, [id, page, searchKeyword, selectedTypes, selectedClusters, yearRange])

  const outputs = profile?.outputs?.content || []
  const totalPages = profile?.outputs?.totalPages || 1
  const avatarColor = getAvatarColor(profile?.name)
  const clusterOptions = [
    { label: 'Climate & Environment', value: 'Climate & Env' },
    { label: 'Health & Medical', value: 'Health & Medical' },
    { label: 'Agriculture & Food', value: 'Agriculture' },
    { label: 'Education & Social', value: 'Education & Social' },
    { label: 'Tech, Engr & Innovation', value: 'Tech & Innovation' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#c9a84c', fontWeight: 800, fontSize: 14 }}>D</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Republic of the Philippines</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>DASIG Research Information System</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => navigate('/')} style={{ border: 'none', background: 'transparent', fontSize: 14, color: '#64748b', cursor: 'pointer', fontWeight: 500 }}>Browse Research</button>
          <button onClick={() => navigate('/discover')} style={{ border: 'none', background: 'transparent', fontSize: 14, color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', borderBottom: '2px solid #1a1a2e', paddingBottom: 2 }}>HEI Directory</button>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/login')} style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer' }}>Login</button>
          <button onClick={() => navigate('/register')} style={{ border: 'none', background: '#1a1a2e', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Register</button>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div style={{ padding: '12px 40px', fontSize: 13, color: '#94a3b8' }}>
        <button onClick={() => navigate('/discover')} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Return to Institutions</button>
      </div>

      {status === 'loading' && !profile && (
        <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>Loading profile...</div>
      )}
      {status === 'error' && (
        <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', color: '#dc2626' }}>Unable to load institution profile.</div>
      )}

       {(status === 'success' || (status === 'loading' && profile)) && profile && (
        <div className="mx-auto w-full max-w-6xl space-y-6" style={{ padding: '0 24px 48px', flex: 1 }}>
          <div className="rounded-[12px] bg-[#0d1f3c] p-6 text-white shadow-sm">
            <div className="flex items-start gap-5">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-[16px] font-bold text-white ${avatarColor}`}>
                {getInitials(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[20px] font-bold text-white">{profile.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-white/70">
                  {profile.type && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getTypeBadgeClass(profile.type)}`}>{profile.type}</span>}
                  {profile.province && <span className="inline-flex items-center gap-1 text-[12px]"><MapPin className="h-3.5 w-3.5 text-white/60" />{profile.province}</span>}
                  <span className="inline-flex items-center gap-1 text-[12px]"><Globe className="h-3.5 w-3.5 text-white/60" />DOST Region VII</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500 px-2.5 py-0.5 text-xs font-semibold text-white"><Globe className="h-3.5 w-3.5" />Public Access</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white"><Calendar className="h-3.5 w-3.5 text-white/80" />2016–2025</span>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-4">
              {[
                { value: profile.stats?.totalApprovedOutputs ?? 0, label: 'Total Outputs' },
                { value: profile.stats?.totalApprovedOutputs ?? 0, label: 'Approved' },
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
                  Showing {outputs.length} of {profile.stats?.totalApprovedOutputs ?? 0} approved results
                </p>
              </div>

              {isFiltering ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Searching...
                </div>
              ) : outputs.length === 0 ? (
                <p className="text-sm text-slate-500">No approved outputs yet.</p>
              ) : (
                <div className="space-y-4">
                  {outputs.map((output) => (
                    <OutputCard key={output.id} output={output} isOwnInstitution={false} />
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
                            setSelectedClusters((prev) =>
                              prev.includes(value)
                                ? prev.filter((c) => c !== value)
                                : [...prev, value],
                            )
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
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
        <span style={{ fontWeight: 700, color: '#1a1a2e' }}>DASIG</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>Privacy Policy</span>
          <span>Technical Support</span>
          <span style={{ color: '#c9a84c', fontWeight: 600 }}>DOST</span>
        </div>
      </footer>
    </div>
  )
}
