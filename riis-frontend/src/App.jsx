import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './features/auth/Login'
import Register from './features/auth/Register'
import DostDashboard from './features/admin/DostDashboard'
import HeiDashboard, { HeiSubmissionPortalPage } from './features/hei/HeiDashboard'
import SubmissionHistory from './features/hei/SubmissionHistory'
import DashboardLayout from './features/admin/DashboardLayout'
import { heiNavItems } from './features/hei/HeiDashboard'
import HeiResearchProfiles from './features/hei/HeiResearchProfiles'
import InstitutionProfilePage from './features/hei/InstitutionProfilePage'

function HeiPlaceholderPage({ activeLabel, title }) {
  return (
    <DashboardLayout
      activeLabel={activeLabel}
      userName="HEI Research User"
      organization="Higher Education Institution"
      navItems={heiNavItems}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          DASHBOARD &gt; <span className="text-[#C9A84C]">{title.toUpperCase()}</span>
        </p>
        <h1 className="mt-2 text-3xl font-serif text-[#1A1A2E]">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">This module is coming soon.</p>
      </div>
    </DashboardLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/hei/dashboard" element={<HeiDashboard />} />
        <Route path="/hei/submission-portal" element={<HeiSubmissionPortalPage />} />
        <Route path="/hei/submission-history" element={<SubmissionHistory />} />
        <Route
          path="/hei/research-profiles"
          element={<HeiResearchProfiles />}
        />
        <Route
          path="/hei/institutions/:id"
          element={<InstitutionProfilePage />}
        />
        <Route
          path="/hei/browse-research"
          element={<HeiPlaceholderPage activeLabel="Browse Research" title="Browse Research" />}
        />
        <Route
          path="/hei/reports"
          element={<HeiPlaceholderPage activeLabel="Reports" title="Reports" />}
        />
        <Route path="/dost/dashboard" element={<DostDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
