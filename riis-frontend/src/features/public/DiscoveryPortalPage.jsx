import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Filter, X, ChevronDown, ExternalLink, MapPin } from 'lucide-react'
import apiClient from '../../services/apiClient'
import FullTextAction from './FullTextAction'
import PublicFooter from './PublicFooter'
import VisibilityBadge from './VisibilityBadge'
import RelatedResearchList from './RelatedResearchList'
import { isAbstractWithheld } from './accessTiers'
const MODE_LABELS = { KEYWORD: 'Keyword', SEMANTIC: 'Semantic', BOTH: 'Combined' }

// Province options shown as buttons in the filter sidebar ('' = all provinces).
const PROVINCES = ['Cebu', 'Bohol']


const FILTER_FIELD_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs text-slate-600 appearance-none transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/60 focus:border-[#C9A84C]'

function extractApiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallback
}

function TypeBadge({ type }) {
  const colors = {
    'Funded Project': 'bg-amber-100 text-amber-700',
    'Journal Article': 'bg-blue-100 text-blue-700',
    'Conference Paper': 'bg-purple-100 text-purple-700',
    'Innovation Output': 'bg-teal-100 text-teal-700',
    'IP Registration': 'bg-rose-100 text-rose-700',
    'Community Extension Research': 'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type] || 'bg-slate-100 text-slate-600'}`}>
      {type || '—'}
    </span>
  )
}

