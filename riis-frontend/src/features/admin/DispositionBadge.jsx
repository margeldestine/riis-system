// riis-frontend/src/features/admin/DispositionBadge.jsx
import { dispositionMeta } from './similarityDisposition'

export default function DispositionBadge({ status }) {
  const meta = dispositionMeta(status || 'OPEN')
  return <span className={`badge badge-soft badge-sm whitespace-nowrap ${meta.badge}`}>{meta.label}</span>
}