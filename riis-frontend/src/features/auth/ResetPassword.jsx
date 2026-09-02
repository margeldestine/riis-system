import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is invalid or missing a token.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', {
          state: { successMessage: 'Password reset successful. Please sign in.' },
        })
      }, 2000)
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'This link may have expired or already been used. Please request a new one.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <h2
          className="text-2xl font-bold text-[#0d1f3c]"
          style={{ fontFamily: "'Libre Baskerville', serif" }}
        >
          Set a new password
        </h2>

        {success ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Password reset successful. Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
                disabled={isSubmitting}
                className="w-full rounded-[6px] border border-[#d1d5db] px-4 py-3 pr-11 text-sm outline-none focus:border-[#0d1f3c] focus:ring-2 focus:ring-[#0d1f3c]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={isSubmitting}
              className="w-full rounded-[6px] border border-[#d1d5db] px-4 py-3 text-sm outline-none focus:border-[#0d1f3c] focus:ring-2 focus:ring-[#0d1f3c]/15"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-[6px] bg-[#0d1f3c] text-sm font-semibold text-white hover:bg-[#0b1a33] disabled:opacity-70"
            >
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}