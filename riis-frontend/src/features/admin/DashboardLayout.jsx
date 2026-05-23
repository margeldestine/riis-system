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
import { NavLink, useNavigate } from 'react-router-dom'

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
    'flex w-full items-center gap-3 border-l-4 py-[10px] pl-4 pr-4 text-left text-sm font-medium transition'
  const activeClass = 'border-[#C9A84C] bg-white/5 text-white'
  const inactiveClass =
    'border-transparent text-[#8899AA] hover:bg-white/5 hover:text-white'

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

export default function DashboardLayout({
  children,
  activeLabel = 'Analytics Dashboard',
  userName = 'DOST Administrator',
  organization = 'DOST Region VII',
  navItems = defaultNavItems,
}) {
  const navigate = useNavigate()

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
      <aside className="hidden h-screen w-[240px] shrink-0 bg-[#0D1B2A] px-5 py-5 lg:flex lg:flex-col">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#C9A84C]">
            DASIG
          </p>
          <h1 className="mt-1 text-lg font-bold text-white">
            DOST Region VII
          </h1>
        </div>

        <div className="mt-5 rounded-md bg-slate-800/50 p-3">
          <p className="text-[11px] text-slate-400">Logged in as</p>
          <p className="mt-2 text-sm font-bold text-white">{userName}</p>
          <p className="mt-1 text-xs text-slate-300">{organization}</p>
        </div>

        <div className="my-4 border-t border-[#C9A84C]/70" />

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
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-[#C9A84C] transition hover:bg-white/5"
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
