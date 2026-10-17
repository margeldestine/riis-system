import { Controller } from 'react-hook-form'
import { Check, Loader2 } from 'lucide-react'
import { VISIBILITY_OPTIONS } from './visibilityOptions.js'

/**
 * "Who can see this record?" selector for the submission form (Step 4).
 * Pre-selected from the institution default; the officer can change it per record.
 * The raw PDF is never public under any option.
 */
export default function VisibilitySelector({ control, error, defaultState, defaultValue }) {
  const loading = defaultState === 'loading'
  const failed = defaultState === 'failed'

  return (
    <div className="space-y-3" id="field-visibility">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
          Public visibility <span className="text-[#C9A84C]">*</span>
        </label>
        <p className="mt-1 text-[12px] text-[#6b7280]">
          Choose what the public can see. The PDF is never shown publicly. You can change this
          later without re-submitting.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your institution&apos;s default...
        </div>
      ) : null}

      {failed ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          Could not load your institution&apos;s default visibility. Please choose one below.
        </p>
      ) : null}

      <Controller
        control={control}
        name="visibility"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Public visibility" className="grid gap-3 md:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = field.value === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={loading}
                  onClick={() => field.onChange(option.value)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected
                      ? 'border-[#0d1f3c] bg-[#f1f5f9] ring-1 ring-[#0d1f3c]'
                      : 'border-[#e5e7eb] bg-white hover:border-[#9ca3af]'
                  } ${loading ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#0d1f3c]">{option.label}</span>
                    {selected ? <Check className="h-4 w-4 text-[#0d1f3c]" /> : null}
                  </div>
                  <p className="mt-1 text-[12px] text-[#374151]">{option.summary}</p>
                  <p className="mt-2 text-[11px] text-[#6b7280]">
                    <span className="font-semibold">Shown: </span>
                    {option.shows}
                  </p>
                  <p className="mt-1 text-[11px] text-[#6b7280]">{option.fullText}</p>
                  {defaultValue === option.value ? (
                    <span className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      Institution default
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      />

      {error ? <p className="text-[11px] font-medium text-[#dc2626]">{error}</p> : null}
    </div>
  )
}