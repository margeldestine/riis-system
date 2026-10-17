import { EyeOff, Lock } from 'lucide-react'
import { visibilityBadgeClasses, visibilityLabel } from './accessTiers'

/** Small pill for non-public records. Renders nothing for PUBLIC (or unknown) records. */
export default function VisibilityBadge({ visibility, className = '' }) {
  if (visibility !== 'METADATA_ONLY' && visibility !== 'RESTRICTED') return null
  const Icon = visibility === 'RESTRICTED' ? Lock : EyeOff
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${visibilityBadgeClasses(visibility)} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {visibilityLabel(visibility)}
    </span>
  )
}
