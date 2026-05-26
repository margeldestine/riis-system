import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token')
  const rawRole = localStorage.getItem('role') || ''
  const role = rawRole.replace(/^ROLE_/i, '').trim()

  if (!token) return <Navigate to="/login" replace />
  if (allowedRole && role !== allowedRole) return <Navigate to="/login" replace />

  return children
}