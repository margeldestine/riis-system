import { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Flame,
  Loader2,
  MapPinned,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import apiClient from '../../services/apiClient'

const cardClass =
  'rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'

const heiColors = [
  '#123B72', '#2563EB', '#7C3AED', '#F59E0B', '#EF4444', '#10B981',
]

function FilterField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="min-w-[176px]">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
        {label}
      </p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-[8px] border border-[#D1D5DB] bg-white px-3 py-2 pr-8 text-sm text-[#374151]"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
      </div>
    </div>
  )
}

// DAS-038: Year-From / Year-To range control, styled to match FilterField.
function YearRangeField({ label, from, to, onFromChange, onToChange, options }) {
  return (
    <div className="min-w-[176px]">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <select
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="h-10 w-full appearance-none rounded-[8px] border border-[#D1D5DB] bg-white px-2 py-2 pr-6 text-sm text-[#374151]"
          >
            <option value="">From</option>
            {options.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
        </div>
        <span className="text-xs text-[#9CA3AF]">to</span>
        <div className="relative flex-1">
          <select
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="h-10 w-full appearance-none rounded-[8px] border border-[#D1D5DB] bg-white px-2 py-2 pr-6 text-sm text-[#374151]"
          >
            <option value="">To</option>
            {options.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
        </div>
      </div>
    </div>
  )
}

// Same list used on the HEI-side submission form (SubmissionPortal.jsx),
// duplicated here so the Type filter's options match what admins actually see.
const RESEARCH_TYPES = [
  'Funded Project',
  'Journal Article',
  'Conference Paper',
  'Innovation Output',
  'Community Extension Research',
]

function LoadingCard() {
  return (
    <div className={`${cardClass} flex items-center justify-center min-h-[120px]`}>
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  )
}

// ---- Institution initials helper -----------------------------------------
const SKIP_WORDS = new Set([
  'of', 'the', 'and', 'for', 'in', 'on', 'at', 'a', 'an', 'de', 'del',
])

function getInstitutionInitials(name, maxLength = 2) {
  if (!name) return ''
  const words = name
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && /[a-zA-Z0-9]/.test(w))
    .filter((w) => !SKIP_WORDS.has(w.toLowerCase()))

  return words
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength)
}

const CLUSTER_LABEL_OVERRIDES = {
  'Climate and Environment Research': 'Climate & Env',
  'Health and Medical Research': 'Health & Medical',
  'Agriculture and Food Security Research': 'Agri & Food',
  'Education and Social Development Research': 'Education & Social',
  'Technology, Engineering, and Innovation Research': 'Tech & Innovation',
}

function getClusterLabel(clusterName) {
  if (CLUSTER_LABEL_OVERRIDES[clusterName]) return CLUSTER_LABEL_OVERRIDES[clusterName]
  return clusterName.length > 20 ? `${clusterName.slice(0, 18)}…` : clusterName
}

// ---- Export helpers -------------------------------------------------------

