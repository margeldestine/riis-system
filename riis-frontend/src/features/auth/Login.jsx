import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import '@fontsource/inter'
import '@fontsource/libre-baskerville'
import apiClient from '../../services/apiClient'
import dostLogo from '../../assets/dost-logo.png'

const pendingApprovalMessage =
  'Your HEI account is still pending DOST approval. Please wait for admin approval before signing in.'

function extractApiErrorMessage(error) {
  const data = error?.response?.data
  const rawMessage = error?.message || ''
  const status = error?.response?.status

  if (
    data?.message === 'Account pending DOST approval.' ||
    data?.detail === 'Account pending DOST approval.' ||
    typeof data === 'string' && data.includes('pending DOST approval')
  ) {
    return pendingApprovalMessage
  }

  if (data?.message) return data.message
  if (typeof data === 'string') return data

  if (status === 403 || rawMessage.includes('status code 403')) {
    return 'Access denied. Please ensure your account is approved and has the correct role permissions.'
  }
  return 'Invalid email or password.'
}

function extractResponseMessage(data) {
  if (data?.message) return data.message
  if (data?.detail) return data.detail
  if (data?.error) return data.error
  if (typeof data === 'string') return data
  return ''
}

function extractTokenFromResponse(data) {
  if (!data) return ''
  if (typeof data === 'string') return data.replace(/^Bearer\s+/i, '').trim()

  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    data.idToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    ''

  return typeof token === 'string'
    ? token.replace(/^Bearer\s+/i, '').trim()
    : ''
}

