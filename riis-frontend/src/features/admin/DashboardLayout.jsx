import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileSearch,
  FileText,
  FolderKanban,
  Users,
} from 'lucide-react'
import '@fontsource/libre-baskerville'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import dostLogo from '../../assets/dost-logo.png'

const defaultNavItems = [
  { icon: BarChart3, label: 'Analytics Dashboard' },
  { icon: ClipboardList, label: 'Submission Portal' },
  { icon: FileSearch, label: 'Auto Validation' },
  { icon: AlertTriangle, label: 'Overlap Alerts' },
  { icon: FileText, label: 'Report Generator' },
  { icon: FolderKanban, label: 'HEI Management' },
  { icon: Users, label: 'USER Management' },
]

function SidebarItem({ icon: Icon, label, to, active = false }) {
  const baseClass =
    'flex w-full items-center gap-3 rounded-[6px] border-l-4 py-[10px] pl-4 pr-4 text-left text-[13px] font-semibold transition'
  const activeClass =
    'border-[#C9A84C] bg-[rgba(28,63,110,0.55)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
  const inactiveClass =
    'border-transparent text-white/80 hover:bg-[rgba(28,63,110,0.35)] hover:text-white'

  if (to) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `${baseClass} ${(isActive || active) ? activeClass : inactiveClass}`
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </NavLink>
    )
  }

  return (
    <button
      type="button"
      className={`${baseClass} ${active ? activeClass : inactiveClass}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  )
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function toRoleLabel(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  return raw
    .replace(/^ROLE_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractRole(payload) {
  const direct = payload?.role || payload?.userRole || payload?.type || ''
  if (direct) return direct

  const roles = Array.isArray(payload?.roles) ? payload.roles : null
  if (roles?.length) return roles[0]

  const authorities = Array.isArray(payload?.authorities) ? payload.authorities : null
  if (authorities?.length) return authorities[0]

  const scope = payload?.scope || payload?.scopes || ''
  if (typeof scope === 'string' && scope.includes('ROLE_')) {
    const match = scope.split(/\s+/).find((s) => s.startsWith('ROLE_'))
    return match || ''
  }

  return ''
}

function extractInstitution(payload) {
  return (
    payload?.institutionName ||
    payload?.institution ||
    payload?.organization ||
    payload?.org ||
    payload?.school ||
    payload?.schoolName ||
    payload?.heiName ||
    payload?.hei ||
    ''
  )
}

export default function DashboardLayout({
  children,
  activeLabel = 'Analytics Dashboard',
  userName = 'DOST Administrator',
  organization = 'DOST Region VII',
  navItems = defaultNavItems,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHeiRoute = (location?.pathname || '').startsWith('/hei/')
  const token = localStorage.getItem('token') || ''
  const tokenPayload = decodeJwtPayload(token)

  const storedInstitution =
    localStorage.getItem('institutionName') ||
    localStorage.getItem('userInstitution') ||
    ''
  const storedRole = localStorage.getItem('userRole') || ''

  const heiInstitution =
    storedInstitution || extractInstitution(tokenPayload) || organization || 'Higher Education Institution'
  const heiRoleRaw = storedRole || extractRole(tokenPayload) || userName || 'HEI Research User'
  const heiRole = toRoleLabel(heiRoleRaw) || heiRoleRaw

  const displayUserName = isHeiRoute ? heiInstitution : userName
  const displayOrganization = isHeiRoute ? heiRole : organization

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('institutionName')
    localStorage.removeItem('userInstitution')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans text-[#1A1A2E]">
      <aside
        className="hidden h-screen w-[240px] shrink-0 bg-[#0D1B2A] px-5 py-5 lg:flex lg:flex-col"
        style={
          isHeiRoute
            ? {
                backgroundImage:
                  "linear-gradient(rgba(13, 31, 60, 0.85), rgba(13, 31, 60, 0.85)), url('/DOST_Building.png')",
                backgroundSize: 'cover',
                backgroundPosition: '50% 30%',
              }
            : undefined
        }
      >
        <div className="flex items-center gap-3">
          <img
            src={dostLogo}
            alt=""
            className="h-9 w-9 object-contain opacity-95"
          />
          <div className="leading-tight">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#C9A84C]">
              DASIG
            </p>
            <h1 className="mt-0.5 text-[14px] font-bold text-white">
              DOST Region VII
            </h1>
          </div>
        </div>

        <div className="mt-5 rounded-[10px] border border-white/10 bg-black/15 p-4">
          <p className="text-[11px] text-white/55">Logged in as</p>
          <p className="mt-2 text-[13px] font-bold text-white">{displayUserName}</p>
          <p className="mt-1 text-[11px] text-white/70">{displayOrganization}</p>
        </div>

        <div className="my-5 h-px bg-[#C9A84C]/70" />

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              to={item.to}
              active={item.label === activeLabel}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-between rounded-[8px] px-3 py-3 text-sm font-semibold text-[#C9A84C] transition hover:bg-[rgba(28,63,110,0.35)]"
          >
            <span>Sign Out</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F4F6F9] flex flex-col">
        <div className="flex-1 p-[32px]">
          {children}
        </div>
        <footer className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-[#1A1A2E]">DASIG</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer">Technical Support</span>
            <span className="text-[#C9A84C] font-semibold">DOST</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
