import { useState } from "react"
import dostLogo from "../../assets/dost-logo.png"
import bgImage from "../../assets/register-background.png"

function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    console.log("Login:", email, password)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="w-5/12 flex flex-col justify-between p-10 relative overflow-hidden" style={{background:"#0d2847"}}>
        <img src={bgImage} alt="DOST Building" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <img src={dostLogo} alt="DOST Logo" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-white text-xs font-medium">Republic of the Philippines</p>
              <p className="text-xs" style={{color:"#a8c4e0"}}>Department of Science and Technology</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs tracking-widest uppercase" style={{color:"#e8a020"}}>DOST Research Information System</p>
            <h1 className="text-3xl font-medium text-white leading-snug"
              style={{fontFamily:"'Libre Baskerville', serif"}}>
              Admin Portal
            </h1>
            <p className="text-sm leading-relaxed" style={{color:"#8aafc8"}}>
              Manage and oversee all HEI research submissions across DOST Region VII.
            </p>
            <div className="flex gap-8 mt-2">
              <div>
                <p className="text-xl font-medium text-white">0</p>
                <p className="text-xs uppercase tracking-wide" style={{color:"#8aafc8"}}>Submissions</p>
              </div>
              <div>
                <p className="text-xl font-medium text-white">0</p>
                <p className="text-xs uppercase tracking-wide" style={{color:"#8aafc8"}}>Institutions</p>
              </div>
              <div>
                <p className="text-xl font-medium" style={{color:"#4ade80"}}>Active</p>
                <p className="text-xs uppercase tracking-wide" style={{color:"#8aafc8"}}>AY 2025–2026</p>
              </div>
            </div>
          </div>

          <p className="text-xs" style={{color:"#8aafc8"}}>© 2026 Department of Science and Technology</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{background:"#eef4ff", color:"#1a5fa8", border:"1px solid #c7d9f5"}}> Admin Access Only
          </div>

          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Secure Access</p>
          <h2 className="mb-1" style={{fontFamily:"'Libre Baskerville', serif", fontSize:"28px", fontWeight:"700", color:"#1a1a2e"}}>
            Sign In to Admin Portal
          </h2>
          <p className="text-sm text-gray-400 mb-8">Enter your DOST administrator credentials to continue.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400 font-medium block mb-1.5">
                Admin Email Address
              </label>
              <input
                type="email"
                placeholder="admin@dost7.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs uppercase tracking-wide text-gray-400 font-medium">Password</label>
                <a href="#" className="text-xs" style={{color:"#1a5fa8"}}>Forgot password?</a>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" className="checkbox checkbox-sm"
                checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="text-sm text-gray-500">Remember me</span>
            </div>

            <button type="submit" className="btn w-full text-white mt-2"
              style={{background:"#0d2847", border:"none"}}>
              Sign In
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-6 pt-6 border-t border-gray-100">
            Restricted to authorized DOST personnel only
          </p>
          <p className="text-xs text-center text-gray-400 mt-4">
            © 2026 Department of Science and Technology. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin