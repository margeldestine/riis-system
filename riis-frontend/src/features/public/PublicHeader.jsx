import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchPath } from './publicSearch'

const NAV_LINKS = [
  { label: 'Browse Research', to: '/' },
  { label: 'HEI Directory', to: '/discover' },
  { label: 'About', to: '/about' },
]

function NavLinks({ activeLabel, navigate, className }) {
  return (
    <div className={className}>
      {NAV_LINKS.map((link) =>
        link.label === activeLabel ? (
          <button
            key={link.label}
            type="button"
            aria-current="page"
            className="border-b-2 border-[#1A1A2E] pb-0.5 text-sm font-semibold text-[#1A1A2E]"
          >
            {link.label}
          </button>
        ) : (
          <button
            key={link.label}
            type="button"
            onClick={() => navigate(link.to)}
            className="text-sm text-slate-500 transition-colors hover:text-[#1A1A2E]"
          >
            {link.label}
          </button>
        ),
      )}
    </div>
  )
}

/**
 * The one top bar of every public page (requirement 4). It stays at the top while the page scrolls.
 *
 * search (optional): { value, onChange, onSubmit }. The Discovery page passes it so that this bar and the
 * big search box on that page are one and the same search. On every other page it is left out, and a search
 * opens the Discovery page with the query in the address.
 *
 * hideSearch (optional): hides the search bar in this header (used on the View Details page).
 * hideBrand (optional): hides the "Republic of the Philippines / DASIG Research Information System"
 * logo block (used on the View Details page).
 */
export default function PublicHeader({
  activeLabel = '',
  search,
  hideSearch = false,
  hideBrand = false,
}) {
  const navigate = useNavigate()
  // Center the page links whenever the logo or the search bar is hidden.
  const centerNav = hideSearch || hideBrand
  const [ownQuery, setOwnQuery] = useState('')
  const controlled = Boolean(search)
  const value = controlled ? search.value : ownQuery

  const handleSubmit = (event) => {
    event.preventDefault()
    if (controlled) {
      search.onSubmit()
    } else {
      navigate(searchPath(ownQuery))
    }
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className={centerNav ? 'contents md:flex md:flex-1 md:items-center md:gap-6' : 'contents'}>
        {!hideBrand && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left"
            aria-label="DASIG Research Information System, home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A2E]">
              <span className="text-xs font-bold text-[#C9A84C]">D</span>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Republic of the Philippines</p>
              <p className="text-xs font-bold text-[#1A1A2E]">DASIG Research Information System</p>
            </div>
          </button>
        )}

        {!hideSearch && (
          <form
            role="search"
            onSubmit={handleSubmit}
            className="order-last flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition focus-within:border-[#C9A84C] focus-within:ring-2 focus-within:ring-[#C9A84C]/40 md:order-none md:w-auto md:max-w-md md:flex-1"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <label htmlFor="public-header-search" className="sr-only">
              Search research
            </label>
            <input
              id="public-header-search"
              type="search"
              value={value}
              onChange={(event) => (controlled ? search.onChange(event.target.value) : setOwnQuery(event.target.value))}
              placeholder="Search title, author, keyword..."
              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-slate-800 placeholder:text-slate-400"
              style={{ border: 'none', outline: 'none' }}
            />
            <button
              type="submit"
              className="rounded-md bg-[#1A1A2E] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#11111f]"
            >
              Search
            </button>
          </form>
        )}
        </div>

        <NavLinks activeLabel={activeLabel} navigate={navigate} className="hidden items-center gap-6 md:flex" />

        <div className={`ml-auto flex items-center gap-3 ${centerNav ? 'md:flex-1 md:justify-end' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-[#1A1A2E] transition-colors hover:text-slate-600"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#11111f]"
          >
            Register
          </button>
        </div>

        {/* On a phone the three page links sit on their own row under the search bar. */}
        <NavLinks activeLabel={activeLabel} navigate={navigate} className="order-last flex w-full items-center gap-5 md:hidden" />
      </div>
    </nav>
  )
}