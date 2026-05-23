import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
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

function OutputCard({ output }) {
  const statusColors = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING_REVIEW: 'bg-blue-100 text-blue-700',
    REQUIRES_CORRECTION: 'bg-red-100 text-red-700',
    REJECTED: 'bg-red-100 text-red-700',
  }

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
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors['APPROVED']}`}>
          Approved
        </span>
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
            <span className="text-slate-400">👤</span>
            {output.researchType}
          </span>
        ) : null}
        {output.publicationVenue ? (
          <span className="flex items-center gap-1">
            <span className="text-slate-400">📄</span>
            {output.publicationVenue}
          </span>
        ) : null}
        {output.completionYear ? (
          <span className="flex items-center gap-1">
            <span className="text-slate-400">🕐</span>
            {output.completionYear}
          </span>
        ) : null}
        {output.fundingSource ? (
          <span className="flex items-center gap-1">
            <span className="text-slate-400">🏛</span>
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
        🏫 Other Region VII HEIs
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

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const fetchProfile = async () => {
      setStatus('loading')
      setError('')
      try {
        const response = await apiClient.get(`/institutions/${id}/profile`, {
          params: { page, size: 10 },
          signal: controller.signal,
        })
        setProfile(response.data)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(extractApiErrorMessage(err, 'Unable to load institution profile.'))
      }
    }
    fetchProfile()
    return () => controller.abort()
  }, [id, page])

  const initials = getInitials(profile?.name)
  const avatarColor = getAvatarColor(profile?.name)
  const totalPages = profile?.outputs?.totalPages || 1
  const outputs = profile?.outputs?.content || []

  return (
    <DashboardLayout
      activeLabel="HEI Research Profiles"
      userName="HEI Research User"
      organization="Higher Education Institution"
      navItems={heiNavItems}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Breadcrumb */}
          <div className="border-t-4 border-t-[#C9A84C] px-8 py-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DASHBOARD &gt;{' '}
              <button
                type="button"
                onClick={() => navigate('/hei/research-profiles')}
                className="text-[#C9A84C] hover:underline"
              >
                HEI RESEARCH PROFILES
              </button>
              {profile?.name ? (
                <> &gt; <span className="text-slate-400">{profile.name.toUpperCase()}</span></>
              ) : null}
            </p>
          </div>

          {status === 'loading' && !profile ? (
            <div className="px-8 pb-6 text-sm text-slate-500">Loading profile...</div>
          ) : error ? (
            <div className="px-8 pb-6">
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            </div>
          ) : profile ? (
            <>
              {/* Institution header card */}
              <div className="px-8 pb-6">
                <div className="rounded-xl bg-[#1A1A2E] p-6 text-white">
                  <div className="flex items-start gap-5">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${avatarColor}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {profile.type ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getTypeBadgeClass(profile.type)}`}>
                            {profile.type}
                          </span>
                        ) : null}
                        {profile.province ? (
                          <span className="text-sm text-slate-300">· {profile.province}</span>
                        ) : null}
                        <span className="text-sm text-slate-300">· DOST Region VII</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-purple-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                          ★ Public Access
                        </span>
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                          🗓 2016–2025
                        </span>
                      </div>
                      {profile.contactEmail ? (
                        <p className="mt-1 text-xs text-slate-400">{profile.contactEmail}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="mt-6 grid grid-cols-4 divide-x divide-white/30 rounded-lg bg-white/10 border border-white/10">
                    <StatCard value={profile.stats?.totalApprovedOutputs ?? 0} label="Total Outputs" />
                    <StatCard value={profile.stats?.totalApprovedOutputs ?? 0} label="Approved" />
                    <StatCard
                      value={Object.entries(profile.stats?.researchTypeDistribution || {}).find(([k]) => k.toLowerCase().includes('funded'))?.[1] ?? 0}
                      label="Funded Projects"
                    />
                    <StatCard
                      value={Object.entries(profile.stats?.researchTypeDistribution || {}).find(([k]) => k.toLowerCase().includes('applied'))?.[1] ?? 0}
                      label="Applied Research"
                    />
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="grid grid-cols-3 gap-6 px-8 pb-8">
                {/* Left — outputs list */}
                <div className="col-span-2 space-y-4">
                  {/* Research Profile — shown when themeKeywords available, placeholder otherwise */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div>
                      <h2 className="flex items-center gap-2 font-bold text-[#1A1A2E]">
                        📊 Research Profile
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Research areas and specializations, ranked by recent impact over last 12 months
                      </p>
                    </div>

                    {profile.themeKeywords?.length > 0 ? (
                      <>
                        {/* Keyword tags */}
                        <div className="flex flex-wrap gap-2">
                          {profile.themeKeywords.map((tag, i) => {
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

                        {/* Impact bars */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Top Research Areas by Research Impact
                          </p>
                          {profile.themeKeywords.slice(0, 6).map((tag) => (
                            <div key={tag.keyword} className="flex items-center gap-3">
                              <p className="w-40 shrink-0 text-xs text-slate-600">{tag.keyword}</p>
                              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${Math.min(100, tag.weight * 10)}%` }}
                                />
                              </div>
                              <p className="w-8 text-right text-xs font-semibold text-emerald-600">
                                {(tag.weight * 10).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 px-4 py-3">
                        <p className="text-xs text-slate-400 italic">
                          Research niche profile will appear here once AI analysis is complete.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-[#1A1A2E]">📄 Research Outputs</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Publications from this institution on record</p>
                      </div>
                      <input
                        type="text"
                        placeholder="Filter research..."
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C9A84C] w-44"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Showing {outputs.length} of {profile.stats?.totalApprovedOutputs ?? 0} approved results
                      {profile.stats?.totalApprovedOutputs > outputs.length ? (
                        <> · <button type="button" className="text-[#C9A84C] hover:underline font-medium">View All »</button></>
                      ) : null}
                    </p>
                  </div>

                  {outputs.length === 0 ? (
                    <p className="text-sm text-slate-500">No approved outputs yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {outputs.map((output) => (
                        <OutputCard key={output.id} output={output} />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
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

                {/* Right sidebar */}
                <div className="space-y-5">

                  {/* Filter Outputs */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
                      <span>▼</span> Filter Outputs
                    </h3>
                    <div className="space-y-4 text-xs text-slate-600">
                      <div>
                        <p className="mb-2 font-semibold uppercase tracking-wider text-slate-400 text-[10px]">Research Type</p>
                        {['Funded Project', 'Journal Article', 'Conference Paper', 'Innovation Output', 'IP Registration'].map((type) => (
                          <label key={type} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[#1A1A2E]">
                            <input type="checkbox" className="h-3 w-3 accent-[#1A1A2E]" />
                            {type}
                          </label>
                        ))}
                      </div>
                      <div>
                        <p className="mb-2 font-semibold uppercase tracking-wider text-slate-400 text-[10px]">Year Range</p>
                        <input type="range" min="2015" max="2025" className="w-full accent-[#C9A84C]" />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>2015</span><span>2025</span>
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold uppercase tracking-wider text-slate-400 text-[10px]">S&T Cluster</p>
                        {['Climate & Environment', 'Health & Medical', 'Agriculture & Food', 'Education & Social', 'Tech, Engr & Innovation'].map((cluster) => (
                          <label key={cluster} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[#1A1A2E]">
                            <input type="checkbox" className="h-3 w-3 accent-[#1A1A2E]" />
                            {cluster}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Institution Details */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
                      🏛 Institution Details
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      {profile.type ? (
                        <p><span className="text-slate-400">Type: </span><span className="font-medium text-[#1A1A2E]">{profile.type}</span></p>
                      ) : null}
                      {profile.province ? (
                        <p><span className="text-slate-400">Province: </span><span className="font-medium text-[#1A1A2E]">{profile.province}</span></p>
                      ) : null}
                      {profile.contactEmail ? (
                        <p><span className="text-slate-400">Contact: </span><span className="font-medium text-[#1A1A2E]">{profile.contactEmail}</span></p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1"
                    >
                      📋 Export Report
                    </button>
                  </div>

                  {/* Other Region VII HEIs */}
                  <OtherHEIsPanel currentId={id} />
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </DashboardLayout>
  )
}