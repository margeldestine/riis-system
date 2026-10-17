// riis-frontend/src/features/hei/AutoFillBadge.jsx
import { useContext } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { AutoFillContext } from './autoFillContext'

export function AutoFillBadge({ field }) {
  const { fields, markVerified } = useContext(AutoFillContext)
  const info = fields[field]
  if (!info) return null

  // normal-case/tracking-normal: this badge sits inside uppercase, letter-spaced field labels.
  const base = 'badge badge-sm ml-2 gap-1 align-middle font-medium normal-case tracking-normal'

  if (info.state === 'verified') {
    return (
      <span className={`${base} badge-success badge-soft`}>
        <Check className="h-3 w-3" />
        Checked
      </span>
    )
  }

  const low = info.confidence === 'LOW'
  return (
    <button
      type="button"
      onClick={() => markVerified(field)}
      title="Auto-filled from your PDF. Edit the value, or click here once you have checked it."
      className={`${base} cursor-pointer ${low ? 'badge-error badge-soft' : 'badge-warning badge-soft'}`}
    >
      <Sparkles className="h-3 w-3" />
      Auto-filled, please verify{low ? ' (low confidence)' : ''}
    </button>
  )
}