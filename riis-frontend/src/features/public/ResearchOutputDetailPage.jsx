import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Copy, EyeOff, Lock } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import FullTextAction from './FullTextAction'
import PublicFooter from './PublicFooter'
import VisibilityBadge from './VisibilityBadge'
import { isAbstractWithheld, safeExternalUrl } from './accessTiers'


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
    // Hidden fields come back empty, so build the citation from whatever is actually shown.
    const parts = [
      authors,
      record.completionYear ? `(${record.completionYear})` : '',
      record.title ? `${record.title}.` : '',
      record.publicationVenue || record.institutionName ? `${record.publicationVenue || record.institutionName}.` : '',
      record.doi ? `https://doi.org/${record.doi}` : '',
    ]
    const citation = parts.filter(Boolean).join(' ')
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const keywords = Array.isArray(record?.keywords) ? record.keywords : []
  const authors = Array.isArray(record?.authors) ? record.authors : []
  const principalInvestigator = authors[0]?.fullName || '—'
  const abstractWithheld = isAbstractWithheld(record)
  // RESTRICTED records come back with only the title and institution (owners/admins get everything).
  const metadataWithheld =
    record?.visibility === 'RESTRICTED' &&
    authors.length === 0 &&
    !record.researchType &&
    !record.doi &&
    !record.completionYear
  const doiUrl = record?.doi ? safeExternalUrl(`https://doi.org/${record.doi}`) : null
  const academicYearLabel = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans flex flex-col">
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
        <div className="relative z-10 px-10 py-8 w-full">
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
            style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
          >
            {record?.title || 'Research Output Details'}
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
            <VisibilityBadge visibility={record?.visibility} />
          </div>
        </div>
      </div>


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
          {/* Main content */}
          <div className="mx-auto w-full max-w-6xl px-6 py-8 flex-1">
            <div className="flex gap-6 items-start">
              {/* Left — metadata */}
              <div className="flex-1 space-y-6">
                {/* Record Metadata */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-5">
                    Record Metadata
                  </p>

                  {metadataWithheld ? (
                    <p className="mb-5 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {record.institutionName || 'The owning institution'} has restricted this record. Only the title
                        and institution are shown publicly. Use{' '}
                        <strong className="font-semibold text-slate-600">Request full text</strong> to contact its
                        research office.
                      </span>
                    </p>
                  ) : null}

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
                      {record.doi && doiUrl ? (
                        <a
                          href={doiUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {record.doi}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : record.doi ? (
                        <p className="text-sm text-slate-600">{record.doi}</p>
                      ) : <p className="text-sm text-slate-400">—</p>}
                    </MetaField>

                    <MetaField label="Completion Year" value={record.completionYear} />
                    <MetaField label="Publisher" value={record.publisherDc || record.publicationVenue} />
                    {record.researchType ? (
                      <MetaField label="Research Type">
                        <TypeBadge type={record.researchType} />
                      </MetaField>
                    ) : null}

                    <MetaField label="DC Coverage" value={record.coverageDc} />
                    {authors.length > 0 ? (
                      <MetaField label="Principal Investigator" value={principalInvestigator} />
                    ) : null}
                    <MetaField label="Has License" value={record.rightsDc} />

                    {record.subjectDc && (
                      <MetaField label="S&T Cluster" value={record.subjectDc} />
                    )}
                  </div>
                </div>

                {/* Abstract */}
                {record.abstractText || record.abstractExcerpt ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Abstract
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {record.abstractText || record.abstractExcerpt}
                    </p>
                  </div>
                ) : abstractWithheld && !metadataWithheld ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <EyeOff className="h-3.5 w-3.5" /> Abstract
                    </p>
                    <p className="text-sm text-slate-500">
                      {record.institutionName || 'The owning institution'} shares only the descriptive details of this
                      record publicly. Use the full-text options to get in touch.
                    </p>
                  </div>
                ) : null}

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
                {/* Full text access panel */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Full text
                  </p>

                  <FullTextAction record={record} variant="panel" />

                  <p className="text-xs text-slate-400 leading-relaxed">
                    DASIG organizes Region VII research and does not host the full text. The owning institution decides
                    whether to share it.{' '}
                    <Link to="/access-policy" className="text-blue-600 hover:underline">
                      Read the access policy
                    </Link>
                  </p>

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

      <PublicFooter className="mt-auto" />
    </div>
  )
}