function toDisplayRole(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  return raw
    .replace(/^ROLE_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [stats, setStats] = useState({ submissions: null, institutions: null })

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotStatus, setForgotStatus] = useState('') // 'success' | 'error' | ''
  const [forgotMessage, setForgotMessage] = useState('')

  const copyrightYear = useMemo(() => new Date().getFullYear(), [])

  useEffect(() => {
    const message = location.state?.successMessage
    if (!message) return
    setSuccessMessage(message)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      try {
        const res = await apiClient.get('/institutions/public/stats')
        const data = res.data || {}
        if (!cancelled) {
          setStats({
            submissions: data.totalSubmissions ?? null,
            institutions: data.totalInstitutions ?? null,
          })
        }
      } catch {
        if (!cancelled) {
          setStats({ submissions: null, institutions: null })
        }
      }
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      localStorage.removeItem('token')

      const response = await apiClient.post('/auth/login', {
        email,
        password,
        rememberMe,
      }, {
        validateStatus: () => true,
      })
      console.log('LOGIN RESPONSE:', response.status, response.data)

      if (response.status === 403) {
        const serverMessage = extractResponseMessage(response.data)
        if (serverMessage.toLowerCase().includes('pending')) {
          setError(pendingApprovalMessage)
        } else if (serverMessage) {
          setError(serverMessage)
        } else {
          setError('Access denied. Please ensure your account is approved and has the correct role permissions.')
        }
        return
      }

      if (response.status >= 200 && response.status < 300) {
        const token = extractTokenFromResponse(response.data)
        const role = (response.data?.role || '').trim().toUpperCase()
        const status = (response.data?.status || '').trim().toUpperCase()
        const domain = (email.split('@')[1] || '').trim().toLowerCase()

        if (status === 'PENDING') {
          localStorage.removeItem('token')
          setError(pendingApprovalMessage)
          return
        }

        if (!token) {
          localStorage.removeItem('token')
          setError('Login succeeded but no authentication token was returned by the server.')
          return
        }

        localStorage.setItem('token', token)
        localStorage.setItem('role', role)

        const isDostRole = role.includes('DOST')
        const isHeiRole = role.includes('HEI')
        const isDostDomain = /(^|\.)dost\.gov\.ph$/.test(domain)
        const isHeiDomain =
          /(^|\.)edu(\.|$)/.test(domain) || /(^|\.)ac\.ph$/.test(domain)

        if (isHeiRole || isHeiDomain) {
          const pendingInstitutionName =
            localStorage.getItem('pendingInstitutionName') || ''
          const pendingUserRole = localStorage.getItem('pendingUserRole') || ''
          const institutionName = (
            response.data?.institutionName ||
            response.data?.institution ||
            response.data?.organization ||
            pendingInstitutionName
          ).toString().trim()

          const positionOrRole = (
            response.data?.position ||
            response.data?.designation ||
            response.data?.jobTitle ||
            pendingUserRole ||
            response.data?.role ||
            ''
          ).toString().trim()

          if (institutionName) {
            localStorage.setItem('institutionName', institutionName)
            localStorage.setItem('userInstitution', institutionName)
          }

          if (positionOrRole) {
            localStorage.setItem('userRole', toDisplayRole(positionOrRole))
          }

          localStorage.removeItem('pendingInstitutionName')
          localStorage.removeItem('pendingUserRole')
        }

        if (isDostRole || isDostDomain) {
          navigate('/dost/dashboard')
        } else if (isHeiRole || isHeiDomain) {
          navigate('/hei/submission-portal')
        } else {
          localStorage.removeItem('token')
          setError('Your account role is not recognized. Please contact your administrator.')
        }
      } else {
        setError(extractResponseMessage(response.data) || 'Invalid email or password.')
      }
    } catch (err) {
      localStorage.removeItem('token')
      setError(extractApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotSubmitting(true)
    setForgotStatus('')
    setForgotMessage('')

    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail })
      setForgotStatus('success')
      setForgotMessage('If that email exists, a reset link has been sent. Please check your inbox.')
    } catch (err) {
      setForgotStatus('error')
      setForgotMessage(
        err?.response?.data?.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setForgotSubmitting(false)
    }
  }

  const closeForgotModal = () => {
    setShowForgotModal(false)
    setForgotEmail('')
    setForgotStatus('')
    setForgotMessage('')
  }

  return (
    <div
      className="min-h-screen bg-white text-gray-900"
      style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.4 }}
    >
      <div className="mx-auto grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <section className="relative flex flex-col justify-between overflow-hidden border-r-2 border-[#c9a84c] bg-[#0d1f3c] p-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'url(/DOST_Building.png)',
              backgroundSize: 'cover',
              backgroundPosition: '50% 30%',
              opacity: 1,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'rgba(13, 31, 60, 0.75)' }}
          />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-4">
              <img
                src={dostLogo}
                alt="DOST Logo"
                className="h-10 w-10 object-contain"
              />
              <div className="leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-widest text-white/90">
                  Republic of the Philippines
                </p>
                <p className="text-[11px] tracking-wide text-white/60">
                  DASIG Research Information System
                </p>
              </div>
            </div>

            <div className="mt-16 max-w-xl text-left">
              <div className="flex items-center gap-4">
                <div className="h-px w-10 bg-[#c9a84c]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c9a84c]">
                  DOST Research Information System
                </p>
              </div>

              <h1
                className="mt-6 text-[46px] font-bold leading-[1.06] tracking-tight text-white"
                style={{ fontFamily: "'Libre Baskerville', serif" }}
              >
                Higher Education
                <br />
                Institution Research
                <br />
                Submission Portal
              </h1>
              <p className="mt-6 max-w-md text-[13px] leading-relaxed text-white/70">
                A centralized platform for HEI Research Office staff to submit,
                validate, and track research outputs in compliance with DOST
                reporting standards.
              </p>
            </div>

            <div className="mt-auto pt-14">
              <div className="flex gap-10">
                <div className="text-left">
                  <p className="text-xl font-semibold text-white">
                    {stats.submissions != null ? stats.submissions : '—'}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/50">
                    Submissions
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-semibold text-white">
                    {stats.institutions != null ? stats.institutions : '—'}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/50">
                    Institutions
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-semibold text-white">Active</p>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/50">
                    AY 2025–2026
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <button
                  type="button"
                  className="h-11 w-full rounded-md border border-white/80 bg-transparent px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => navigate('/register')}
                >
                  Register now
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-white px-10 py-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            {error ? (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {successMessage}
              </div>
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400">
              Secure Access
            </p>
            <h2
              className="mt-2 text-[34px] font-bold leading-tight tracking-tight text-[#0d1f3c]"
              style={{ fontFamily: "'Libre Baskerville', serif" }}
            >
              Sign In to Your Account
            </h2>
            <p className="mt-2 text-[13px] text-gray-500">
              Enter your institutional credentials to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-[11px] font-medium uppercase tracking-widest text-gray-500"
                >
                  Institutional Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-[6px] border border-[#d1d5db] bg-white px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#0d1f3c] focus:ring-2 focus:ring-[#0d1f3c]/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-[11px] font-medium uppercase tracking-widest text-gray-500"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#0d1f3c] hover:underline"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-[6px] border border-[#d1d5db] bg-white px-4 py-3 pr-11 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#0d1f3c] focus:ring-2 focus:ring-[#0d1f3c]/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isSubmitting}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#0d1f3c] focus:ring-[#0d1f3c]/20"
                  disabled={isSubmitting}
                />
                <label htmlFor="rememberMe" className="text-[13px] text-gray-500">
                  remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-[6px] bg-[#0d1f3c] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b1a33] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Signing In…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-10 border-t border-gray-200 pt-8 text-center">
              <p className="text-[13px] text-gray-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-[#0d1f3c] hover:underline"
                  onClick={() => navigate('/register')}
                >
                  Register your institution
                </button>
              </p>
            </div>

            <div className="mt-10 border-t border-gray-200 pt-6">
              <p className="text-center text-[11px] text-gray-400">
                © {copyrightYear} Department of Science and Technology. All
                rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showForgotModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
            <h3
              className="text-xl font-bold text-[#0d1f3c]"
              style={{ fontFamily: "'Libre Baskerville', serif" }}
            >
              Reset your password
            </h3>
            <p className="mt-2 text-[13px] text-gray-500">
              Enter your institutional email and we&apos;ll send you a reset link.
            </p>

            {forgotMessage ? (
              <div
                className={`mt-4 rounded-md border px-4 py-3 text-sm ${
                  forgotStatus === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {forgotMessage}
              </div>
            ) : null}

            {forgotStatus !== 'success' ? (
              <form onSubmit={handleForgotPassword} className="mt-6 flex flex-col gap-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  disabled={forgotSubmitting}
                  className="w-full rounded-[6px] border border-[#d1d5db] bg-white px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#0d1f3c] focus:ring-2 focus:ring-[#0d1f3c]/15"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    disabled={forgotSubmitting}
                    className="h-11 flex-1 rounded-[6px] border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="h-11 flex-1 rounded-[6px] bg-[#0d1f3c] text-sm font-semibold text-white hover:bg-[#0b1a33] disabled:opacity-70"
                  >
                    {forgotSubmitting ? 'Sending…' : 'Send reset link'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={closeForgotModal}
                className="mt-6 h-11 w-full rounded-[6px] bg-[#0d1f3c] text-sm font-semibold text-white hover:bg-[#0b1a33]"
              >
                Close
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}