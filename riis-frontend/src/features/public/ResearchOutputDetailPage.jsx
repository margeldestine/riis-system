import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Copy, FileText } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useParams, useNavigate, useLocation } from 'react-router-dom'


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

export default function ResearchOutputDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const similarityScore = location.state?.similarityScore ?? null

  const [record, setRecord] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')

    Promise.all([
      apiClient.get(`/search/${id}`),
      apiClient.get(`/search/related/${id}`).catch(() => ({ data: [] })),
    ])
      .then(([recordRes, relatedRes]) => {
        setRecord(recordRes.data)
        setRelated(Array.isArray(relatedRes.data) ? relatedRes.data : [])
      })
      .catch((err) => setError(extractApiErrorMessage(err, 'Unable to load research record.')))
      .finally(() => setLoading(false))
  }, [id])

  const handleCopyCitation = () => {
    if (!record) return
    const authors = Array.isArray(record.authors)
      ? record.authors.map(a => a.fullName).filter(Boolean).join(', ')
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
    <div className="min-h-screen bg-[#F4F6F9] font-sans flex flex-col">
      {/* Top nav */}
      <nav className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
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
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-[#1A1A2E] border-b-2 border-[#1A1A2E] pb-0.5"
          >
            Browse Research
          </button>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="text-sm text-slate-500 hover:text-[#1A1A2E]"
          >
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
      </nav>


      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="mx-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : record ? (
        <>
          {/* Hero */}
         {/* Hero */}
          {/* Hero */}
          <div className="relative overflow-hidden" style={{ background: '#1a3a6b' }}>
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
            <div className="relative z-10 px-10 py-8 max-w-5xl">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition mb-5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Research Explorer
              </button>
              <h1
                className="text-3xl leading-snug text-white"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 }}
              >
                {record.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {record.institutionName && (
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-xs text-white/90">
                    {record.institutionName}
                  </span>
                )}
                {record.province && (
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-xs text-white/90">
                    {record.province}
                  </span>
                )}
                {record.subjectDc && (
                  <span className="rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-xs text-white/90">
                    {record.subjectDc}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="mx-auto max-w-5xl px-8 py-8 w-full flex-1">
            <div className="flex gap-6 items-start">
              {/* Left — metadata */}
              <div className="flex-1 space-y-6">
                {/* Record Metadata */}
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

                {/* Abstract */}
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

                {/* Keywords */}
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

              {/* Right sidebar */}
              <div className="w-72 shrink-0 space-y-4">
                {/* Access panel */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Access
                  </p>
                  {record.doi ? (
                    <a
                      href={`https://doi.org/${record.doi}`}
                      target="_blank"
                      rel="noreferrer"
                     className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition" style={{ background: '#1a6e3c' }}
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

                  {/* Relevance */}
                  {similarityScore != null && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="text-center mb-3">
                        <p className="text-3xl font-bold text-[#1A1A2E]">
                          {similarityScore}<span className="text-lg">%</span>
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                          Relevance to Your Search
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${similarityScore}%` }} />
                      </div>
                      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                        This research closely matches your search — based on AI analysis.
                      </p>
                    </div>
                  )}

                {/* Related */}
                {related.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      You Might Also Be Interested In
                    </p>
                    {related.map((r) => (
                      <RelatedCard
                        key={r.id}
                        record={r}
                        onSelect={(newId) => navigate(`/research/${newId}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-8 py-4 flex items-center justify-between text-xs text-slate-400">
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