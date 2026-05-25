import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import DashboardLayout from './DashboardLayout'
import apiClient from '../../services/apiClient'
import { dostNavItems } from './PendingSubmissionsPage'

const cardClass = 'rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'

function getCompletionColor(rate) {
  if (rate >= 85) return 'bg-emerald-500'
  if (rate >= 70) return 'bg-amber-400'
  return 'bg-red-500'
}

function getStatusBadge(rate) {
  if (rate >= 85) return { label: 'On Target', class: 'bg-emerald-100 text-emerald-700' }
  if (rate >= 70) return { label: 'Monitor', class: 'bg-amber-100 text-amber-700' }
  return { label: 'Needs Action', class: 'bg-red-100 text-red-700' }
}

function getErrorFreqBadge(errors) {
  if (errors <= 2) return { label: 'LOW', class: 'text-emerald-600' }
  if (errors <= 4) return { label: 'MID', class: 'text-amber-600' }
  return { label: 'HIGH', class: 'text-red-600' }
}

export default function DataQualityDashboard() {
  const [metrics, setMetrics] = useState([])
  const [overlaps, setOverlaps] = useState([])
  const [selectedInstitution, setSelectedInstitution] = useState(null)
  const [drilldown, setDrilldown] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('validation')

useEffect(() => {
  if (location.pathname.includes('overlap')) {
    setActiveTab('overlaps')
  } else {
    setActiveTab('validation')
  }
}, [location.pathname])
  const [loading, setLoading] = useState(true)
  const [overlapsLoading, setOverlapsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    apiClient.get('/quality/metrics', { signal: controller.signal })
      .then(res => setMetrics(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))

    apiClient.get('/quality/overlaps', { signal: controller.signal })
      .then(res => setOverlaps(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setOverlapsLoading(false))

    return () => controller.abort()
  }, [])

  const handleRowClick = (inst) => {
    setSelectedInstitution(inst)
    apiClient.get(`/quality/metrics/${inst.institutionId}`)
      .then(res => setDrilldown(res.data))
      .catch(() => setDrilldown(null))
  }

  const aggregatedErrors = metrics.reduce((acc, m) => {
    Object.entries(m.errorFrequency || {}).forEach(([field, count]) => {
      acc[field] = (acc[field] || 0) + count
    })
    return acc
  }, {})

  const sortedErrors = Object.entries(aggregatedErrors)
    .sort((a, b) => b[1] - a[1])

  return (
    <DashboardLayout
      activeLabel="Auto Validation"
      userName="DOST Administrator"
      organization="DOST Region VII"
      navItems={dostNavItems}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DASHBOARD &gt; <span className="text-[#C9A84C]">DATA QUALITY MONITOR</span>
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A1A2E]">Data Quality Monitor</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor HEI Submission Data Quality</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">ACADEMIC YEAR</p>
            <p className="text-sm font-bold text-[#1A1A2E]">2025-2026</p>
            <p className="text-xs text-slate-500">DOST Region VII</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/dost/validation')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'validation'
                ? 'bg-[#1A1A2E] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Auto Validation
          </button>
          <button
            type="button"
            onClick={() => navigate('/dost/overlap-alerts')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'overlaps'
                ? 'bg-[#1A1A2E] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Overlap Alerts
            {overlaps.length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                {overlaps.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'validation' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-[17px] font-semibold text-[#1A1A2E]">Per-HEI Quality Metrics</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">Click a row to drill down into individual error tags</p>

                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['Institution', 'Completeness', 'Submissions', 'Errors', 'Error Freq', 'Status'].map(h => (
                            <th key={h} className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {metrics.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                              No validation data available yet.
                            </td>
                          </tr>
                        ) : metrics.map((m) => {
                          const badge = getStatusBadge(m.completenessRate)
                          const freqBadge = getErrorFreqBadge(m.totalErrors)
                          return (
                            <tr
                              key={m.institutionId}
                              onClick={() => handleRowClick(m)}
                              className="cursor-pointer hover:bg-slate-50 transition"
                            >
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A2E] text-[10px] font-bold text-white">
                                    {(m.institutionName || '').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                  </div>
                                  <span className="text-sm font-medium text-[#1A1A2E]">{m.institutionName}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full ${getCompletionColor(m.completenessRate)}`}
                                      style={{ width: `${m.completenessRate}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-[#1A1A2E]">{m.completenessRate}%</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-sm text-slate-600">{m.totalSubmissions}</td>
                              <td className="py-3 pr-4 text-sm text-slate-600">{m.totalErrors}</td>
                              <td className="py-3 pr-4">
                                <span className={`text-xs font-bold ${freqBadge.class}`}>{freqBadge.label}</span>
                              </td>
                              <td className="py-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.class}`}>
                                  ● {badge.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedInstitution && drilldown && (
                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1A1A2E]">
                        {selectedInstitution.institutionName} — Error Breakdown
                      </h3>
                      <p className="text-xs text-slate-400">Field-level error frequency for selected HEI</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedInstitution(null); setDrilldown(null) }}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Error Breakdown by Field
                      </p>
                      {Object.entries(drilldown.errorFrequency || {}).length === 0 ? (
                        <p className="text-xs text-slate-400">No errors recorded.</p>
                      ) : Object.entries(drilldown.errorFrequency).map(([field, count]) => {
                        const total = Object.values(drilldown.errorFrequency).reduce((a, b) => a + b, 0)
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0
                        return (
                          <div key={field} className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 capitalize">{field}</span>
                              <span className="font-semibold text-red-500">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Quick Insights
                      </p>
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
                        ⚠ Completeness rate: {drilldown.completenessRate}% — Target ≥ 85%
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
                        ✓ {drilldown.passedValidations} record(s) passed validation.
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-3">
                        Correction History
                      </p>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Total Submissions</span>
                          <span className="font-semibold">{drilldown.totalSubmissions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failed Validations</span>
                          <span className="font-semibold text-red-500">{drilldown.failedValidations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Passed Validations</span>
                          <span className="font-semibold text-emerald-600">{drilldown.passedValidations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className={cardClass}>
                <h3 className="text-[15px] font-semibold text-[#1A1A2E] mb-1">Region Insights</h3>
                <p className="text-xs text-slate-400 mb-4">Auto-generated quality flags</p>
                {sortedErrors.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    No quality issues detected.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedErrors.slice(0, 3).map(([field, count]) => (
                      <div key={field} className="flex items-start gap-2 text-xs text-slate-600">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                        <span className="capitalize">{field} is the most frequently flagged error — accounts for {count} occurrences</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <h3 className="text-[15px] font-semibold text-[#1A1A2E] mb-1">Most Common Errors</h3>
                <p className="text-xs text-slate-400 mb-4">Region-wide aggregated</p>
                {sortedErrors.length === 0 ? (
                  <p className="text-xs text-slate-400">No error data available.</p>
                ) : sortedErrors.slice(0, 7).map(([field, count]) => (
                  <div key={field} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-slate-600">{field}</span>
                      <span className="font-bold text-red-500">{count}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${Math.min(100, (count / (sortedErrors[0]?.[1] || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

          {activeTab === 'overlaps' && (
          <div className="space-y-4">
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <h2 className="text-[15px] font-bold text-[#1A1A2E]">Overlap Notification Log</h2>
                    <p className="text-xs text-slate-500">Recorded entries where overlap was detected — click a card to see full details</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-600">{overlaps.length} flagged</span>
                  <span className="flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1 text-xs font-bold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    Active
                  </span>
                </div>
              </div>

              {overlapsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : overlaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No overlaps detected</p>
                  <p className="text-xs text-slate-400 mt-1">All approved research outputs are sufficiently distinct.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overlaps.map((alert) => {
                    const score = (alert.similarityScore * 100).toFixed(1)
                    const isCritical = alert.similarityScore >= 0.90
                    return (
                      <div
                        key={alert.id}
                        className="rounded-[12px] border-2 overflow-hidden bg-white"
                        style={{ borderColor: isCritical ? '#EF4444' : '#F59E0B' }}
                      >
                        <div className="flex items-start justify-between px-5 pt-5 pb-3">
                          <div className="flex-1 pr-4">
                            <h3 className="text-[15px] font-bold text-[#1A1A2E] leading-snug mb-1">
                              {alert.newRecordTitle}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] text-slate-400">{alert.newRecordHei}</span>
                              {alert.detectedAt && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] text-slate-400">
                                    Detected {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(alert.detectedAt))}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-[11px] text-slate-400">
                              <span>Submitting HEI: {alert.newRecordHei}</span>
                              {alert.notificationSent && (
                                <span className="text-emerald-600">✓ Notification sent</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                              ● {isCritical ? 'Flagged' : 'Monitor'}
                            </span>
                            <span className={`text-3xl font-bold ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                              {score}%
                            </span>
                          </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Similar Record Found
                          </p>
                          <div className="rounded-lg bg-white border border-slate-200 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A2E] text-[10px] font-bold text-white shrink-0">
                                {(alert.existingRecordHei || '').split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 3) || (alert.existingRecordHei || '').split(' ').map(w => w[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#1A1A2E]">{alert.existingRecordTitle}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{alert.existingRecordHei}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-bold shrink-0 ml-4 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                              {score}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}