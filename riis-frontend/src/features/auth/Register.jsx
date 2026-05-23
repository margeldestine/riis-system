import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronLeft } from 'lucide-react'
import Input from '../../components/Input'
import apiClient from '../../services/apiClient'
import dostLogo from '../../assets/dost-logo.png'
import bgImage from '../../assets/register-background.png'

function extractApiErrorMessage(error) {
  const data = error?.response?.data
  if (!data) return error?.message || 'Request failed.'
  if (typeof data === 'string') return data

  return (
    data.message ||
    data.detail ||
    data.error ||
    data.title ||
    'Request failed.'
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedInstitution, setSelectedInstitution] = useState(null)
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionOpen, setInstitutionOpen] = useState(false)
  const [institutions, setInstitutions] = useState([])
  const [institutionsStatus, setInstitutionsStatus] = useState('idle')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const institutionRef = useRef(null)

  const copyrightYear = useMemo(() => new Date().getFullYear(), [])
  const filteredInstitutions = useMemo(() => {
    const q = institutionQuery.trim().toLowerCase()
    if (!q) return institutions

    return institutions.filter((item) => {
      const name = (item?.name || '').toLowerCase()
      const domain = (item?.emailDomain || '').toLowerCase()
      return name.includes(q) || domain.includes(q)
    })
  }, [institutionQuery, institutions])

  const institutionDisplayValue = selectedInstitution?.name || institutionQuery

  const selectInstitution = (item) => {
    setSelectedInstitution(item)
    setInstitutionQuery(item?.name || '')
    setInstitutionOpen(false)
  }

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    const fetchInstitutions = async () => {
      setInstitutionsStatus('loading')
      try {
        const res = await apiClient.get('/institutions/active', {
          signal: controller.signal,
        })
        const items = Array.isArray(res.data) ? res.data : []
        if (!isActive) return
        setInstitutions(items)
        setInstitutionsStatus('success')
      } catch (err) {
        if (!isActive) return
        setInstitutions([])
        setInstitutionsStatus('error')
        setError(extractApiErrorMessage(err))
      }
    }

    fetchInstitutions()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!institutionOpen) return

    const onMouseDown = (event) => {
      const el = institutionRef.current
      if (!el) return
      if (!el.contains(event.target)) setInstitutionOpen(false)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setInstitutionOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [institutionOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!accepted) {
      setError('Please certify the declaration to submit your request.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!selectedInstitution?.id) {
      setError('Please select your Higher Education Institution.')
      return
    }

    setIsSubmitting(true)

    try {
      const registrationPayload = {
        fullName,
        email,
        password,
        institutionId: selectedInstitution.id,
        employeeId,
        department,
        position,
      }

      const response = await apiClient.post('/auth/register', registrationPayload)

      if (response.status === 201) {
        navigate('/login', {
          state: {
            successMessage:
              'Registration submitted successfully. Please sign in to continue.',
          },
        })
        return
      }

      setError('Unable to submit registration. Please try again.')
    } catch (err) {
      setError(extractApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="mx-auto grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <section className="bg-[#f8fafc] px-10 py-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            {error ? (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Sign In
            </Link>

            <div className="mt-10 flex items-center gap-4">
              <img
                src={dostLogo}
                alt="DOST Logo"
                className="h-10 w-10 object-contain"
              />
              <div className="leading-tight">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
                  Republic of the Philippines
                </p>
                <p className="text-xs tracking-wide text-gray-400">
                  DASIG Research Information System
                </p>
              </div>
            </div>

            <div className="mt-10">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                Create Account
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Register as HEI Research Office Staff
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
              <Input
                id="fullName"
                name="fullName"
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                autoComplete="name"
                required
                disabled={isSubmitting}
              />

              <Input
                id="email"
                name="email"
                label="Institutional Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                autoComplete="email"
                required
                disabled={isSubmitting}
              />

              <div ref={institutionRef} className="relative flex flex-col gap-2">
                <label
                  htmlFor="institution"
                  className="text-xs font-medium uppercase tracking-widest text-gray-500"
                >
                  Higher Education Institution
                </label>
                <button
                  type="button"
                  className="relative h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-left text-sm text-gray-900 outline-none transition focus:border-[#1a5fa8] focus:ring-2 focus:ring-[#1a5fa8]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                  onClick={() =>
                    setInstitutionOpen((v) => {
                      const next = !v
                      if (next) {
                        setInstitutionQuery(
                          (prev) => selectedInstitution?.name || prev,
                        )
                      }
                      return next
                    })
                  }
                  disabled={isSubmitting}
                >
                  <span
                    className={
                      institutionDisplayValue
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }
                  >
                    {institutionDisplayValue || 'University'}
                  </span>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>

                {institutionOpen ? (
                  <div className="absolute left-0 right-0 top-[76px] z-20 rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="p-3">
                      <input
                        id="institution"
                        type="text"
                        value={institutionQuery}
                        onChange={(e) => {
                          setSelectedInstitution(null)
                          setInstitutionQuery(e.target.value)
                        }}
                        placeholder="Search HEI"
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1a5fa8] focus:ring-2 focus:ring-[#1a5fa8]/20"
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="max-h-56 overflow-auto py-2">
                      {institutionsStatus === 'loading' ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          Loading institutions…
                        </div>
                      ) : filteredInstitutions.length ? (
                        filteredInstitutions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectInstitution(item)
                            }}
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {item.name}
                            </span>
                            <span className="ml-3 shrink-0 text-xs text-gray-400">
                              {item.emailDomain}
                            </span>
                            {selectedInstitution?.id === item.id ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No matches found.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  id="department"
                  name="department"
                  label="Department / Office"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Research Office"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  id="position"
                  name="position"
                  label="Position / Designation"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Research Coordinator"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <Input
                id="employeeId"
                name="employeeId"
                label="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="ID Number"
                required
                disabled={isSubmitting}
              />

              <Input
                id="password"
                name="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />

              <Input
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />

              <div className="flex items-start gap-3">
                <input
                  id="accepted"
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0b2a53] focus:ring-[#0b2a53]/20"
                  disabled={isSubmitting}
                />
                <label htmlFor="accepted" className="text-xs text-gray-500">
                  By registering, I certify that I am an authorized
                  representative of the stated HEI and that all submitted
                  information is accurate and complete.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-md bg-[#0b2a53] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#092345] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Registration'}
              </button>

              <p className="pt-4 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#0b2a53] hover:underline"
                >
                  Sign in
                </Link>
              </p>

              <p className="pt-2 text-center text-xs text-gray-400">
                © {copyrightYear} Department of Science and Technology. All
                rights reserved.
              </p>
            </form>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[#0d2847] lg:block">
          <img
            src={bgImage}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d2847]/30 via-[#0d2847]/40 to-[#0d2847]/70" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-16">
            <img
              src="/favicon.svg"
              alt=""
              className="h-28 w-28 opacity-90"
            />
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Republic of the Philippines
            </p>
            <h2 className="mt-4 text-center text-4xl font-semibold leading-tight tracking-tight text-white">
              DASIG Research
              <br />
              Information System
            </h2>
            <div className="mt-6 h-px w-14 bg-[#caa03b]/70" />
            <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-white/60">
              Join the national research registry. Your institution&apos;s
              research outputs contribute to the Philippine science and
              technology landscape.
            </p>

            <div className="mt-10 flex w-full max-w-md flex-col gap-4">
              <div className="flex items-start gap-4 rounded-md bg-white/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#caa03b]" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Free institutional account
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Open to all DOST Region VII HEIs
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-md bg-white/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#caa03b]" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    DOST compliance reporting
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Standardized CHED–DOST form submission
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-md bg-white/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#caa03b]" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Instant validation and duplicate detection
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Auto-validation on every submission
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
