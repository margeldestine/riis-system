import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { VISIBILITY_OPTIONS } from './visibilityOptions'

function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data
  return fallbackMessage
}

/**
 * Lets an HEI officer change the public visibility of one of their own records.
 * Calls PATCH /submissions/{id}/visibility. The backend writes the audit log entry
 * and does nothing (changed = false) if the value is the same.
 */
export default function VisibilityEditor({ recordId, current, onChanged }) {
  const [selected, setSelected] = useState(current || 'PUBLIC')
  const [saved, setSaved] = useState(current || 'PUBLIC')
  const [state, setState] = useState('idle') // idle | saving | saved | error
  const [message, setMessage] = useState('')

  const dirty = selected !== saved

  const save = async () => {
    setState('saving')
    setMessage('')
    try {
      const response = await apiClient.patch(`/submissions/${recordId}/visibility`, {
        visibility: selected,
      })
      const next = response?.data?.visibility || selected
      setSaved(next)
      setSelected(next)
      setState('saved')
      setMessage(
        response?.data?.changed === false
          ? 'No change. This record already had that visibility.'
          : 'Visibility updated. The change was recorded in the audit log.',
      )
      onChanged?.(next)
    } catch (error) {
      setState('error')
      setMessage(extractApiErrorMessage(error, 'Could not update visibility. Please try again.'))
    }
  }

  const active = VISIBILITY_OPTIONS.find((option) => option.value === selected)

  return (
    <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Public visibility
      </p>
      <p className="mt-1 text-[12px] text-slate-500">
        Controls what the public portal shows. The PDF is never shown publicly. Changes take
        effect immediately and do not need re-review.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value)
            setState('idle')
            setMessage('')
          }}
          className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#0d1f3c]"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === 'saving'}
          className="inline-flex items-center gap-2 rounded-[8px] bg-[#0d1f3c] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save visibility
        </button>
      </div>

      {active ? <p className="mt-3 text-[12px] text-slate-600">{active.summary} {active.shows}</p> : null}

      {message ? (
        <p className={`mt-2 text-[12px] font-medium ${state === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}