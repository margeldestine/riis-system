import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLogin from './pages/admin/AdminLogin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App