function exportCSV({ summary, trendData, typeDistribution, heiComparison, provinceSummary, heatmapData, clusterHeatmap }) {
  const sections = []
  const row = (cols) => cols.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')

  // Summary
  sections.push('SUMMARY')
  sections.push(row(['Metric', 'Value']))
  sections.push(row(['Total Approved Outputs', summary?.totalApprovedOutputs ?? 0]))
  sections.push(row(['Registered HEIs', summary?.totalRegisteredHeis ?? 0]))
  sections.push(row(['Completeness Rate (%)', summary?.completenessRate ?? 0]))
  sections.push(row(['Incomplete Rate (%)', summary?.incompleteRate ?? 0]))
  sections.push('')

  // Research Outputs by Year
  if (trendData.length > 0) {
    sections.push('RESEARCH OUTPUTS BY YEAR & DISCIPLINE')
    const types = Object.keys(trendData[0]).filter(k => k !== 'year')
    sections.push(row(['Year', ...types]))
    trendData.forEach(d => sections.push(row([d.year, ...types.map(t => d[t] ?? 0)])))
    sections.push('')
  }

  // Type Distribution
  if (typeDistribution.length > 0) {
    sections.push('RESEARCH TYPE DISTRIBUTION')
    sections.push(row(['Type', 'Count']))
    typeDistribution.forEach(d => sections.push(row([d.name, d.value])))
    sections.push('')
  }

  // HEI Comparison
  if (heiComparison.length > 0) {
    sections.push('HEI SUBMISSION OVERVIEW')
    sections.push(row(['Rank', 'Institution', 'Approved Outputs', 'Progress (%)']))
    heiComparison
      .filter(item => item.count > 0)
      .forEach((item, i) => sections.push(row([i + 1, item.name, item.count, item.progress])))
    sections.push('')
  }

  // Province Summary
  if (provinceSummary.length > 0) {
    sections.push('PROVINCE-LEVEL SUMMARY')
    sections.push(row(['Province', 'Approved Outputs']))
    provinceSummary
      .filter(item => !['Negros Oriental', 'Siquijor'].includes(item.name))
      .forEach(item => sections.push(row([item.name, item.value])))
    sections.push('')
  }

  // Cluster Heatmap
  if (clusterHeatmap.clusters?.length > 0 && clusterHeatmap.cells?.length > 0) {
    sections.push('RESEARCH CONCENTRATION BY CLUSTER')
    const clusterNames = clusterHeatmap.clusters.map(c => c.clusterName)
    sections.push(row(['Institution', ...clusterNames]))
    const heiIds = [...new Set(clusterHeatmap.cells.map(c => c.institutionId))]
    heiIds.forEach(heiId => {
      const hei = heiComparison.find(h => h.institutionId === heiId)
      const counts = clusterHeatmap.clusters.map(cl => {
        const cell = clusterHeatmap.cells.find(c => c.institutionId === heiId && c.clusterId === cl.clusterId)
        return cell?.count ?? 0
      })
      sections.push(row([hei?.name ?? heiId, ...counts]))
    })
    sections.push('')
  }

  // Research Themes
  if (heatmapData.length > 0) {
    sections.push('REGIONAL RESEARCH THEMES')
    sections.push(row(['Theme', 'Count', 'Institution']))
    heatmapData.forEach(d => sections.push(row([d.theme, d.count, d.institutionId])))
    sections.push('')
  }

  const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `DOST_Region7_Analytics_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF({ summary, trendData, typeDistribution, heiComparison, provinceSummary, heatmapData, clusterHeatmap }) {
  const date = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  const tableStyle = `border-collapse:collapse;width:100%;margin-bottom:16px;font-size:12px;`
  const thStyle = `background:#1A1A2E;color:#fff;padding:8px 10px;text-align:left;`
  const tdStyle = `padding:7px 10px;border-bottom:1px solid #E5E7EB;`
  const tdAltStyle = `padding:7px 10px;border-bottom:1px solid #E5E7EB;background:#F9FAFB;`

  const table = (headers, rows) => `
    <table style="${tableStyle}">
      <thead><tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, ri) => `<tr>${row.map(cell => `<td style="${ri % 2 === 0 ? tdStyle : tdAltStyle}">${cell ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`

  const section = (title, content) => `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:14px;font-weight:700;color:#1A1A2E;border-left:4px solid #C9A84C;padding-left:10px;margin-bottom:12px;">${title}</h2>
      ${content}
    </div>`

  // Summary section
  const summaryHTML = section('Summary', table(
    ['Metric', 'Value'],
    [
      ['Total Approved Outputs', summary?.totalApprovedOutputs ?? 0],
      ['Registered HEIs', summary?.totalRegisteredHeis ?? 0],
      ['Completeness Rate', `${summary?.completenessRate ?? 0}%`],
      ['Incomplete Rate', `${summary?.incompleteRate ?? 0}%`],
    ]
  ))

  // Trend section
  const trendTypes = trendData.length > 0 ? Object.keys(trendData[0]).filter(k => k !== 'year') : []
  const trendHTML = trendData.length > 0 ? section('Research Outputs by Year & Discipline', table(
    ['Year', ...trendTypes],
    trendData.map(d => [d.year, ...trendTypes.map(t => d[t] ?? 0)])
  )) : ''

  // Type distribution
  const typeHTML = typeDistribution.length > 0 ? section('Research Type Distribution', table(
    ['Type', 'Count'],
    typeDistribution.map(d => [d.name, d.value])
  )) : ''

  // HEI comparison
  const heiFiltered = heiComparison.filter(item => item.count > 0)
  const heiHTML = heiFiltered.length > 0 ? section('HEI Submission Overview', table(
    ['Rank', 'Institution', 'Approved Outputs', 'Progress (%)'],
    heiFiltered.map((item, i) => [i + 1, item.name, item.count, item.progress])
  )) : ''

  // Province summary
  const provFiltered = provinceSummary.filter(item => !['Negros Oriental', 'Siquijor'].includes(item.name))
  const provHTML = provFiltered.length > 0 ? section('Province-Level Summary', table(
    ['Province', 'Approved Outputs'],
    provFiltered.map(item => [item.name, item.value])
  )) : ''

  // Cluster heatmap
  let clusterHTML = ''
  if (clusterHeatmap.clusters?.length > 0 && clusterHeatmap.cells?.length > 0) {
    const clusterNames = clusterHeatmap.clusters.map(c => c.clusterName)
    const heiIds = [...new Set(clusterHeatmap.cells.map(c => c.institutionId))]
    const clusterRows = heiIds.map(heiId => {
      const hei = heiComparison.find(h => h.institutionId === heiId)
      const counts = clusterHeatmap.clusters.map(cl => {
        const cell = clusterHeatmap.cells.find(c => c.institutionId === heiId && c.clusterId === cl.clusterId)
        return cell?.count ?? 0
      })
      return [hei?.name ?? heiId, ...counts]
    })
    clusterHTML = section('Research Concentration by S&T Priority Cluster', table(
      ['Institution', ...clusterNames],
      clusterRows
    ))
  }

  // Research themes
  const topThemes = [...new Map(heatmapData.map(d => [d.theme, d.count])).entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
  const themesHTML = topThemes.length > 0 ? section('Top Regional Research Themes', table(
    ['Theme', 'Frequency'],
    topThemes.map(([theme, count]) => [theme, count])
  )) : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>DOST Region VII Analytics Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1A1A2E; padding: 40px; font-size: 13px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:#1A1A2E;color:#fff;padding:24px 28px;border-radius:8px;margin-bottom:28px;">
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;margin-bottom:6px;">
      DOST Region VII · Regional Research Analytics
    </p>
    <h1 style="font-size:22px;font-weight:700;margin-bottom:4px;">Analytics Dashboard Report</h1>
    <p style="font-size:12px;color:#8aafc8;">Academic Year 2025-2026 &nbsp;·&nbsp; Generated ${date}</p>
  </div>

  ${summaryHTML}
  ${trendHTML}
  ${typeHTML}
  ${heiHTML}
  ${provHTML}
  ${clusterHTML}
  ${themesHTML}

  <p style="margin-top:32px;font-size:10px;color:#9CA3AF;text-align:center;border-top:1px solid #E5E7EB;padding-top:12px;">
    © 2026 Department of Science and Technology · DOST Region VII · Confidential
  </p>

  <div class="no-print" style="margin-top:24px;text-align:center;">
    <button onclick="window.print()" style="background:#1A1A2E;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print()
        URL.revokeObjectURL(url)
      }, 500)
    }
  }
}

