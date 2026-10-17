import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import DashboardLayout from '../admin/DashboardLayout'
import apiClient from '../../services/apiClient'
import { heiNavItems } from './HeiDashboard'
import { VISIBILITY_OPTIONS } from './visibilityOptions'

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallbackMessage
}

/** HEI officer sets the institution's default visibility for NEW submissions. */
export default function HeiAccessSettingsPage() {
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [saved, setSaved] = useState('')
  const [selected, setSelected] = useState('')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/hei/settings/default-visibility')
      .then((response) => {
        if (cancelled) return
        const value = response?.data?.visibility || 'PUBLIC'
        setSaved(value)
        setSelected(value)
        setLoadState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setMessage(extractApiErrorMessage(error, 'Could not load your institution settings.'))
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaveState('saving')
    setMessage('')
    try {
      const response = await apiClient.put('/hei/settings/default-visibility', {
        visibility: selected,
      })
      const next = response?.data?.visibility || selected
      setSaved(next)
      setSelected(next)
      setSaveState('saved')
      setMessage(
        response?.data?.changed === false
          ? 'No change. That was already your default.'
          : 'Default updated. Existing records were not changed.',
      )
    } catch (error) {
      setSaveState('error')
      setMessage(extractApiErrorMessage(error, 'Could not save. Please try again.'))
    }
  }

  const institutionName =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    'Higher Education Institution'

  return (
    <DashboardLayout
      activeLabel="Access Settings"
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
                  DASHBOARD &gt; <span className="text-[#c9a84c]">ACCESS SETTINGS</span>
                </p>
                <h1
                  className="mt-2 text-[30px] font-bold tracking-tight text-[#0d1f3c]"
                  style={{ fontFamily: "'Libre Baskerville', serif" }}
                >
                  Access Settings
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Choose the visibility that is pre-selected when your institution submits a new research output. Officers can still change it for each record. Changing the default does not change records you already submitted.
                </p>
              </div>
              <div className="text-right">
                <p className="mt-1 text-[12px] text-[#6b7280]">{institutionName}</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-[#c9a84c]" />
        </div>

        {loadState === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        ) : null}

        {loadState === 'ready' ? (
          <div className="space-y-4">
            <div className="grid items-stretch gap-4 md:grid-cols-3">
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = selected === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelected(option.value)
                      setSaveState('idle')
                      setMessage('')
                    }}
                    className={`flex h-full min-w-0 flex-col items-stretch justify-start rounded-lg border bg-white p-5 text-left transition ${
                      isSelected
                        ? 'border-[#0d1f3c] ring-1 ring-[#0d1f3c]'
                        : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[15px] font-semibold text-[#0d1f3c]">{option.label}</span>
                      {isSelected ? <Check className="h-4 w-4 text-[#0d1f3c]" /> : null}
                    </div>
                    <p className="mt-1 text-[13px] text-slate-700">{option.summary}</p>
                    <p className="mt-2 text-[12px] text-slate-500">
                      <span className="font-semibold">Shown: </span>
                      {option.shows}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">{option.fullText}</p>
                    {saved === option.value ? (
                      <span className="mt-auto inline-block self-start rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        Current default
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={selected === saved || saveState === 'saving'}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#0d1f3c] px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save default
              </button>
              {message ? (
                <span className={`text-[13px] font-medium ${saveState === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {message}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}