import ProtectedRoute from './components/ProtectedRoute'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './features/auth/Login'
import Register from './features/auth/Register'
import DostDashboard from './features/admin/DostDashboard'
import DiscoveryPortalPage from './features/public/DiscoveryPortalPage'
import PendingSubmissionsPage from './features/admin/PendingSubmissionsPage'
import AccountApprovalQueue from './features/admin/AccountApprovalQueuePage'
import HeiDashboard, { HeiSubmissionPortalPage } from './features/hei/HeiDashboard'
import SubmissionHistory from './features/hei/SubmissionHistory'
import DashboardLayout from './features/admin/DashboardLayout'
import { heiNavItems } from './features/hei/HeiDashboard'
import HeiResearchProfiles from './features/hei/HeiResearchProfiles'
import InstitutionProfilePage from './features/hei/InstitutionProfilePage'
import HeiManagementPage from './features/admin/HeiManagementPage'
import HeiDirectoryPage from './features/public/HeiDirectoryPage'
import PublicInstitutionProfilePage from './features/public/PublicInstitutionProfilePage'
import ResearchOutputDetailPage from './features/public/ResearchOutputDetailPage'
import DataQualityDashboard from './features/admin/DataQualityDashboard'
import ReportGeneratorPage from './features/admin/ReportGeneratorPage'
import HeiReportsPage from './features/hei/HeiReportsPage'

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

function HeiDiscoveryPage() {
  return (
    <DashboardLayout
      activeLabel="Browse Research"
      userName="HEI Research User"
      organization="Higher Education Institution"
      navItems={heiNavItems}
    >
      <DiscoveryPortalPage embedded />
    </DashboardLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<DiscoveryPortalPage />} />
        <Route path="/discover" element={<HeiDirectoryPage />} />
        <Route path="/institutions/:id" element={<PublicInstitutionProfilePage />} />
        <Route path="/research/:id" element={<ResearchOutputDetailPage />} />

        {/* DOST Admin routes */}
        <Route path="/dost/dashboard" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><DostDashboard /></ProtectedRoute>
        } />
        <Route path="/dost/submissions" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><PendingSubmissionsPage /></ProtectedRoute>
        } />
        <Route path="/dost/user-management" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><AccountApprovalQueue /></ProtectedRoute>
        } />
        <Route path="/dost/hei-management" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><HeiManagementPage /></ProtectedRoute>
        } />
        <Route path="/dost/reports" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><ReportGeneratorPage /></ProtectedRoute>
        } />
        <Route path="/dost/validation" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><DataQualityDashboard /></ProtectedRoute>
        } />
        <Route path="/dost/overlap-alerts" element={
          <ProtectedRoute allowedRole="DOST_ADMIN"><DataQualityDashboard /></ProtectedRoute>
        } />

        {/* HEI routes */}
        <Route path="/hei/dashboard" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><HeiDashboard /></ProtectedRoute>
        } />
        <Route path="/hei/submission-portal" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><HeiSubmissionPortalPage /></ProtectedRoute>
        } />
        <Route path="/hei/submission-history" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><SubmissionHistory /></ProtectedRoute>
        } />
        <Route path="/hei/reports" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><HeiReportsPage /></ProtectedRoute>
        } />
        <Route path="/hei/research-profiles" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><HeiResearchProfiles /></ProtectedRoute>
        } />
        <Route path="/hei/institutions/:id" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><InstitutionProfilePage /></ProtectedRoute>
        } />
        <Route path="/hei/browse-research" element={
          <ProtectedRoute allowedRole="HEI_STAFF"><HeiDiscoveryPage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App