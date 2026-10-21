import { Link } from 'react-router-dom'

/** Footer shared by the public pages. Adds the Access Policy link. */
export default function PublicFooter({ className = '' }) {
  return (
    <footer
      className={`flex items-center justify-between border-t border-slate-200 bg-white px-8 py-4 text-xs text-slate-400 ${className}`}
    >
      <span className="font-semibold text-[#1A1A2E]">DASIG</span>
      <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-[#1A1A2E] hover:underline">
          About
        </Link>
        <Link to="/access-policy" className="hover:text-[#1A1A2E] hover:underline">
          Access Policy
        </Link>
        <span className="font-semibold text-[#C9A84C]">DOST</span>
      </div>
    </footer>
  )
}
