import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Input from '../../components/Input'
import apiClient from '../../services/apiClient'
import dostLogo from '../../assets/dost-logo.png'
import bgImage from '../../assets/register-background.png'

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

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const copyrightYear = useMemo(() => new Date().getFullYear(), [])

  useEffect(() => {
    const message = location.state?.successMessage
    if (!message) return
    setSuccessMessage(message)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

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

        const isDostRole = role.includes('DOST')
        const isHeiRole = role.includes('HEI')
        const isDostDomain = /(^|\.)dost\.gov\.ph$/.test(domain)
        const isHeiDomain =
          /(^|\.)edu(\.|$)/.test(domain) || /(^|\.)ac\.ph$/.test(domain)

        if (isDostRole || isDostDomain) {
          navigate('/dost/dashboard')
        } else if (isHeiRole || isHeiDomain) {
          navigate('/hei/submission-portal')
        } else {
          navigate('/hei/submission-portal')
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

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="mx-auto grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <section className="relative flex flex-col justify-between overflow-hidden border-r-2 border-[#caa03b] bg-[#0d2847] p-10">
          <img
            src={bgImage}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="relative z-10 flex flex-col justify-between gap-12">
            <div className="flex items-center gap-4">
              <img
                src={dostLogo}
                alt="DOST Logo"
                className="h-10 w-10 object-contain"
              />
              <div className="leading-tight">
                <p className="text-xs font-medium uppercase tracking-widest text-white/90">
                  Republic of the Philippines
                </p>
                <p className="text-xs tracking-wide text-white/60">
                  DASIG Research Information System
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-6 h-px w-14 bg-white/20" />
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#e8a020]">
                DOST Research Information System
              </p>
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white">
                Higher Education
                <br />
                Institution Research
                <br />
                Submission Portal
              </h1>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
                A centralized platform for HEI Research Office staff to submit,
                validate, and track research outputs in compliance with DOST
                reporting standards.
              </p>

              <div className="mt-10 flex gap-10">
                <div>
                  <p className="text-2xl font-semibold text-white">0</p>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-white/50">
                    Submissions
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">0</p>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-white/50">
                    Institutions
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-emerald-400">
                    Active
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-white/50">
                    AY 2025–2026
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                className="h-12 w-full max-w-sm rounded-md bg-white/95 px-6 text-sm font-semibold text-[#0d2847] shadow-sm transition hover:bg-white"
                onClick={() => navigate('/register')}
              >
                Register now
              </button>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[#f8fafc] px-10 py-12 lg:px-16">
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
              Secure Access
            </p>
            <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-gray-900">
              Sign In to Your Account
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter your institutional credentials to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
              <Input
                id="email"
                name="email"
                label="Institutional Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                autoComplete="email"
                required
                disabled={isSubmitting}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium uppercase tracking-widest text-gray-500"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-[#0b2a53] hover:underline"
                    onClick={() => {}}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#1a5fa8] focus:ring-2 focus:ring-[#1a5fa8]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#0b2a53] focus:ring-[#0b2a53]/20"
                  disabled={isSubmitting}
                />
                <label htmlFor="rememberMe" className="text-sm text-gray-500">
                  remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-md bg-[#0b2a53] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#092345] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Signing In…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-10 border-t border-gray-200 pt-8 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-[#0b2a53] hover:underline"
                  onClick={() => navigate('/register')}
                >
                  Register your institution
                </button>
              </p>
            </div>

            <div className="mt-10 border-t border-gray-200 pt-6">
              <p className="text-center text-xs text-gray-400">
                © {copyrightYear} Department of Science and Technology. All
                rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
