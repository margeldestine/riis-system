// riis-frontend/src/features/hei/autoFillContext.js
import { createContext } from 'react'

// Lets the step components (which live deep inside SubmissionPortal.jsx) show the
// "auto-filled" badge without threading props through every one of them.
//   fields:       { [fieldName]: { confidence: 'HIGH'|'MEDIUM'|'LOW', state: 'pending'|'verified' } }
//   markVerified: (fieldName) => void
// Kept in its own file (not next to the badge component) so React Fast Refresh keeps working.
export const AutoFillContext = createContext({ fields: {}, markVerified: () => {} })