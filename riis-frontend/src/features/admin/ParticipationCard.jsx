import { useEffect, useState } from 'react'
import { ChevronDown, ClipboardCheck } from 'lucide-react'
import apiClient from '../../services/apiClient'

// Colors and card style match the rest of the Analytics Dashboard.
const cardClass = 'rounded-[12px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
const DEFAULT_BASIS =
  'HEIs contribute their research outputs by choice. DASIG complements Scopus and other indexes by organizing local Region VII research.'
const tileClass = 'rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB]'

function ParticipationSkeleton() {
  return (
    <div className="mt-5 grid animate-pulse gap-4 xl:grid-cols-[1.7fr_1fr]" aria-busy="true" aria-label="Loading participation data">
      <div className="flex flex-col gap-3">
        <div className="h-[84px] rounded-[12px] bg-slate-100" />
        <div className="h-[110px] rounded-[12px] bg-slate-100" />
        <div className="h-[110px] rounded-[12px] bg-slate-100" />
      </div>
      <div className="min-h-[200px] rounded-[12px] bg-slate-100" />
    </div>
  )
}

function ProvinceRow({ row }) {
  const missing = row.nonParticipating || []
  return (
    <div className={`${tileClass} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-[#1A1A2E]">{row.province}</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
            {row.participating} of {row.whitelisted} HEIs
          </span>
        </div>
        <span className="text-xl font-bold text-[#123B72]">{row.ratePercent}%</span>
      </div>

      <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-[#E5E7EB]">
        <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${Math.min(row.ratePercent, 100)}%` }} />
      </div>

      {missing.length > 0 && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            {missing.length} {missing.length === 1 ? 'HEI has' : 'HEIs have'} no submission yet
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((name) => (
              <li key={name} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                {name}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

const HEI_BENEFITS = [
  'Local research organized and discoverable in one portal',
  'Each HEI gets its own profile, dashboard and reports',
]

/** Read-only: shows the recorded submission policy and the basis it was recorded on. */
function SubmissionPolicyPanel({ model }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-[#F3E3A6] bg-white">
      <div className="h-1 bg-[#C9A84C]" />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#FEF3C7] p-1.5 text-[#C9A84C]">
            <ClipboardCheck className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Submission policy</p>
        </div>

        <p className="mt-4 text-[30px] font-bold leading-none text-[#1A1A2E]">{model?.label || 'Voluntary'}</p>

        <div className="mt-4 rounded-[10px] border-l-[3px] border-[#C9A84C] bg-[#FFFBEB] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6d1f]">Basis</p>
          <p className="mt-1 text-xs leading-relaxed text-[#374151]">{model?.note || DEFAULT_BASIS}</p>
        </div>

        <div className="mt-4 border-t border-[#E5E7EB] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">What HEIs gain</p>
          <ul className="mt-2.5 space-y-2">
            {HEI_BENEFITS.map((text) => (
              <li key={text} className="flex gap-2.5 text-xs leading-relaxed text-[#374151]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Priority 3: whitelisted vs. participating HEIs per province, plus the recorded submission policy (read-only). */
export default function ParticipationCard() {
  const [participation, setParticipation] = useState(null)
  const [model, setModel] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error

  // Initial state is already 'loading', so state is only set inside the request callbacks.
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      apiClient.get('/analytics/participation', { signal: controller.signal }),
      apiClient.get('/admin/settings/submission-model', { signal: controller.signal }),
    ])
      .then(([participationRes, modelRes]) => {
        setParticipation(participationRes.data)
        setModel(modelRes.data)
        setState('ready')
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setState('error')
      })
    return () => controller.abort()
  }, [])

  return (
    <section className={cardClass}>
      <h3 className="text-[17px] font-semibold text-[#1A1A2E]">Participation by Province</h3>
      <p className="mt-1 text-xs text-[#6B7280]">
        Whitelisted HEIs vs. HEIs with at least one submission · region-wide, not limited by the filters above
      </p>

      {state === 'loading' && <ParticipationSkeleton />}

      {state === 'error' && (
        <p className="mt-5 text-xs italic text-slate-400">
          Could not load participation data. Refresh the page to try again.
        </p>
      )}

      {state === 'ready' && participation && (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className={`${tileClass} flex flex-wrap items-end gap-x-4 gap-y-1 p-4`}>
              <p className="text-[38px] font-bold leading-none text-[#123B72]">{participation.ratePercent}%</p>
              <p className="pb-0.5 text-xs text-[#6B7280]">
                {participation.totalParticipating} of {participation.totalWhitelisted} whitelisted HEIs have
                submitted at least once
              </p>
            </div>

            {participation.provinces.length === 0 ? (
              <p className="py-4 text-center text-xs italic text-slate-400">No whitelisted institutions yet.</p>
            ) : (
              participation.provinces.map((row) => <ProvinceRow key={row.province} row={row} />)
            )}
          </div>

          <SubmissionPolicyPanel model={model} />
        </div>
      )}
    </section>
  )
}