// ---- D3-powered Thematic Density Heatmap ----------------------------------
function ThematicDensityHeatmap({ institutions, clusters, getCell, maxCellCount }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const margin = { top: 56, right: 16, bottom: 8, left: 200 }
  const cellWidth = 150
  const cellHeight = 56
  const innerWidth = clusters.length * cellWidth
  const innerHeight = institutions.length * cellHeight
  const width = margin.left + innerWidth + margin.right
  const height = margin.top + innerHeight + margin.bottom

  const clusterIds = clusters.map((c) => c.clusterId)

  const xScale = d3.scaleBand().domain(clusterIds).range([0, innerWidth]).paddingInner(0.08)
  const yScale = d3
    .scaleBand()
    .domain(institutions.map((i) => i.institutionId))
    .range([0, innerHeight])
    .paddingInner(0.1)

  const colorScale = d3
    .scaleSequential()
    .domain([0, maxCellCount > 0 ? maxCellCount : 1])
    .interpolator(d3.interpolateRgbBasis(['#EAF7F4', '#A9E2DA', '#6FCBBE', '#34A893', '#0E7A68']))

  function cellFill(count) {
    return count > 0 ? colorScale(count) : '#F3F4F6'
  }
  function cellTextColor(count) {
    if (count <= 0) return '#9CA3AF'
    const intensity = maxCellCount > 0 ? count / maxCellCount : 0
    return intensity > 0.55 ? '#FFFFFF' : '#0B3F39'
  }

  return (
    <div className="relative mt-5 overflow-x-auto">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Research concentration heatmap by institution and S&T priority cluster"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {clusters.map((cluster) => {
            const x = xScale(cluster.clusterId) + xScale.bandwidth() / 2
            return (
              <text key={cluster.clusterId} x={x} y={-16} textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="0.03em" fill="#6B7280">
                {getClusterLabel(cluster.clusterName)}
              </text>
            )
          })}

          {institutions.map((hei, index) => {
            const y = yScale(hei.institutionId) + yScale.bandwidth() / 2
            const abbrev = getInstitutionInitials(hei.name, 4)
            return (
              <g key={`label-${hei.institutionId}`}>
                <rect x={-margin.left + 12} y={y - 11} width={30} height={22} rx={6} fill={heiColors[index % heiColors.length]} />
                <text x={-margin.left + 12 + 15} y={y} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="#FFFFFF">{abbrev}</text>
                <text x={-margin.left + 50} y={y} textAnchor="start" dominantBaseline="central" fontSize="12" fontWeight="600" fill="#1A1A2E">{abbrev}</text>
              </g>
            )
          })}

          {institutions.map((hei) =>
            clusters.map((cluster) => {
              const { count } = getCell(hei.institutionId, cluster.clusterId)
              const x = xScale(cluster.clusterId)
              const y = yScale(hei.institutionId)
              const isHovered = hoveredCell?.institutionId === hei.institutionId && hoveredCell?.clusterId === cluster.clusterId

              return (
                <g
                  key={`${hei.institutionId}-${cluster.clusterId}`}
                  onMouseEnter={() => setHoveredCell({ institutionId: hei.institutionId, clusterId: cluster.clusterId })}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{ cursor: 'default' }}
                >
                  <rect x={x} y={y} width={xScale.bandwidth()} height={yScale.bandwidth()} rx={10} fill={cellFill(count)} stroke={isHovered ? '#0E7A68' : 'none'} strokeWidth={isHovered ? 2 : 0} />
                  <text x={x + xScale.bandwidth() / 2} y={y + yScale.bandwidth() / 2} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="600" fill={cellTextColor(count)}>
                    {count > 0 ? count : '—'}
                  </text>
                </g>
              )
            })
          )}
        </g>
      </svg>

      {hoveredCell && (() => {
        const hei = institutions.find((i) => i.institutionId === hoveredCell.institutionId)
        const cluster = clusters.find((c) => c.clusterId === hoveredCell.clusterId)
        if (!hei || !cluster) return null
        const { count } = getCell(hoveredCell.institutionId, hoveredCell.clusterId)
        const left = margin.left + xScale(hoveredCell.clusterId) + xScale.bandwidth() / 2
        const top = margin.top + yScale(hoveredCell.institutionId)
        return (
          <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] bg-[#1A1A2E] px-3 py-2 text-xs font-medium text-white shadow-lg" style={{ left, top: top - 8 }}>
            <div className="font-semibold">{hei.name}</div>
            <div className="text-white/70">{cluster.clusterName}: {count} output{count === 1 ? '' : 's'}</div>
          </div>
        )
      })()}
    </div>
  )
}

