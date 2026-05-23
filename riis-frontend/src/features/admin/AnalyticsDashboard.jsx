import {
  ChevronDown,
  ChevronRight,
  Download,
  Flame,
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

const cardClass =
  'rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'

const stackedChartData = [
  { year: '2020', fundedProject: 6, journalArticle: 3, other: 1 },
  { year: '2021', fundedProject: 8, journalArticle: 4, other: 1 },
  { year: '2022', fundedProject: 12, journalArticle: 5, other: 2 },
  { year: '2023', fundedProject: 16, journalArticle: 7, other: 2 },
  { year: '2024', fundedProject: 20, journalArticle: 8, other: 3 },
  { year: '2025', fundedProject: 25, journalArticle: 9, other: 4 },
]

const researchTypeData = [
  { name: 'Funded Project', value: 49, color: '#153e75' },
  { name: 'Journal Article', value: 23, color: '#2563eb' },
  { name: 'Innovation Output', value: 14, color: '#60a5fa' },
  { name: 'Conference Paper', value: 8, color: '#93c5fd' },
  { name: 'IP Registration', value: 6, color: '#dbeafe' },
]

const kpiCards = [
  {
    label: 'Total Approved Outputs',
    value: '49',
    detail: '+12 vs last year',
  },
  {
    label: 'Registered HEIs',
    value: '6',
    detail: '+2 vs last year',
  },
  {
    label: 'Validation Rate',
    value: '94%',
    detail: 'Target > 90%',
  },
  {
    label: 'Incomplete Rate',
    value: '8%',
    detail: 'Below 10% threshold',
  },
]

const heiOverview = [
  { name: 'University of San Carlos', rank: 1, count: 12, progress: 92 },
  { name: 'Silliman University', rank: 2, count: 11, progress: 84 },
  { name: 'Cebu Normal University', rank: 3, count: 9, progress: 72 },
  { name: 'BISU', rank: 4, count: 7, progress: 61 },
  { name: 'NORSU', rank: 5, count: 6, progress: 54 },
  { name: 'Saint Catherine College', rank: 6, count: 4, progress: 42 },
]

const provinceSummary = [
  { name: 'Cebu', value: 31 },
  { name: 'Bohol', value: 7 },
  { name: 'Negros Oriental', value: 9 },
  { name: 'Siquijor', value: 2 },
]

const heatmapColumns = [
  'Climate & Env',
  'Health & Medical',
  'Agri & Food',
  'Education & Social',
  'Tech & Innovation',
]

const heatmapRows = [
  { institution: 'USC', values: [4, 3, 1, 2, 5], color: '#123B72' },
  { institution: 'CNU', values: [1, 3, 0, 5, 2], color: '#2563EB' },
  { institution: 'SU', values: [3, 2, 2, 4, 1], color: '#7C3AED' },
  { institution: 'BISU', values: [2, 1, 4, 2, 0], color: '#F59E0B' },
  { institution: 'NORSU', values: [2, 2, 2, 1, 3], color: '#EF4444' },
  { institution: 'SCC', values: [0, 3, 0, 1, 1], color: '#10B981' },
]

const nicheTags = [
  'Environmental Science',
  'GIS & Remote Sensing',
  'Public Health',
  'Marine Biology',
  'Agriculture Science',
  'Food Technology',
  'Sustainable Energy',
  'Agricultural Science',
  'Social Studies',
  'Coastal Ecology',
  'Geotechnology',
  'Bioculture',
  'Indigenous Studies',
  'Marine Research',
  'Curriculum Development',
  'Civil Built Systems',
]

const heiNicheCards = [
  {
    name: 'University of San Carlos',
    code: 'USC',
    tags: ['Environmental Science', 'GIS & Remote Sensing', 'Public Health'],
    color: '#123B72',
  },
  {
    name: 'Cebu Normal University',
    code: 'CNU',
    tags: ['Education Policy', 'Marine Biology', 'Curriculum Development'],
    color: '#2563EB',
  },
  {
    name: 'Silliman University',
    code: 'SU',
    tags: ['Marine Biology', 'Ecology', 'Agriculture Science'],
    color: '#7C3AED',
  },
  {
    name: 'Bohol Island State University',
    code: 'BISU',
    tags: ['Automation', 'Food Technology', 'Environmental Monitoring'],
    color: '#F59E0B',
  },
  {
    name: 'NORSU',
    code: 'NORSU',
    tags: ['Energy', 'Environmental Science', 'GIS & Remote Sensing'],
    color: '#EF4444',
  },
  {
    name: 'Saint Catherine College',
    code: 'SCC',
    tags: ['Nursing Research', 'Community Health', 'Educational Outreach'],
    color: '#10B981',
  },
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

export default function AnalyticsDashboard({
  pendingCount = 0,
  pendingStatus = 'idle',
  onReviewAction,
}) {
  const pendingCard = {
    label: 'Pending Review',
    value: pendingStatus === 'loading' ? '...' : String(pendingCount),
    detail: 'Accounts waiting for admin action',
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]">
        <span className="text-[#9CA3AF]">Dashboard</span>
        <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
        <span className="text-[#C9A84C]">Submission Portal</span>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-[30px] font-bold tracking-tight text-[#1A1A2E]">
            Regional Research Analytics Dashboard
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Module 4 - IJC-M4-01: DOST Administrator View · Region VII · AY
            2025-2026
          </p>
        </div>

        <div className={`${cardClass} min-w-[160px] px-4 py-3 text-right`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
            Academic Year
          </p>
          <p className="mt-1 text-lg font-semibold text-[#1A1A2E]">2025-2026</p>
          <p className="mt-1 text-xs text-[#6B7280]">Institution Form</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.label}
            value={card.value}
            label={card.label}
            detail={card.detail}
          />
        ))}

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

      <section className="grid gap-4 xl:grid-cols-[1.55fr,0.85fr]">
        <div className="rounded-[12px] bg-[#1A2744] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[17px] font-semibold text-white">
            Research Outputs by Year & Discipline
          </h3>
          <p className="mt-1 text-xs text-white/60">
            Approved outputs grouped by research type
          </p>

          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedChartData} barGap={8} barCategoryGap={18}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.12)" />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#ffffff', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#ffffff', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: '#13233B',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
                  }}
                  labelStyle={{ color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar
                  dataKey="fundedProject"
                  fill="#C9A84C"
                  radius={[2, 2, 0, 0]}
                  name="Funded Project"
                />
                <Bar
                  dataKey="journalArticle"
                  fill="#5C7EA6"
                  radius={[2, 2, 0, 0]}
                  name="Journal Article"
                />
                <Bar
                  dataKey="other"
                  fill="#8EA4C3"
                  radius={[2, 2, 0, 0]}
                  name="Other"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[12px] bg-[#1A2744] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 className="text-[17px] font-semibold text-white">
            Research Type Distribution
          </h3>
          <p className="mt-1 text-xs text-white/60">All approved outputs</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[150px,1fr] xl:grid-cols-1 2xl:grid-cols-[150px,1fr]">
            <div className="relative mx-auto flex h-[150px] w-[150px] items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={researchTypeData}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={64}
                    stroke="none"
                  >
                    {researchTypeData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${value}`}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      backgroundColor: '#13233B',
                      color: '#ffffff',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
                    }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute flex flex-col items-center">
                <span className="text-[36px] font-bold leading-none text-white">
                  49
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                  Outputs
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {researchTypeData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 text-sm text-white"
                >
                  <div className="flex items-center gap-2 text-white/80">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className={cardClass}>
          <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
            HEI Submission Overview
          </h3>
          <p className="mt-1 text-xs text-[#6B7280]">
            Ranked by total approved outputs
          </p>

          <div className="mt-5 space-y-4">
            {heiOverview.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[28px,minmax(0,1fr),110px,34px] items-center gap-3"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white"
                  style={{ backgroundColor: heatmapRows[item.rank - 1]?.color || '#1A1A2E' }}
                >
                  {item.name
                    .split(' ')
                    .map((word) => word[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E]">
                    {item.rank}. {item.name}
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
            {provinceSummary.map((item) => (
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

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#FEF3C7] p-2 text-[#C9A84C]">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
              Research Concentration Heatmap
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              Thematic density by institution across key regional output clusters
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[920px] grid-cols-[180px_repeat(5,minmax(120px,1fr))] gap-2">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Institution
            </div>
            {heatmapColumns.map((column) => (
              <div
                key={column}
                className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]"
              >
                {column}
              </div>
            ))}

            {heatmapRows.map((row) => (
              <div
                key={row.institution}
                className="contents"
              >
                <div
                  className="flex h-[68px] items-center gap-3 rounded-[12px] border border-[#E5E7EB] bg-white px-3"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white"
                    style={{ backgroundColor: row.color }}
                  >
                    {row.institution}
                  </div>
                  <span className="text-sm font-semibold text-[#1A1A2E]">
                    {row.institution}
                  </span>
                </div>
                {row.values.map((value, index) => {
                  const background =
                    value === 0
                      ? '#F3F4F6'
                      : ['#E0F2F1', '#B2DFDB', '#80CBC4', '#26A69A', '#00796B'][
                          Math.min(value - 1, 4)
                        ]
                  const textColor = value >= 4 ? '#FFFFFF' : '#1A1A2E'

                  return (
                    <div
                      key={`${row.institution}-${heatmapColumns[index]}`}
                      className="flex h-[68px] items-center justify-center rounded-[12px] text-lg font-semibold"
                      style={{ backgroundColor: background, color: textColor }}
                    >
                      {value}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#FEF3C7] p-2 text-[#C9A84C]">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[#1A1A2E]">
              Regional Research Niche Landscape
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              Auto-grouped niche themes across DOST Region VII HEI portfolios
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[12px] bg-[#1A2744] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            DOST Region VII - Aggregated Research Themes
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {nicheTags.map((tag, index) => {
              const colors = [
                'bg-[#38BDF8]',
                'bg-[#7C3AED]',
                'bg-[#F59E0B]',
                'bg-[#10B981]',
                'bg-[#EF4444]',
                'bg-[#6366F1]',
              ]
              return (
                <span
                  key={tag}
                  className={`rounded-full px-[12px] py-[4px] text-[11px] font-medium text-white ${colors[index % colors.length]}`}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {heiNicheCards.map((item) => (
            <div
              key={item.name}
              className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.code.slice(0, 2)}
                </div>
                <p className="text-sm font-semibold text-[#1A1A2E]">{item.name}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag, index) => {
                  const colors = [
                    'bg-[#DBEAFE] text-[#1D4ED8]',
                    'bg-[#DCFCE7] text-[#15803D]',
                    'bg-[#FEE2E2] text-[#B91C1C]',
                    'bg-[#FEF3C7] text-[#B45309]',
                    'bg-[#EDE9FE] text-[#6D28D9]',
                  ]
                  return (
                    <span
                      key={tag}
                      className={`rounded-full px-[12px] py-[4px] text-[11px] font-medium ${colors[index % colors.length]}`}
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
