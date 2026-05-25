import { useState, useEffect } from 'react'
import { FileText, Download, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../admin/DashboardLayout'
import { heiNavItems } from './HeiDashboard'
import apiClient from '../../services/apiClient'

const RESEARCH_TYPES = ['Journal Article', 'Conference Paper', 'Funded Project', 'Innovation Output', 'IP Registration']
const YEARS = Array.from({ length: 10 }, (_, i) => 2026 - i)

export default function HeiReportsPage() {
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [fundingSource, setFundingSource] = useState('')
  const [outputFormat, setOutputFormat] = useState('CSV')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(true)

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  const academicYearLabel = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`

  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true)
      try {
        const res = await apiClient.get('/submissions', {
        params: { page: 0, size: 20 }
      })
      const data = res.data
      const content = Array.isArray(data) ? data : data?.content || []
      setPreview(content.filter(item => item.status === 'APPROVED').slice(0, 5))
      } catch {
        setPreview([])
      } finally {
        setPreviewLoading(false)
      }
    }
    fetchPreview()
  }, [])

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleGenerate = async () => {
    setStatus('generating')
    setError('')
    setResult(null)

    try {
      const res = await apiClient.post('/reports/generate', {
        yearFrom: yearFrom ? parseInt(yearFrom) : null,
        yearTo: yearTo ? parseInt(yearTo) : null,
        researchTypes: selectedTypes.length > 0 ? selectedTypes : null,
        fundingSources: fundingSource ? [fundingSource] : null,
        outputFormat,
      })

      if (res.status === 200) {
        setResult(res.data)
        setStatus('complete')
      } else if (res.status === 202) {
        setStatus('polling')
        pollStatus(res.data.jobId)
      }
    } catch (err) {
      setError('Failed to generate report. Please try again.')
      setStatus('idle')
    }
  }

  const pollStatus = async (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/reports/${id}/status`)
        if (res.data.status === 'COMPLETE') {
          clearInterval(interval)
          setResult(res.data)
          setStatus('complete')
        } else if (res.data.status === 'FAILED') {
          clearInterval(interval)
          setError('Report generation failed. Please try again.')
          setStatus('idle')
        }
      } catch {
        clearInterval(interval)
        setError('Unable to check report status.')
        setStatus('idle')
      }
    }, 3000)
  }

  const handleReset = () => {
    setYearFrom('')
    setYearTo('')
    setSelectedTypes([])
    setFundingSource('')
    setOutputFormat('CSV')
    setStatus('idle')
    setResult(null)
    setError('')
  }

  return (
    <DashboardLayout
      activeLabel="Reports"
      userName="HEI Research User"
      organization={institutionName}
      navItems={heiNavItems}
    >
      <div className="space-y-6">
        <div className="-mx-[32px] -mt-[32px] w-[calc(100%+64px)]">
          <div className="relative overflow-hidden bg-[#f8fafc] px-8 py-8">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'url(/DOST_Building.png)',
                backgroundSize: 'cover',
                backgroundPosition: '78% 32%',
                opacity: 0.18,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'rgba(13, 31, 60, 0.08)' }}
            />
            <div className="relative z-10 flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">
                  DASHBOARD &gt; <span className="text-[#c9a84c]">REPORTS</span>
                </p>
                <h1
                  className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                  style={{ fontFamily: "'Libre Baskerville', serif" }}
                >
                  Reports
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Export your institution's research outputs in your preferred format
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#94a3b8]">ACADEMIC YEAR</p>
                <p className="text-[13px] font-bold text-[#0d1f3c]">{academicYearLabel}</p>
                <p className="mt-1 text-[12px] text-[#6b7280]">{institutionName}</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        {/* Banner */}
        <div className="rounded-xl p-6 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, #1a6e3c 0%, #2d9e5f 100%)' }}>
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Generate Custom Reports</h2>
            <p className="text-sm text-white/80">Export research data in your preferred format with advanced filtering</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[1fr,320px] gap-6 items-start">
          {/* Left */}
          <div className="space-y-5">
            {/* Configure */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1A2E]">Configure Your Report</h3>
                  <p className="text-xs text-slate-400">Select filters and parameters</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Year From</p>
                  <select
                    value={yearFrom}
                    onChange={e => setYearFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  >
                    <option value=""></option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Year To</p>
                  <select
                    value={yearTo}
                    onChange={e => setYearTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  >
                    <option value=""></option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Research Type (Multi-Select)
                </p>
                <div className="flex flex-wrap gap-2">
                  {RESEARCH_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition border ${
                        selectedTypes.includes(type)
                          ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Funding Source
                </p>
                <select
                  value={fundingSource}
                  onChange={e => setFundingSource(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-600 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                >
                  <option value=""></option>
                  {['DOST-PCAARRD', 'DOST-PCIEERD', 'DOST-CHED', 'Self-Funded', 'Other'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Output Format */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Download className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1A2E]">Choose Output Format</h3>
                  <p className="text-xs text-slate-400">Select how you want to export your data</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['PDF', 'CSV'].map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setOutputFormat(fmt)}
                    className={`rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition ${
                      outputFormat === fmt
                        ? 'border-[#1A1A2E] bg-[#1A1A2E]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      outputFormat === fmt ? 'bg-[#1A1A2E]' : 'bg-slate-100'
                    }`}>
                      <FileText className={`h-6 w-6 ${outputFormat === fmt ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-sm font-semibold ${outputFormat === fmt ? 'text-[#1A1A2E]' : 'text-slate-500'}`}>
                      {fmt === 'PDF' ? 'PDF Report' : 'CSV Export'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Data Preview */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#1A1A2E] px-6 py-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Data Preview — First 5 Records</h3>
                  <p className="text-xs text-slate-400">Full export will include all matching records</p>
                </div>
              </div>

              {previewLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : preview.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                  No approved records found.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Report Title</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Year</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Funding</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 text-sm font-medium text-[#1A1A2E] max-w-xs">
                          <p className="line-clamp-2">{item.title || '—'}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            {item.researchType || 'Research'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{item.completionYear || '—'}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{item.fundingSource || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Config summary */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-amber-200 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-700" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1A2E]">Report Configuration Summary</h3>
              </div>
              <div className="space-y-2 text-xs">
                <p><span className="text-amber-600 font-semibold">● Scope:</span> <span className="text-slate-600">{institutionName}</span></p>
                <p><span className="text-amber-600 font-semibold">● Year Range:</span> <span className="text-slate-600">{yearFrom || '—'} – {yearTo || '—'}</span></p>
                <p><span className="text-amber-600 font-semibold">● Types:</span> <span className="text-slate-600">{selectedTypes.length > 0 ? selectedTypes.join(', ') : 'All'}</span></p>
                <p><span className="text-amber-600 font-semibold">● Format:</span> <span className="text-slate-600">{outputFormat}</span></p>
                <p><span className="text-amber-600 font-semibold">● Funding:</span> <span className="text-slate-600">{fundingSource || 'All'}</span></p>
              </div>
            </div>

            {/* Progress / Complete */}
            {(status === 'generating' || status === 'polling') ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mx-auto" />
                <p className="text-sm font-semibold text-[#1A1A2E]">Generating Report...</p>
                <p className="text-xs text-slate-400">
                  {status === 'polling' ? 'Processing large dataset. Please wait...' : 'Building your report...'}
                </p>
              </div>
            ) : (status === 'complete' && result) ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-700">Download Ready</p>
                </div>
                <p className="text-xs text-slate-500">
                  {result.recordCount} records exported successfully.
                </p>
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  <Download className="h-4 w-4" />
                  Download {outputFormat} Report
                </a>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={status === 'generating' || status === 'polling'}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1A1A2E] py-3 text-sm font-semibold text-white hover:bg-[#11111f] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Download className="h-4 w-4" />
                Download All Reports
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                <RefreshCw className="h-4 w-" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
