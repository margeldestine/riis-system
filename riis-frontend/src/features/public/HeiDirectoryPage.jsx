import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  '#1d4ed8', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#b45309',
]

function getAvatarColor(name) {
  if (!name) return avatarColors[0]
  return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

const tagColors = [
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#fef9c3', color: '#a16207' },
  { bg: '#ede9fe', color: '#7c3aed' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#ccfbf1', color: '#0f766e' },
]

function InstitutionCard({ hei, onClick }) {
  const color = getAvatarColor(hei.name)
  const initials = getInitials(hei.name)
  const keywords = hei.themeKeywords || []
  const typeLabel = hei.type?.toUpperCase().includes('SUC') ? 'SUC' : hei.type?.toUpperCase().includes('PRIVATE') ? 'PRIVATE' : hei.type || '—'

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[14px] font-extrabold text-white"
          style={{ background: color }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[#1A1A2E]">{hei.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium uppercase text-slate-500">{typeLabel}</span>
            <span className="text-[12px] text-slate-400">·</span>
            <span className="text-[12px] text-blue-600">{hei.province}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125V5.625A3.375 3.375 0 0 0 10.125 2.25H8.25m2.25 0H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        {hei.approvedOutputCount ?? 0} research outputs
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.slice(0, 4).map((kw, i) => (
            <span key={kw.keyword || kw} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: tagColors[i % tagColors.length].bg, color: tagColors[i % tagColors.length].color }}>
              {kw.keyword || kw}
            </span>
          ))}
          {keywords.length > 4 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              +{keywords.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function HeiDirectoryPage() {
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setIsLoading(true)
    apiClient.get('/institutions')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.content ?? []
        setInstitutions(list)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = institutions.filter(i =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.province?.toLowerCase().includes(search.toLowerCase())
  )

  return (
   <div className="min-h-screen bg-[#F4F6F9] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      {/* Nav */}
      {/* Nav */}
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#1A1A2E] flex items-center justify-center">
            <span className="text-xs font-bold text-[#C9A84C]">D</span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Republic of the Philippines</p>
            <p className="text-xs font-bold text-[#1A1A2E]">DASIG Research Information System</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-[#1A1A2E]">Browse Research</button>
          <button type="button" className="text-sm font-semibold text-[#1A1A2E] border-b-2 border-[#1A1A2E] pb-0.5">HEI Directory</button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/login')} className="text-sm font-semibold text-[#1A1A2E] hover:text-slate-600">Login</button>
          <button type="button" onClick={() => navigate('/register')} className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#11111f] transition">Register</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative py-16 text-center overflow-hidden" style={{ background: '#1a3a6b' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '50% 30%', opacity: 0.25, mixBlendMode: 'luminosity' }} />
        <div className="absolute inset-0" style={{ background: 'rgba(15, 40, 90, 0.72)' }} />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Libre Baskerville', serif" }}>Higher Education Institutions</h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>from Region VII HEIs</p>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Search through thousands of research papers, projects, and innovations from Higher Education Institutions across Central Visayas. Discover groundbreaking work in science, technology, and social development.
          </p>
          <div className="mt-6 mx-auto flex gap-2" style={{ maxWidth: 700 }}>
            <div className="flex-1 flex items-center gap-3 px-4 py-3 shadow-lg" style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 12 }}>
              <svg className="h-5 w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search institutions by name or province..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff' }} />
            </div>
            <button type="button" className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition" style={{ backgroundColor: '#1a6e3c', borderRadius: 12 }}>Search</button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto w-full max-w-6xl px-6 py-10 flex-1">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading institutions...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No institutions found.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(hei => (
              <InstitutionCard
                key={hei.id}
                hei={hei}
                onClick={() => navigate(`/institutions/${hei.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-8 py-4 flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-[#1A1A2E]">DASIG</span>
        <div className="flex items-center gap-4">
          <span>Privacy Policy</span>
          <span>Technical Support</span>
          <span className="text-[#C9A84C] font-semibold">DOST</span>
        </div>
      </footer>
    </div>
  )
}