export default function AnalyticsDashboard({
  pendingCount = 0,
  pendingStatus = 'idle',
  onReviewAction,
}) {
  const [summary, setSummary] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [typeDistribution, setTypeDistribution] = useState([])
  const [heiComparison, setHeiComparison] = useState([])
  const [provinceSummary, setProvinceSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [heatmapData, setHeatmapData] = useState([])
  const [clusterHeatmap, setClusterHeatmap] = useState({ clusters: [], cells: [] })
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef(null)

  // DAS-036/037/038: filter state. `pendingFilters` tracks what's currently
  // selected in the dropdowns; `appliedFilters` only updates when "Apply
  // Filters" is clicked, and it's what actually drives the data fetch below.
  const emptyFilters = { yearFrom: '', yearTo: '', province: '', institutionId: '', type: '' }
  const [pendingFilters, setPendingFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)

  // Dropdown option sources: institutions (for HEI + Province options) and
  // year range (for the Year-From/Year-To control) are each fetched once,
  // independent of whatever filters are currently applied, so the dropdowns
  // don't shrink to only the currently-filtered subset.
  const [institutionOptions, setInstitutionOptions] = useState([])
  const [provinceOptions, setProvinceOptions] = useState([])
  const [yearOptions, setYearOptions] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/institutions', { signal: controller.signal })
      .then((res) => {
        const list = res.data || []
        setInstitutionOptions(list.map((i) => ({ value: i.id, label: i.name })))
        setProvinceOptions([...new Set(list.map((i) => i.province).filter(Boolean))].sort())
      })
      .catch((err) => { if (!controller.signal.aborted) console.error('Institutions fetch error:', err) })

    apiClient.get('/analytics/trend', { signal: controller.signal })
      .then((res) => {
        const years = (res.data || []).map((d) => d.year).sort()
        setYearOptions(years)
      })
      .catch((err) => { if (!controller.signal.aborted) console.error('Year options fetch error:', err) })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchAll = async () => {
      setLoading(true)
      try {
        const params = {
          yearFrom: appliedFilters.yearFrom || undefined,
          yearTo: appliedFilters.yearTo || undefined,
          province: appliedFilters.province || undefined,
          institutionId: appliedFilters.institutionId || undefined,
          type: appliedFilters.type || undefined,
        }
        const provinceParams = {
          yearFrom: params.yearFrom,
          yearTo: params.yearTo,
          institutionId: params.institutionId,
          type: params.type,
        }
        // DAS-039-filters: Concentration Heatmap gets Year/Province/HEI, no Type.
        const clusterHeatmapParams = {
          yearFrom: params.yearFrom,
          yearTo: params.yearTo,
          province: params.province,
          institutionId: params.institutionId,
        }
        // DAS-039-filters: Niche Landscape gets Province/HEI only — theme
        // profiles are aggregated per-institution across all time, with no
        // per-output year/type data to filter on.
        const nicheParams = {
          province: params.province,
          institutionId: params.institutionId,
        }
        const [summaryRes, trendRes, typeRes, heiRes, provinceRes, heatmapRes, clusterHeatmapRes] = await Promise.all([
          apiClient.get('/analytics/summary', { params, signal: controller.signal }),
          apiClient.get('/analytics/trend', { params, signal: controller.signal }),
          apiClient.get('/analytics/type-distribution', { params, signal: controller.signal }),
          apiClient.get('/analytics/hei-comparison', { params, signal: controller.signal }),
          apiClient.get('/analytics/province-summary', { params: provinceParams, signal: controller.signal }),
          apiClient.get('/analytics/heatmap', { params: nicheParams, signal: controller.signal }),
          apiClient.get('/analytics/cluster-heatmap', { params: clusterHeatmapParams, signal: controller.signal }),
        ])
        setSummary(summaryRes.data)
        setTrendData(trendRes.data || [])
        setTypeDistribution(typeRes.data || [])
        setHeiComparison(heiRes.data || [])
        setProvinceSummary(provinceRes.data || [])
        setHeatmapData(heatmapRes.data || [])
        setClusterHeatmap(clusterHeatmapRes.data || { clusters: [], cells: [] })
      } catch (err) {
        if (!controller.signal.aborted) console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
    return () => controller.abort()
  }, [appliedFilters])

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exportData = { summary, trendData, typeDistribution, heiComparison, provinceSummary, heatmapData, clusterHeatmap }

  const totalOutputs = summary?.totalApprovedOutputs ?? 0

  // DAS-036/037/038 fix: institutions with zero matching records after the
  // current filters are applied should not render as empty rows/cards.
  // HEI Submission Overview already excluded these (item.count > 0); the
  // Heatmap and Niche Landscape now share that same filtered list instead
  // of each re-deriving it, so all three sections stay in sync.
  const activeHeiComparison = heiComparison.filter((item) => item.count > 0)

  const clusterHeatmapLookup = new Map()
  let maxClusterCellCount = 0
  for (const cell of clusterHeatmap.cells || []) {
    const key = `${cell.institutionId}||${cell.clusterId}`
    clusterHeatmapLookup.set(key, cell.count)
    if (cell.count > maxClusterCellCount) maxClusterCellCount = cell.count
  }
  const clusterColumns = clusterHeatmap.clusters || []

  function getClusterCell(institutionId, clusterId) {
    const count = clusterHeatmapLookup.get(`${institutionId}||${clusterId}`) ?? 0
    return { count }
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]">
        <span className="text-[#9CA3AF]">Dashboard</span>
        <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
        <span className="text-[#C9A84C]">Analytics Dashboard</span>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-[30px] font-bold tracking-tight text-[#1A1A2E]">
            Regional Research Analytics Dashboard
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            DOST Administrator View · Region VII · AY 2025-2026
          </p>
        </div>
        <div className={`${cardClass} min-w-[160px] px-4 py-3 text-right`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">Academic Year</p>
          <p className="mt-1 text-lg font-semibold text-[#1A1A2E]">2025-2026</p>
          <p className="mt-1 text-xs text-[#6B7280]">DOST Region VII</p>
        </div>
      </div>

      {/* Filters */}
      <section className={cardClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <YearRangeField
              label="Year Range"
              from={pendingFilters.yearFrom}
              to={pendingFilters.yearTo}
              onFromChange={(v) => setPendingFilters((f) => ({ ...f, yearFrom: v }))}
              onToChange={(v) => setPendingFilters((f) => ({ ...f, yearTo: v }))}
              options={yearOptions}
            />
            <FilterField
              label="All Provinces"
              placeholder="All Provinces"
              value={pendingFilters.province}
              onChange={(v) => setPendingFilters((f) => ({ ...f, province: v }))}
              options={provinceOptions.map((p) => ({ value: p, label: p }))}
            />
            <FilterField
              label="All HEIs"
              placeholder="All HEIs"
              value={pendingFilters.institutionId}
              onChange={(v) => setPendingFilters((f) => ({ ...f, institutionId: v }))}
              options={institutionOptions}
            />
            <FilterField
              label="All Types"
              placeholder="All Types"
              value={pendingFilters.type}
              onChange={(v) => setPendingFilters((f) => ({ ...f, type: v }))}
              options={RESEARCH_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAppliedFilters(pendingFilters)}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#1A1A2E] px-[20px] py-[10px] text-sm font-semibold text-white transition hover:bg-[#11111f]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Apply Filters
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(prev => !prev)}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#D1D5DB] bg-white px-[20px] py-[10px] text-sm font-semibold text-[#374151] transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export All
                <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-12 z-50 w-44 rounded-[10px] border border-[#E5E7EB] bg-white shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false)
                      exportPDF(exportData)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#1A1A2E] hover:bg-slate-50 transition"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-600">PDF</span>
                    Export as PDF
                  </button>
                  <div className="h-px bg-[#E5E7EB]" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false)
                      exportCSV(exportData)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#1A1A2E] hover:bg-slate-50 transition"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-[10px] font-bold text-emerald-600">CSV</span>
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trend + Donut */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.55fr 0.85fr', gap: '16px' }}>
        <div className="rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">Research Outputs by Year & Discipline</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Approved outputs grouped by research type</p>
          <div className="mt-5 h-[260px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={4} barCategoryGap="40%" style={{ cursor: 'default' }} onMouseLeave={() => {}}>
                  <CartesianGrid vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#ffffff', color: '#1A1A2E' }} labelStyle={{ color: '#1A1A2E' }} itemStyle={{ color: '#1A1A2E' }} />
                  {trendData.length > 0 &&
                    Object.keys(trendData[0]).filter((k) => k !== 'year').map((key, i) => (
                      <Bar key={key} dataKey={key} fill={['#C9A84C', '#5C7EA6', '#8EA4C3', '#60a5fa', '#93c5fd'][i % 5]} radius={[2, 2, 0, 0]} name={key} isAnimationActive={false} activeBar={{ fill: ['#C9A84C', '#5C7EA6', '#8EA4C3', '#60a5fa', '#93c5fd'][i % 5] }} />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {trendData.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-4">
              {Object.keys(trendData[0]).filter((k) => k !== 'year').map((key, i) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ['#C9A84C', '#5C7EA6', '#8EA4C3', '#60a5fa', '#93c5fd'][i % 5] }} />
                  {key}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">Research Type Distribution</h3>
          <p className="mt-1 text-xs text-[#6B7280]">All approved outputs</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[150px,1fr] xl:grid-cols-1 2xl:grid-cols-[150px,1fr]">
            <div className="relative mx-auto flex h-[150px] w-[150px] items-center justify-center">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeDistribution} dataKey="value" innerRadius={44} outerRadius={64} stroke="none">
                        {typeDistribution.map((item) => (<Cell key={item.name} fill={item.color} />))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}`} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#ffffff', color: '#1A1A2E' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute flex flex-col items-center">
                    <span className="text-[36px] font-bold leading-none text-[#1A1A2E]">{totalOutputs}</span>
                    <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">Outputs</span>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              {typeDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-sm text-[#1A1A2E]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold text-[#1A1A2E]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HEI Comparison + Province Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
        <div className={cardClass}>
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">HEI Submission Overview</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Ranked by total approved outputs</p>
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : activeHeiComparison
                .map((item, index) => (
                  <div key={item.institutionId} className="grid grid-cols-[28px,minmax(0,1fr),110px,34px] items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white" style={{ backgroundColor: heiColors[index % heiColors.length] }}>
                      {getInstitutionInitials(item.name, 4)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1A1A2E]">{index + 1}. {item.name}</p>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${item.progress}%` }} />
                    </div>
                    <span className="text-right text-sm font-semibold text-[#1A1A2E]">{item.count}</span>
                  </div>
                ))}
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">Province-Level Summary</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Approved outputs by province</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : provinceSummary
                .filter((item) => !['Negros Oriental', 'Siquijor'].includes(item.name))
                .map((item) => (
                  <div key={item.name} className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-[#FEF3C7] p-1.5 text-[#C9A84C]">
                        <MapPinned className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">{item.name}</p>
                    </div>
                    <p className="mt-4 text-[38px] font-bold leading-none text-[#1A1A2E]">{item.value}</p>
                    <p className="mt-2 text-[11px] text-[#6B7280]">Approved outputs</p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="rounded-[12px] bg-[#F0FAF9] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-teal-100">
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#FEF3C7] p-2 text-[#C9A84C]">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1A1A2E]">Research Concentration Heatmap</h3>
            <p className="mt-1 text-xs text-[#6B7280]">Thematic density by institution · S&T priority clusters</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : activeHeiComparison.length > 0 && clusterColumns.length > 0 ? (
          <>
            <ThematicDensityHeatmap
              institutions={activeHeiComparison.slice(0, 6)}
              clusters={clusterColumns}
              getCell={getClusterCell}
              maxCellCount={maxClusterCellCount}
            />
            <p className="mt-3 text-[11px] text-[#9CA3AF]">Approved research outputs per S&T priority cluster, by institution.</p>
          </>
        ) : (
          <p className="mt-5 text-xs text-slate-400 italic">No cluster data available yet.</p>
        )}
      </section>

      {/* Research Niche Landscape */}
      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#EEF2FF] p-2 text-indigo-500">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1A1A2E]">Regional Research Niche Landscape</h3>
            <p className="mt-1 text-xs text-[#6B7280]">Filtered by Province &amp; HEI · reflects all-time theme data (not limited by Year)</p>
          </div>
        </div>

        <div className="mt-5 rounded-[12px] bg-[#1A2744] p-5">
          <p className="text-sm font-semibold text-white">DOST Region VII — Aggregated Research Themes</p>
          <p className="mt-1 text-xs text-white/50">Weighted frequency of subject tags across all HEI submissions · AY 2025-2026</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {heatmapData.length === 0 ? (
              <p className="text-xs text-white/40 italic">No research themes available yet.</p>
            ) : (
              [...new Map(heatmapData.map(d => [d.theme, d.count])).entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([theme, count], i) => {
                  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1']
                  return (
                    <span key={theme} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: colors[i % colors.length] }}>
                      {theme}
                    </span>
                  )
                })
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="grid gap-4 xl:grid-cols-3">
            {activeHeiComparison.slice(0, 6).map((hei, index) => (
              <div key={hei.institutionId} className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white" style={{ backgroundColor: heiColors[index % heiColors.length] }}>
                    {getInstitutionInitials(hei.name, 4)}
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{hei.name}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {heatmapData.filter(d => d.institutionId === hei.institutionId).slice(0, 5).map(d => (
                    <span key={d.theme} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">{d.theme}</span>
                  ))}
                  {heatmapData.filter(d => d.institutionId === hei.institutionId).length === 0 && (
                    <p className="text-xs text-slate-400 italic">Niche profile pending AI analysis.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}