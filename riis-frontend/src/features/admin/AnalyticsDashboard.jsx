import { useEffect, useState } from 'react'
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

function FilterField({ label, value }) {
  return (
    <div className="min-w-[176px]">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
        {label}
      </p>
      <div className="relative">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-[8px] border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#6B7280]"
        >
          <span>{value}</span>
          <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
        </button>
      </div>
    </div>
  )
}

function KpiCard({ value, label, detail }) {
  return (
    <div className={cardClass}>
      <p className="text-[38px] font-bold leading-none text-[#1A1A2E]">{value}</p>
      <p className="mt-4 text-[12px] font-semibold text-[#1A1A2E]">{label}</p>
      <p className="mt-1 text-[12px] font-medium text-[#6B7280]">{detail}</p>
    </div>
  )
}

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

// Shortens a cluster name for the x-axis label without truncating mid-word
// where avoidable (e.g. "Technology, Engineering, and Innovation Research"
// -> "Tech & Innovation"). Falls back to a generic truncation for anything
// not in this fixed list, though in practice there are always exactly 5.
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

// ---- D3-powered Thematic Density Heatmap ----------------------------------
// Rebuilt around the 5 fixed S&T priority clusters (Climate & Env, Health &
// Medical, Agri & Food, Education & Social, Tech & Innovation) per the
// wireframe embedded in SDD §5.1 — which contradicts §3.2's separate text
// description of this same component (KeyBERT top-10 region-wide themes).
// That's a genuine internal SDD contradiction (image vs. prose); the
// wireframe was followed as the more concrete, validated UI spec. The old
// KeyBERT-top-10 text-matching approach now lives at GET
// /api/v1/analytics/heatmap-matrix, still intact but no longer wired into
// this component.
//
// Cell value is a real COUNT of distinct APPROVED research outputs assigned
// to that cluster for that institution (via research_output_clusters), NOT
// a keyword-occurrence count.
function ThematicDensityHeatmap({ institutions, clusters, getCell, maxCellCount }) {
  const [hoveredCell, setHoveredCell] = useState(null) // { institutionId, clusterId } | null

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
          {/* Cluster (x-axis) labels — fixed 5 columns, no rotation needed
              since labels are short with the override map above */}
          {clusters.map((cluster) => {
            const x = xScale(cluster.clusterId) + xScale.bandwidth() / 2
            return (
              <text
                key={cluster.clusterId}
                x={x}
                y={-16}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.03em"
                fill="#6B7280"
              >
                {getClusterLabel(cluster.clusterName)}
              </text>
            )
          })}

          {/* Institution (y-axis) rows */}
          {institutions.map((hei, index) => {
            const y = yScale(hei.institutionId) + yScale.bandwidth() / 2
            const abbrev = getInstitutionInitials(hei.name, 4)
            return (
              <g key={`label-${hei.institutionId}`}>
                <rect
                  x={-margin.left + 12}
                  y={y - 11}
                  width={30}
                  height={22}
                  rx={6}
                  fill={heiColors[index % heiColors.length]}
                />
                <text
                  x={-margin.left + 12 + 15}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="8"
                  fontWeight="700"
                  fill="#FFFFFF"
                >
                  {abbrev}
                </text>
                <text
                  x={-margin.left + 50}
                  y={y}
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize="12"
                  fontWeight="600"
                  fill="#1A1A2E"
                >
                  {abbrev}
                </text>
              </g>
            )
          })}

          {/* Matrix cells — always 5 columns per row, even for clusters
              with zero assigned outputs right now */}
          {institutions.map((hei) =>
            clusters.map((cluster) => {
              const { count } = getCell(hei.institutionId, cluster.clusterId)
              const x = xScale(cluster.clusterId)
              const y = yScale(hei.institutionId)
              const isHovered =
                hoveredCell?.institutionId === hei.institutionId &&
                hoveredCell?.clusterId === cluster.clusterId

              return (
                <g
                  key={`${hei.institutionId}-${cluster.clusterId}`}
                  onMouseEnter={() =>
                    setHoveredCell({ institutionId: hei.institutionId, clusterId: cluster.clusterId })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{ cursor: 'default' }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={xScale.bandwidth()}
                    height={yScale.bandwidth()}
                    rx={10}
                    fill={cellFill(count)}
                    stroke={isHovered ? '#0E7A68' : 'none'}
                    strokeWidth={isHovered ? 2 : 0}
                  />
                  <text
                    x={x + xScale.bandwidth() / 2}
                    y={y + yScale.bandwidth() / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="15"
                    fontWeight="600"
                    fill={cellTextColor(count)}
                  >
                    {count > 0 ? count : '—'}
                  </text>
                </g>
              )
            })
          )}
        </g>
      </svg>

      {/* Tooltip — no topTitles here (the cluster-heatmap endpoint is a
          plain count query, not a text-matching approximation, so there's
          no per-cell title list to show). Just institution + cluster +
          count. */}
      {hoveredCell &&
        (() => {
          const hei = institutions.find((i) => i.institutionId === hoveredCell.institutionId)
          const cluster = clusters.find((c) => c.clusterId === hoveredCell.clusterId)
          if (!hei || !cluster) return null
          const { count } = getCell(hoveredCell.institutionId, hoveredCell.clusterId)
          const left = margin.left + xScale(hoveredCell.clusterId) + xScale.bandwidth() / 2
          const top = margin.top + yScale(hoveredCell.institutionId)
          return (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] bg-[#1A1A2E] px-3 py-2 text-xs font-medium text-white shadow-lg"
              style={{ left, top: top - 8 }}
            >
              <div className="font-semibold">{hei.name}</div>
              <div className="text-white/70">
                {cluster.clusterName}: {count} output{count === 1 ? '' : 's'}
              </div>
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

  useEffect(() => {
    const controller = new AbortController()

    const fetchAll = async () => {
      setLoading(true)
      try {
        const [
          summaryRes,
          trendRes,
          typeRes,
          heiRes,
          provinceRes,
          heatmapRes,
          clusterHeatmapRes,
        ] = await Promise.all([
          apiClient.get('/analytics/summary', { signal: controller.signal }),
          apiClient.get('/analytics/trend', { signal: controller.signal }),
          apiClient.get('/analytics/type-distribution', { signal: controller.signal }),
          apiClient.get('/analytics/hei-comparison', { signal: controller.signal }),
          apiClient.get('/analytics/province-summary', { signal: controller.signal }),
          apiClient.get('/analytics/heatmap', { signal: controller.signal }),
          apiClient.get('/analytics/cluster-heatmap', { signal: controller.signal }),
        ])
        setSummary(summaryRes.data)
        setTrendData(trendRes.data || [])
        setTypeDistribution(typeRes.data || [])
        setHeiComparison(heiRes.data || [])
        setProvinceSummary(provinceRes.data || [])
        setHeatmapData(heatmapRes.data || [])
        setClusterHeatmap(clusterHeatmapRes.data || { clusters: [], cells: [] })
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Analytics fetch error:', err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
    return () => controller.abort()
  }, [])

  const pendingCard = {
    label: 'Pending Review',
    value: pendingStatus === 'loading' ? '...' : String(pendingCount),
    detail: 'Accounts waiting for admin action',
  }

  const totalOutputs = summary?.totalApprovedOutputs ?? 0

  // ---- Build institution x cluster lookup + max count for color scaling --
  const clusterHeatmapLookup = new Map() // key: `${institutionId}||${clusterId}` -> count
  let maxClusterCellCount = 0
  for (const cell of clusterHeatmap.cells || []) {
    const key = `${cell.institutionId}||${cell.clusterId}`
    clusterHeatmapLookup.set(key, cell.count)
    if (cell.count > maxClusterCellCount) maxClusterCellCount = cell.count
  }
  const clusterColumns = clusterHeatmap.clusters || [] // always the 5 fixed clusters

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
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
            Academic Year
          </p>
          <p className="mt-1 text-lg font-semibold text-[#1A1A2E]">2025-2026</p>
          <p className="mt-1 text-xs text-[#6B7280]">DOST Region VII</p>
        </div>
      </div>

      {/* KPI Strip */}
      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        {loading ? (
          <>
            <LoadingCard /><LoadingCard /><LoadingCard /><LoadingCard />
          </>
        ) : (
          <>
            <KpiCard
              value={summary?.totalApprovedOutputs ?? 0}
              label="Total Approved Outputs"
              detail="All approved research outputs"
            />
            <KpiCard
              value={summary?.totalRegisteredHeis ?? 0}
              label="Registered HEIs"
              detail="Active member institutions"
            />
            <KpiCard
              value={`${summary?.completenessRate ?? 0}%`}
              label="Completeness Rate"
              detail="Target ≥ 90%"
            />
            <KpiCard
              value={`${summary?.incompleteRate ?? 0}%`}
              label="Incomplete Rate"
              detail="Below 10% threshold"
            />
          </>
        )}

        <div className={cardClass}>
          <p className="text-[38px] font-bold leading-none text-[#1A1A2E]">
            {pendingCard.value}
          </p>
          <p className="mt-4 text-[12px] font-semibold text-[#1A1A2E]">
            {pendingCard.label}
          </p>
          <p className="mt-1 text-[12px] font-medium text-[#6B7280]">
            {pendingCard.detail}
          </p>
          <button
            type="button"
            onClick={onReviewAction}
            disabled={pendingStatus === 'loading'}
            className="mt-4 inline-flex items-center rounded-[8px] bg-[#1A1A2E] px-[20px] py-[10px] text-sm font-semibold text-white transition hover:bg-[#11111f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Review Action
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className={cardClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FilterField label="All Years" value="All Years" />
            <FilterField label="All Provinces" value="All Provinces" />
            <FilterField label="All HEIs" value="All HEIs" />
            <FilterField label="All Types" value="All Types" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#1A1A2E] px-[20px] py-[10px] text-sm font-semibold text-white transition hover:bg-[#11111f]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Apply Filters
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#D1D5DB] bg-white px-[20px] py-[10px] text-sm font-semibold text-[#374151] transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export All
            </button>
          </div>
        </div>
      </section>

      {/* Trend + Donut */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.55fr 0.85fr', gap: '16px' }}>
        <div className="rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
            Research Outputs by Year & Discipline
          </h3>
          <p className="mt-1 text-xs text-[#6B7280]">
            Approved outputs grouped by research type
          </p>
          <div className="mt-5 h-[260px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={4} barCategoryGap="40%" style={{ cursor: 'default' }} onMouseLeave={() => {}}>
                  <CartesianGrid vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#ffffff',
                      color: '#1A1A2E',
                    }}
                    labelStyle={{ color: '#1A1A2E' }}
                    itemStyle={{ color: '#1A1A2E' }}
                  />
                  {trendData.length > 0 &&
                    Object.keys(trendData[0])
                      .filter((k) => k !== 'year')
                      .map((key, i) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={['#C9A84C', '#5C7EA6', '#8EA4C3', '#60a5fa', '#93c5fd'][i % 5]}
                          radius={[2, 2, 0, 0]}
                          name={key}
                          isAnimationActive={false}
                          activeBar={{ fill: ['#C9A84C', '#5C7EA6', '#8EA4C3', '#60a5fa', '#93c5fd'][i % 5] }}
                        />
                      ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {trendData.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-4">
              {Object.keys(trendData[0])
                .filter((k) => k !== 'year')
                .map((key, i) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: ['#C9A84C', '#5C7EA6', '#8EA4C3', '#60a5fa', '#93c5fd'][i % 5] }}
                    />
                    {key}
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
            Research Type Distribution
          </h3>
          <p className="mt-1 text-xs text-[#6B7280]">All approved outputs</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[150px,1fr] xl:grid-cols-1 2xl:grid-cols-[150px,1fr]">
            <div className="relative mx-auto flex h-[150px] w-[150px] items-center justify-center">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        dataKey="value"
                        innerRadius={44}
                        outerRadius={64}
                        stroke="none"
                      >
                        {typeDistribution.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${value}`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          backgroundColor: '#ffffff',
                          color: '#1A1A2E',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute flex flex-col items-center">
                    <span className="text-[36px] font-bold leading-none text-[#1A1A2E]">
                      {totalOutputs}
                    </span>
                    <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Outputs
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              {typeDistribution.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 text-sm text-[#1A1A2E]"
                >
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
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
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
            HEI Submission Overview
          </h3>
          <p className="mt-1 text-xs text-[#6B7280]">
            Ranked by total approved outputs
          </p>
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : heiComparison.map((item, index) => (
              <div
                key={item.institutionId}
                className="grid grid-cols-[28px,minmax(0,1fr),110px,34px] items-center gap-3"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white"
                  style={{ backgroundColor: heiColors[index % heiColors.length] }}
                >
                  {getInstitutionInitials(item.name, 2)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E]">
                    {index + 1}. {item.name}
                  </p>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-full rounded-full bg-[#C9A84C]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <span className="text-right text-sm font-semibold text-[#1A1A2E]">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
            Province-Level Summary
          </h3>
          <p className="mt-1 text-xs text-[#6B7280]">
            Approved outputs by province
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : provinceSummary.map((item) => (
              <div
                key={item.name}
                className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-[#FEF3C7] p-1.5 text-[#C9A84C]">
                    <MapPinned className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                    {item.name}
                  </p>
                </div>
                <p className="mt-4 text-[38px] font-bold leading-none text-[#1A1A2E]">
                  {item.value}
                </p>
                <p className="mt-2 text-[11px] text-[#6B7280]">Approved outputs</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Heatmap — rebuilt around the 5 fixed S&T priority clusters per the
          SDD §5.1 wireframe, data via /analytics/cluster-heatmap */}
      <section className="rounded-[12px] bg-[#F0FAF9] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-teal-100">
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#FEF3C7] p-2 text-[#C9A84C]">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
              Research Concentration Heatmap
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              Thematic density by institution · S&T priority clusters · darker = more outputs
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : heiComparison.length > 0 && clusterColumns.length > 0 ? (
          <>
            <ThematicDensityHeatmap
              institutions={heiComparison.slice(0, 6)}
              clusters={clusterColumns}
              getCell={getClusterCell}
              maxCellCount={maxClusterCellCount}
            />
            <p className="mt-3 text-[11px] text-[#9CA3AF]">
              Approved research outputs per S&T priority cluster, by institution.
            </p>
          </>
        ) : (
          <p className="mt-5 text-xs text-slate-400 italic">
            No cluster data available yet.
          </p>
        )}
      </section>

      {/* Research Niche Landscape — unchanged, still backed by
          /analytics/heatmap (KeyBERT region-wide theme tag cloud) */}
      <section className={cardClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-[10px] bg-[#EEF2FF] p-2 text-indigo-500">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
                Regional Research Niche Landscape
              </h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                Auto-segmented on every month (approx.) · CA-NB-25 logi II
              </p>
            </div>
          </div>
          <button type="button" className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            Module 8.1 Log
          </button>
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
                  const colors = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#F97316','#84CC16','#EC4899','#6366F1']
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
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Per-Niche Summary</p>
          <div className="grid gap-4 xl:grid-cols-3">
            {heiComparison.slice(0, 6).map((hei, index) => (
              <div key={hei.institutionId} className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white"
                    style={{ backgroundColor: heiColors[index % heiColors.length] }}
                  >
                    {getInstitutionInitials(hei.name, 2)}
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{hei.name}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                {heatmapData
                  .filter(d => d.institutionId === hei.institutionId)
                  .slice(0, 5)
                  .map(d => (
                    <span key={d.theme} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                      {d.theme}
                    </span>
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