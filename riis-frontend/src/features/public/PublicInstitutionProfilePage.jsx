import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

function getTypeBadge(type) {
  if (!type) return { bg: '#f1f5f9', color: '#475569' }
  const val = type.toUpperCase()
  if (val.includes('SUC') || val.includes('STATE')) return { bg: '#dbeafe', color: '#1d4ed8' }
  if (val.includes('PRIVATE')) return { bg: '#ede9fe', color: '#7c3aed' }
  return { bg: '#f1f5f9', color: '#475569' }
}

function OutputCard({ output, navigate }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', padding: '20px 24px', borderLeft: '4px solid #10b981', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          {output.doi ? (
            <a href={`https://doi.org/${output.doi}`} target="_blank" rel="noreferrer"
              style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 15, lineHeight: 1.4, textDecoration: 'none' }}>
              {output.title}
            </a>
          ) : (
            <p style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 15, lineHeight: 1.4, margin: 0 }}>{output.title}</p>
          )}

          {output.authors?.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: '#64748b' }}>
              {output.authors.map((a, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {a.fullName}
                  {a.orcidId && (
                    <a href={`https://orcid.org/${a.orcidId}`} target="_blank" rel="noreferrer"
                      style={{ color: '#a6ce39', fontWeight: 700, fontSize: 11 }}>iD</a>
                  )}
                  {i < output.authors.length - 1 && <span style={{ color: '#cbd5e1' }}>·</span>}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: '#94a3b8' }}>
            {output.researchType && <span>📄 {output.researchType}</span>}
            {output.completionYear && <span>🕐 {output.completionYear}</span>}
            {output.fundingSource && <span>🏛 {output.fundingSource}</span>}
          </div>

          {output.abstractExcerpt && (
            <p style={{ marginTop: 8, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{output.abstractExcerpt}</p>
          )}
        </div>
        <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          ✓ Approved
        </span>
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => navigate(`/research/${output.id}`)}
          style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
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
    <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>🏫 Other Region VII HEIs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {others.map(hei => (
          <button key={hei.id} onClick={() => navigate(`/institutions/${hei.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: getAvatarColor(hei.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(hei.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hei.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{hei.approvedOutputCount ?? 0} outputs · {hei.province}</p>
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

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setStatus('loading')
    apiClient.get(`/institutions/${id}/profile`, {
      params: { page, size: 10 },
      signal: controller.signal,
    })
      .then(res => { setProfile(res.data); setStatus('success') })
      .catch(err => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [id, page])

  const outputs = profile?.outputs?.content || []
  const totalPages = profile?.outputs?.totalPages || 1
  const typeBadge = getTypeBadge(profile?.type)
  const avatarColor = getAvatarColor(profile?.name)

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

      {status === 'loading' && (
        <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>Loading profile...</div>
      )}
      {status === 'error' && (
        <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', color: '#dc2626' }}>Unable to load institution profile.</div>
      )}

       {status === 'success' && profile && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px', flex: 1 }}>
          {/* Header card */}
          <div style={{ borderRadius: 16, background: '#1a1a2e', padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
              {getInitials(profile.name)}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff' }}>{profile.name}</h1>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: typeBadge.bg, color: typeBadge.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{profile.type}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>· {profile.province}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>· DOST Region VII</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>★ Public Access</span>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>🗓 2016–2025</span>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { value: profile.stats?.totalApprovedOutputs ?? 0, label: 'Total Outputs' },
              { value: profile.stats?.totalApprovedOutputs ?? 0, label: 'Approved' },
              { value: Object.entries(profile.stats?.researchTypeDistribution || {}).find(([k]) => k.toLowerCase().includes('funded'))?.[1] ?? 0, label: 'Funded Projects' },
              { value: profile.stats?.totalUniqueAuthors ?? 0, label: 'Unique Authors' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1a1a2e' }}>{s.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
            {/* Left column */}
            <div>
              {/* Research Profile */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>📊 Research Profile</h2>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8' }}>Research areas and specializations, ranked by recent impact over last 12 months</p>

                {profile.themeKeywords?.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {profile.themeKeywords.map((tag, i) => {
                        const colors = ['#d1fae5 #065f46', '#dbeafe #1d4ed8', '#fef9c3 #a16207', '#ede9fe #7c3aed', '#fce7f3 #be185d', '#ccfbf1 #0f766e']
                        const [bg, color] = colors[i % colors.length].split(' ')
                        return (
                          <span key={tag.keyword} style={{ background: bg, color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>{tag.keyword}</span>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Top Research Areas by Research Impact</p>
                    {profile.themeKeywords.slice(0, 6).map(tag => (
                      <div key={tag.keyword} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <span style={{ width: 160, fontSize: 12, color: '#475569', flexShrink: 0 }}>{tag.keyword}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: '#10b981', width: `${Math.min(100, tag.weight * 10)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', width: 36, textAlign: 'right' }}>{(tag.weight * 10).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Research niche profile will appear here once AI analysis is complete.</p>
                  </div>
                )}
              </div>

              {/* Research Outputs */}
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>📄 Research Outputs</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Publications from this institution on record</p>
                </div>
                <input placeholder="Filter research..." style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12, outline: 'none', width: 160 }} />
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Showing {outputs.length} of {profile.stats?.totalApprovedOutputs ?? 0} approved results
              </p>

              {outputs.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 14 }}>No approved outputs yet.</p>
              ) : outputs.map(o => <OutputCard key={o.id} output={o} navigate={navigate} />)}

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
                  Previous
                </button>
                <p style={{ fontSize: 13, color: '#64748b' }}>Page {page + 1} of {totalPages}</p>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
                  Next
                </button>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filter Outputs */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>▼ Filter Outputs</h3>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Research Type</p>
                  {['Funded Project', 'Journal Article', 'Conference Paper', 'Innovation Output', 'IP Registration'].map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ accentColor: '#1a1a2e' }} />
                      {t}
                    </label>
                  ))}
                  <p style={{ margin: '12px 0 8px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Year Range</p>
                  <input type="range" min="2015" max="2025" style={{ width: '100%', accentColor: '#c9a84c' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    <span>2015</span><span>2025</span>
                  </div>
                  <p style={{ margin: '12px 0 8px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>S&T Cluster</p>
                  {['Climate & Environment', 'Health & Medical', 'Agriculture & Food', 'Education & Social', 'Tech, Engr & Innovation'].map(c => (
                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ accentColor: '#1a1a2e' }} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              {/* Institution Details */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>🏛 Institution Details</h3>
                <div style={{ fontSize: 14, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profile.type && <p style={{ margin: 0 }}><span style={{ color: '#94a3b8' }}>Type: </span><strong style={{ color: '#1a1a2e' }}>{profile.type}</strong></p>}
                  {profile.province && <p style={{ margin: 0 }}><span style={{ color: '#94a3b8' }}>Province: </span><strong style={{ color: '#1a1a2e' }}>{profile.province}</strong></p>}
                  {profile.stats?.totalApprovedOutputs !== undefined && (
                    <p style={{ margin: 0 }}><span style={{ color: '#94a3b8' }}>Basic Research: </span><strong style={{ color: '#1a1a2e' }}>{profile.stats.researchTypeDistribution?.['Journal Article'] ?? 0}</strong></p>
                  )}
                  {profile.stats?.researchTypeDistribution && (
                    <p style={{ margin: 0 }}><span style={{ color: '#94a3b8' }}>Applied Research: </span><strong style={{ color: '#1a1a2e' }}>{profile.stats.researchTypeDistribution?.['Funded Project'] ?? 0}</strong></p>
                  )}
                </div>
                <button style={{ marginTop: 16, width: '100%', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  📋 Export Report
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