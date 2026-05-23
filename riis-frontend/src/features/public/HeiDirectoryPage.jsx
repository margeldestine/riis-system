import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../services/apiClient'

function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
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
  const typeLabel = hei.type?.toUpperCase().includes('SUC') ? 'SUC' : hei.type?.toUpperCase().includes('PRIVATE') ? 'Private' : hei.type || '—'
  const typeColor = hei.type?.toUpperCase().includes('SUC') ? { bg: '#dbeafe', color: '#1d4ed8' } : { bg: '#ede9fe', color: '#7c3aed' }

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff',
        padding: 24, cursor: 'pointer', transition: 'box-shadow 0.15s',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1a1a2e', lineHeight: 1.3 }}>{hei.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ background: typeColor.bg, color: typeColor.color, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{typeLabel}</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>· {hei.province}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
        📄 {hei.approvedOutputCount ?? 0} research outputs
      </div>

      {keywords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {keywords.slice(0, 4).map((kw, i) => (
            <span key={kw.keyword || kw} style={{ background: tagColors[i % tagColors.length].bg, color: tagColors[i % tagColors.length].color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
              {kw.keyword || kw}
            </span>
          ))}
          {keywords.length > 4 && (
            <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
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
   <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      {/* Nav */}
      {/* Nav */}
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
          <button style={{ border: 'none', background: 'transparent', fontSize: 14, color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', borderBottom: '2px solid #1a1a2e', paddingBottom: 2 }}>HEI Directory</button>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/login')} style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer' }}>Login</button>
          <button onClick={() => navigate('/register')} style={{ border: 'none', background: '#1a1a2e', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Register</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: '#1a3a6b', padding: '48px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/DOST_Building.png)', backgroundSize: 'cover', backgroundPosition: '50% 30%', opacity: 0.25, mixBlendMode: 'luminosity' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 40, 90, 0.72)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: '#fff', fontFamily: 'Georgia, serif' }}>
            Higher Institutional Education
          </h1>
          <p style={{ margin: '8px auto 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            from Region VII HEIs
          </p>
          <p style={{ margin: '12px auto 0', maxWidth: 640, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Search through thousands of research papers, projects, and innovations from Higher Education Institutions across Central Visayas.
            Discover groundbreaking work in science, technology, and social development.
          </p>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8, maxWidth: 700, margin: '24px auto 0' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: '10px 18px' }}>
              <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search institutions by name or province..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff' }}
              />
            </div>
            <button
              style={{ background: '#1a6e3c', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px', flex: 1 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '64px 0' }}>Loading institutions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '64px 0' }}>No institutions found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
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