function ResultCard({ result, onSelect }) {
  const navigate = useNavigate()
   const authors = Array.isArray(result.authors)
    ? result.authors.map(a => a.fullName).filter(Boolean).join(', ')
    : ''

  const keywords = Array.isArray(result.keywords) ? result.keywords : []

  return (
    <div className="group rounded-2xl border border-slate-200 border-l-4 border-l-[#C9A84C]/70 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-l-[#C9A84C] hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          {result.doi ? (
            
            <a  href={`https://doi.org/${result.doi}`}
              target="_blank"
              rel="noreferrer"
                className="break-words text-lg font-semibold text-[#1A1A2E] hover:text-blue-600 leading-snug"
            >
              {result.title}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(result)}
              className="break-words text-left text-lg font-semibold text-[#1A1A2E] hover:text-blue-600 leading-snug"
            >
              {result.title}
            </button>
          )}

          <div className="mt-1 text-sm text-slate-500">
            {authors ? authors : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {result.completionYear ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                {result.completionYear}
              </span>
            ) : null}
            {result.fundingSource || result.institutionName ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 18V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11M10 9h4m-4 3h4m-4 3h4" /></svg>
                {result.fundingSource || result.institutionName}
              </span>
            ) : null}
          </div>

          {/* Abstract */}
          {result.abstractExcerpt && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
              {result.abstractExcerpt}
            </p>
          )}
          {isAbstractWithheld(result) && (
            <p className="mt-2 text-xs italic text-slate-400">Abstract withheld by the institution.</p>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {keywords.slice(0, 5).map(kw => (
                <span key={kw} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Type + venue */}
          <div className="mt-3 flex items-center gap-3">
            {result.researchType ? (
              <span className="shrink-0">
                <TypeBadge type={result.researchType} />
              </span>
            ) : null}
            <VisibilityBadge visibility={result.visibility} />
            {result.publicationVenue && (
              <span
                className="min-w-0 flex-1 truncate text-xs text-slate-400"
                title={result.publicationVenue}
              >
                {result.publicationVenue}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="w-44 shrink-0 flex flex-col items-stretch gap-2">
          {result.similarityScore != null && (
                        <span className={`self-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              result.similarityScore >= 85 ? 'bg-emerald-100 text-emerald-700' :
              result.similarityScore >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {result.similarityScore}% match
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              navigate(`/research/${result.id}`, { state: { similarityScore: result.similarityScore ?? null } })
            }}
            className="rounded-lg bg-[#1A1A2E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#2a2a4a] transition whitespace-nowrap"
          >
            View Details
          </button>
          <FullTextAction record={result} variant="card" />
        </div>
      </div>
    </div>
  )
}

function RelatedDrawer({ open, record, related, relatedLoading, onClose }) {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open || !record) return null

  const keywords = Array.isArray(record.keywords) ? record.keywords : []
  const authors = Array.isArray(record.authors)
    ? record.authors.map(a => a.fullName).filter(Boolean).join('; ')
    : ''

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-screen w-[480px] bg-white shadow-xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-[#1A1A2E]">Research Details</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#1A1A2E] leading-snug">{record.title}</h2>
            {record.institutionName && (
              <p className="mt-1 text-sm text-slate-500">{record.institutionName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Type', record.researchType],
              ['Year', record.completionYear],
              ['Province', record.province],
              ['Funding', record.fundingSource],
              ['Venue', record.publicationVenue],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                <p className="font-medium text-[#1A1A2E]">{value}</p>
              </div>
            ))}
          </div>

          {authors && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Authors</p>
              <p className="text-sm text-[#1A1A2E]">{authors}</p>
            </div>
          )}

          {record.doi && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">DOI</p>
              
              <a href={`https://doi.org/${record.doi}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {record.doi} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {record.abstractExcerpt && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Abstract</p>
              <p className="text-sm text-slate-600 leading-relaxed">{record.abstractExcerpt}</p>
            </div>
          )}
          {isAbstractWithheld(record) && (
            <p className="text-xs italic text-slate-400">Abstract withheld by the institution.</p>
          )}

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Full text</p>
            <FullTextAction record={record} variant="panel" />
          </div>

          {keywords.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map(kw => (
                  <span key={kw} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-bold text-[#1A1A2E] mb-3">Related Research</p>
                        <RelatedResearchList
              related={related}
              loading={relatedLoading}
              onSelect={(id) => navigate(`/research/${id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DiscoveryPortalPage({ embedded = false }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [mode, setMode] = useState(searchParams.get('mode') || 'BOTH')
  const pageSize = 5
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get('page') || '1', 10)
    return Number.isFinite(p) && p > 1 ? p - 1 : 0
  })
  const [filters, setFilters] = useState({
    institutionId: searchParams.get('institutionId') || '',
    province: searchParams.get('province') || '',
    researchType: searchParams.get('researchType') || '',
    year: searchParams.get('year') || '',
    fundingSource: searchParams.get('fundingSource') || '',
  })

  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fallback, setFallback] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [selectedRecord, setSelectedRecord] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [related, setRelated] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  const [institutions, setInstitutions] = useState([])
  const lastMode = useRef(mode)

  useEffect(() => {
    apiClient.get('/institutions').then(res => {
      setInstitutions(Array.isArray(res.data) ? res.data : [])
    }).catch(() => {})
  }, [])

  // Cascading filter: HEI dropdown only shows institutions within the
  // selected province. When no province is selected, all institutions show.
  const filteredInstitutions = filters.province
    ? institutions.filter(i => i.province === filters.province)
    : institutions

    const handleSearch = useCallback(async (overrideQuery, startPage = 0) => {
    const q = overrideQuery !== undefined ? overrideQuery : query
    setLoading(true)
    setError('')
    setHasSearched(true)
    setPage(startPage)

    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (mode !== 'BOTH') params.set('mode', mode)
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    if (startPage > 0) params.set('page', String(startPage + 1))
    setSearchParams(params)

    try {
      const res = await apiClient.post('/search', { query: q, mode, filters })
      setResults(res.data.results || [])
      setTotal(res.data.total || 0)
      setFallback(res.data.fallback || false)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to search right now.'))
    } finally {
      setLoading(false)
    }
  }, [query, mode, filters, setSearchParams])

  useEffect(() => {
    handleSearch(searchParams.get('q') || '', page)
  }, [])
  useEffect(() => {
    if (lastMode.current === mode) return
    lastMode.current = mode
    handleSearch()
  }, [mode])

  const handleSelectRecord = async (record) => {
    setSelectedRecord(record)
    setDrawerOpen(true)
    setRelated([])
    setRelatedLoading(true)
    try {
      const res = await apiClient.get(`/search/related/${record.id}`)
      setRelated(res.data || [])
    } catch {
      setRelated([])
    } finally {
      setRelatedLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }

      // If Province changes, drop the HEI selection unless it still
      // belongs to the newly selected province.
      if (key === 'province' && prev.institutionId) {
        const stillValid = value
          ? institutions.some(i => i.id === prev.institutionId && i.province === value)
          : true
        if (!stillValid) next.institutionId = ''
      }

      return next
    })
  }

    const goToPage = (p) => {
    setPage(p)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p > 0) next.set('page', String(p + 1))
      else next.delete('page')
      return next
    }, { replace: true })
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const pagedResults = results.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-b from-[#F4F6F9] to-white'} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top nav — only shown on public page */}
      {!embedded && <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#1A1A2E] flex items-center justify-center">
            <span className="text-xs font-bold text-[#C9A84C]">D</span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Republic of the Philippines
            </p>
            <p className="text-xs font-bold text-[#1A1A2E]">DASIG Research Information System</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button type="button" className="text-sm font-semibold text-[#1A1A2E] border-b-2 border-[#1A1A2E] pb-0.5">
            Browse Research
          </button>
          <button type="button" onClick={() => navigate('/discover')} className="text-sm text-slate-500 hover:text-[#1A1A2E]">
          HEI Directory
        </button>
          <button type="button" onClick={() => navigate('/about')} className="text-sm text-slate-500 hover:text-[#1A1A2E]">
            About
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-[#1A1A2E] hover:text-slate-600"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#11111f] transition"
          >
            Register
          </button>
        </div>
      </nav>}

      {/* Hero section */}
      <div className={`relative py-16 text-center overflow-hidden ${embedded ? '-mx-[32px] -mt-[32px] w-[calc(100%+64px)]' : ''}`} style={{ background: '#1a3a6b' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/DOST_Building.png)',
            backgroundSize: 'cover',
            backgroundPosition: '50% 30%',
            opacity: 0.25,
            mixBlendMode: 'luminosity',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(15, 40, 90, 0.72)' }} />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#E8CF85]">
            <MapPin className="h-3 w-3" /> Region VII · Central Visayas
          </span>
          <h1 className="mt-4 text-4xl font-bold text-white md:text-5xl" style={{ fontFamily: "'Libre Baskerville', serif" }}>Explore Research Outputs</h1>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#C9A84C]" />
          <p className="mt-4 text-base" style={{ color: 'rgba(255,255,255,0.85)' }}>from Region VII HEIs</p>
          <p className="mt-3 text-sm max-w-xl mx-auto px-4" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            Search through thousands of research papers, projects, and innovations from Higher Education Institutions
            across Central Visayas. Discover groundbreaking work in science, technology, and social development.
          </p>

          <div className="mt-8 mx-auto flex items-center gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/30 focus-within:ring-2 focus-within:ring-[#C9A84C]" style={{ maxWidth: 700 }}>
            <div className="flex flex-1 items-center gap-3 px-3">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                placeholder="Search by title, author, keyword, or institution..."
                className="w-full bg-transparent py-2.5 text-sm text-slate-800 placeholder:text-slate-400"
                style={{ border: 'none', outline: 'none' }}
              />
            </div>
              <button
              type="button"
              onClick={() => handleSearch()}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:brightness-110"
              style={{ backgroundColor: '#F5C518' }}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {fallback && hasSearched && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center justify-between">
            <span>Semantic ranking is temporarily unavailable. Results are shown by keyword relevance.</span>
            <button type="button" onClick={() => setFallback(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Filter sidebar */}
          <div className="w-64 shrink-0 space-y-4 self-start lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <Filter className="h-4 w-4 text-[#C9A84C]" />
                <h3 className="text-sm font-bold text-[#1A1A2E]">Refine Results</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-2">Province</p>
                                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Filter by province">
                    {PROVINCES.map(p => {
                      const active = filters.province === p
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleFilterChange('province', active ? '' : p)}
                          className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] ${
                            active
                              ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-[#C9A84C] hover:bg-amber-50'
                          }`}
                        >
                          <MapPin className={`h-3 w-3 ${active ? 'text-[#C9A84C]' : 'text-slate-400'}`} />
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">HEI / Institution</p>
                  <div className="relative">
                    <select
                      value={filters.institutionId}
                      onChange={(e) => handleFilterChange('institutionId', e.target.value)}
                      className={FILTER_FIELD_CLASS}
                    >
                      <option value="">
                          <option value="">Select institution</option>
                      </option>
                      {filteredInstitutions.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                  {filters.province && filteredInstitutions.length === 0 && (
                    <p className="mt-1 text-[10px] text-slate-400">No institutions registered in {filters.province} yet.</p>
                  )}
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Research Type</p>
                  <div className="relative">
                    <select
                      value={filters.researchType}
                      onChange={(e) => handleFilterChange('researchType', e.target.value)}
                      className={FILTER_FIELD_CLASS}
                    >
                      <option value="">Select type</option>
                      {['Funded Project', 'Journal Article', 'Conference Paper', 'Innovation Output', 'IP Registration', 'Community Extension Research'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Year</p>
                  <div className="relative">
                    <select
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className={FILTER_FIELD_CLASS}
                    >
                      <option value="">Select year</option>
                      {Array.from({ length: new Date().getFullYear() - 2026 + 1 }, (_, i) => 2026 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Funding Source</p>
                  <input
                    type="text"
                    value={filters.fundingSource}
                    onChange={(e) => handleFilterChange('fundingSource', e.target.value)}
                    placeholder="e.g. DOST"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-600 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/60 focus:border-[#C9A84C]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="w-full rounded-lg bg-[#1A1A2E] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#2a2a4a] transition"
                >
                  Apply Filters
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ institutionId: '', province: '', researchType: '', year: '', fundingSource: '' })}
                    className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                  >
                    Clear Filters ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>

            {hasSearched && (
              <div className="rounded-2xl border border-[#C9A84C]/30 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm text-center">
                <p className="text-3xl font-bold text-[#C9A84C]">{total}</p>
                <p className="text-xs text-slate-500 mt-1">Research Outputs Found</p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {hasSearched ? `Showing ${pagedResults.length} of ${results.length} results` : ''}
              </p>
              <div className="flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
                {['KEYWORD', 'SEMANTIC', 'BOTH'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-4 py-1.5 font-medium transition ${mode === m ? 'bg-[#1A1A2E] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent mx-auto" />
                  <p className="mt-3 text-sm text-slate-500">Searching research outputs...</p>
                </div>
              </div>
            ) : results.length === 0 && hasSearched ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-[#1A1A2E]">No results found</p>
                <p className="text-sm text-slate-400 mt-1">Try broadening your search or removing some filters.</p>
              </div>
            ) : (
              pagedResults.map(result => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onSelect={handleSelectRecord}
                />
              ))
            )}

            {hasSearched && !loading && results.length > pageSize ? (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <p className="text-sm text-slate-500">
                  Page {currentPage + 1} of {totalPages}
                </p>
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer — only shown on public page */}
      {!embedded && (
        <PublicFooter />
      )}

      <RelatedDrawer
        open={drawerOpen}
        record={selectedRecord}
        related={related}
        relatedLoading={relatedLoading}
        onClose={() => { setDrawerOpen(false); setSelectedRecord(null) }}
      />
    </div>
  )
}