import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Filter, X, Download, ChevronDown, ExternalLink } from 'lucide-react'
import apiClient from '../../services/apiClient'

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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          {result.doi ? (
            <a
              href={`https://doi.org/${result.doi}`}
              target="_blank"
              rel="noreferrer"
              className="text-lg font-semibold text-[#1A1A2E] hover:text-blue-600 leading-snug"
            >
              {result.title}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(result)}
              className="text-left text-lg font-semibold text-[#1A1A2E] hover:text-blue-600 leading-snug"
            >
              {result.title}
            </button>
          )}

          {/* Authors + institution + year */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
            {authors && (
              <span className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">👤</span>
                {authors}
              </span>
            )}
            {result.institutionName && (
              <>
                <span className="text-slate-300">·</span>
                <span>{result.institutionName}</span>
              </>
            )}
            {result.completionYear && (
              <>
                <span className="text-slate-300">·</span>
                <span>{result.completionYear}</span>
              </>
            )}
          </div>

          {/* Abstract */}
          {result.abstractExcerpt && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
              {result.abstractExcerpt}
            </p>
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
          <TypeBadge type={result.researchType} />
          {result.publicationVenue && (
            <span className="text-xs text-slate-400">{result.publicationVenue}</span>
          )}
          {result.similarityScore != null && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              result.similarityScore >= 85 ? 'bg-emerald-100 text-emerald-700' :
              result.similarityScore >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {result.similarityScore}% match
            </span>
          )}
        </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col gap-2">
          <button
          type="button"
          onClick={() => {
            console.log('similarity score being passed:', result.similarityScore)
            navigate(`/research/${result.id}`, { state: { similarityScore: result.similarityScore ?? null } })
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
        >
          View Details
        </button>
          {result.doi && (
            <a
              href={`https://doi.org/${result.doi}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <Download className="h-3 w-3" />
              PDF
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function RelatedDrawer({ open, record, related, relatedLoading, onClose }) {
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
              <a
                href={`https://doi.org/${record.doi}`}
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
            {relatedLoading ? (
              <p className="text-xs text-slate-400">Loading related records...</p>
            ) : related.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No related records found.</p>
            ) : (
              <div className="space-y-3">
                {related.map(r => (
                  <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-[#1A1A2E] leading-snug">{r.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-500">{r.institutionName}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        {r.similarityScore}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  const [mode, setMode] = useState(searchParams.get('mode') || 'KEYWORD')
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

  useEffect(() => {
    apiClient.get('/institutions').then(res => {
      setInstitutions(Array.isArray(res.data) ? res.data : [])
    }).catch(() => {})
  }, [])

  const handleSearch = useCallback(async (overrideQuery) => {
    const q = overrideQuery !== undefined ? overrideQuery : query
    setLoading(true)
    setError('')
    setHasSearched(true)

    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (mode !== 'KEYWORD') params.set('mode', mode)
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    setSearchParams(params)

    try {
      const res = await apiClient.post('/search', { query: q, mode, filters }, { headers: { Authorization: undefined } })
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
    if (searchParams.get('q')) handleSearch(searchParams.get('q'))
    else handleSearch('')
  }, [])

  const handleSelectRecord = async (record) => {
    setSelectedRecord(record)
    setDrawerOpen(true)
    setRelated([])
    setRelatedLoading(true)
    try {
      const res = await apiClient.get(`/search/related/${record.id}`, { headers: { Authorization: undefined } })
      setRelated(res.data || [])
    } catch {
      setRelated([])
    } finally {
      setRelatedLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#F4F6F9] font-sans'}>
      {/* Top nav — only shown on public page */}
      {!embedded && <nav className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
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
      {/* Hero section */}
      {/* Hero section */}
      <div className="relative px-8 py-16 text-center overflow-hidden" style={{ background: '#1a3a6b' }}>
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
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Explore Research Outputs</h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>from Region VII HEIs</p>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Search through thousands of research papers, projects, and innovations from Higher Education Institutions
            across Central Visayas. Discover groundbreaking work in science, technology, and social development.
          </p>

          <div className="mt-6 mx-auto flex gap-2" style={{ maxWidth: 700 }}>
            <div className="flex-1 flex items-center gap-3 px-4 py-3 shadow-lg" style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 12 }}>
              <Search className="h-5 w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                placeholder="Search by title, author, keyword, or institution..."
                style={{ flex: 1, fontSize: 14, background: 'transparent', border: 'none', outline: 'none', color: '#fff' }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition"
              style={{ backgroundColor: '#1a6e3c', borderRadius: 12 }}
            >
              Search
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Quick filters:</span>
            {[
              { label: `${total > 0 ? total : '—'} Approved Records` },
              { label: `${institutions.length} HEIs` },
              { label: '2 Provinces' },
              { label: 'Marine Science', key: 'Marine Science' },
            ].map(({ label, key }) => (
              <button
                key={label}
                type="button"
                onClick={() => key ? handleFilterChange('researchType', key) : null}
                className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/20 transition"
              >
                {label}
              </button>
            ))}
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
          <div className="w-56 shrink-0 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-bold text-[#1A1A2E]">Refine Results</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">HEI / Institution</p>
                  <div className="relative">
                    <select
                      value={filters.institutionId}
                      onChange={(e) => handleFilterChange('institutionId', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-xs text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                    >
                      <option value=""></option>
                      {institutions.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Research Type</p>
                  <div className="relative">
                    <select
                      value={filters.researchType}
                      onChange={(e) => handleFilterChange('researchType', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-xs text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                    >
                      <option value=""></option>
                      {['Funded Project', 'Journal Article', 'Conference Paper', 'Innovation Output', 'IP Registration', 'Community Extension Research'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Province</p>
                  <div className="relative">
                    <select
                      value={filters.province}
                      onChange={(e) => handleFilterChange('province', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-xs text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                    >
                      <option value=""></option>
                      {['Cebu', 'Bohol', 'Negros Oriental', 'Siquijor'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Year</p>
                  <div className="relative">
                    <select
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-xs text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                    >
                      <option value=""></option>
                      {Array.from({ length: 10 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Funding Source</p>
                  <input
                    type="text"
                    value={filters.fundingSource}
                    onChange={(e) => handleFilterChange('fundingSource', e.target.value)}
                    placeholder="e.g. DOST"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="w-full rounded-lg bg-[#1A1A2E] py-2 text-xs font-semibold text-white hover:bg-[#11111f] transition"
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
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-[#C9A84C]">{total}</p>
                <p className="text-xs text-slate-500 mt-1">Research Outputs Found</p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading ? 'Searching...' : hasSearched ? `Showing ${results.length} results` : ''}
              </p>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                {['KEYWORD', 'SEMANTIC', 'BOTH'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 font-medium transition ${mode === m ? 'bg-[#1A1A2E] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    {m.charAt(0) + m.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent mx-auto" />
                  <p className="mt-3 text-sm text-slate-500">Searching...</p>
                </div>
              </div>
            ) : results.length === 0 && hasSearched ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-lg font-semibold text-[#1A1A2E]">No results found</p>
                <p className="text-sm text-slate-400 mt-1">Try broadening your search or removing some filters.</p>
              </div>
            ) : (
              results.map(result => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onSelect={handleSelectRecord}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer — only shown on public page */}
      {!embedded && (
        <footer className="border-t border-slate-200 bg-white px-8 py-4 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-[#1A1A2E]">DASIG</span>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span>Technical Support</span>
            <span className="text-[#C9A84C] font-semibold">DOST</span>
          </div>
        </footer>
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