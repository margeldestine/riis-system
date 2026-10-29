import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  FileLock2,
  Globe2,
  History,
  Lock,
  Mail,
  Minus,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import PublicFooter from './PublicFooter'

// DRAFT WORDING: have DOST Region VII review this text (and the CHED public-posting
// question) before it is treated as the official access policy.

const PROVINCES = ['Cebu', 'Bohol']

// Values and colors match accessTiers.js (Public green, Metadata only amber, Restricted slate).
const TIERS = [
  {
    key: 'PUBLIC',
    name: 'Public',
    icon: Globe2,
    accent: '#1a6e3c',
    tint: 'rgba(26, 110, 60, 0.08)',
    badge: 'bg-emerald-100 text-emerald-700',
    summary: 'The full public record, including the abstract.',
  },
  {
    key: 'METADATA_ONLY',
    name: 'Metadata only',
    icon: Eye,
    accent: '#B8932F',
    tint: 'rgba(201, 168, 76, 0.14)',
    badge: 'bg-amber-100 text-amber-700',
    summary: 'Descriptive details are shown. The abstract is withheld.',
  },
  {
    key: 'RESTRICTED',
    name: 'Restricted',
    icon: EyeOff,
    accent: '#0A2A66',
    tint: 'rgba(18, 59, 114, 0.08)',
    badge: 'bg-slate-200 text-slate-700',
    summary: 'Only the title and the institution are shown.',
  },
]

// [field, PUBLIC, METADATA_ONLY, RESTRICTED]
const MATRIX = [
  ['Title and institution', true, true, true],
  ['Authors, year, type, funding, venue, keywords, DOI', true, true, false],
  ['Abstract', true, false, false],
]

const FULL_TEXT_PATHS = [
  {
    icon: ExternalLink,
    accent: '#0A2A66',
    tint: 'rgba(18, 59, 114, 0.08)',
    title: 'Link to the publisher',
    when: 'The record has a DOI and is Public or Metadata only.',
    text: 'The Full text button opens the publisher’s own page, so DASIG never duplicates paid or indexed sources.',
  },
  {
    icon: Mail,
    accent: '#B8932F',
    tint: 'rgba(201, 168, 76, 0.16)',
    title: 'Request full text',
    when: 'There is no DOI, or the record is Restricted.',
    text: 'Your message goes to the research office of the institution that owns the record. It decides whether to share the paper and replies to you by email.',
  },
]

const PRIVACY = [
  {
    icon: Mail,
    accent: '#0A2A66',
    tint: 'rgba(18, 59, 114, 0.08)',
    title: 'Your details stay narrow',
    text: 'Your name, email and reason are used only to route your request to the research office and to send you a confirmation.',
  },
  {
    icon: History,
    accent: '#1a6e3c',
    tint: 'rgba(26, 110, 60, 0.08)',
    title: 'Changes are logged',
    text: 'Changes to a record’s visibility, or to an institution’s default, are written to an audit log.',
  },
  {
    icon: Lock,
    accent: '#B8932F',
    tint: 'rgba(201, 168, 76, 0.14)',
    title: 'Hidden stays hidden',
    text: 'Hidden fields are never sent to your browser and are not used in search. Searching for words from a withheld abstract will not find the record.',
  },
]

const ANIMATION_CSS = `
@keyframes policy-rise {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.policy-rise { animation: policy-rise 0.6s ease-out both; }
.policy-delay-1 { animation-delay: 0.08s; }
.policy-delay-2 { animation-delay: 0.16s; }
.policy-delay-3 { animation-delay: 0.24s; }
@media (prefers-reduced-motion: reduce) {
  .policy-rise { animation: none; }
}
`

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1E5FC4]">{eyebrow}</p>
      <h2
        className="mt-2 text-2xl text-[#0A2A66] md:text-3xl"
        style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
      >
        {title}
      </h2>
      {children && <p className="mt-3 text-sm leading-relaxed text-slate-500">{children}</p>}
    </div>
  )
}

export default function AccessPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{ANIMATION_CSS}</style>

      {/* Nav, same as the other public pages */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A2E]">
            <span className="text-xs font-bold text-[#C9A84C]">D</span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Republic of the Philippines
            </p>
            <p className="text-xs font-bold text-[#1A1A2E]">DASIG Research Information System</p>
          </div>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-[#1A1A2E]">
            Browse Research
          </button>
          <button type="button" onClick={() => navigate('/discover')} className="text-sm text-slate-500 hover:text-[#1A1A2E]">
            HEI Directory
          </button>
          <button type="button" onClick={() => navigate('/about')} className="text-sm text-slate-500 hover:text-[#1A1A2E]">
            About
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/login')} className="text-sm font-semibold text-[#1A1A2E] hover:text-slate-600">
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
      </nav>

      {/* Hero: DOST building photo under the same faded blue wash */}
      <header className="relative overflow-hidden pb-24 pt-16 text-center md:pb-28 md:pt-20" style={{ background: '#1a3a6b' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/DOST_Building.png)',
            backgroundSize: 'cover',
            backgroundPosition: '50% 30%',
            opacity: 0.25,
            mixBlendMode: 'luminosity',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(15, 40, 90, 0.72)' }} />
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#F5C518]" />

        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <p className="policy-rise text-[11px] font-bold uppercase tracking-[0.26em] text-[#F5C518]">DOST Region VII</p>
          <h1
            className="policy-rise policy-delay-1 mt-3 text-4xl leading-tight text-white md:text-5xl"
            style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
          >
            Access Policy
          </h1>
          <p
            className="policy-rise policy-delay-2 mx-auto mt-4 max-w-xl text-sm md:text-base"
            style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.75 }}
          >
            How DASIG shows Region VII research outputs, and how to get the full text.
          </p>
          <div className="policy-rise policy-delay-3 mt-7 flex flex-wrap items-center justify-center gap-2">
            {PROVINCES.map((province) => (
              <span
                key={province}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)' }}
              >
                <MapPin className="h-3.5 w-3.5 text-[#F5C518]" />
                {province}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Highlight cards overlapping the hero */}
      <section className="relative z-10 mx-auto -mt-14 w-full max-w-5xl px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { value: '3', label: 'Visibility levels', note: 'Chosen by each institution' },
            { value: '2', label: 'Ways to get full text', note: 'A publisher link, or a request to the HEI' },
            { value: '0', label: 'Public PDF downloads', note: 'Full text stays with the publisher or the HEI' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_8px_24px_rgba(15,40,90,0.10)]"
            >
              <p className="text-4xl text-[#0A2A66]" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
                {item.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0A2A66]">{item.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-16 px-6 py-14">
        {/* What DASIG is */}
        <section>
          <SectionHeading eyebrow="What DASIG is" title="A regional research database">
            DASIG is the research database of DOST Region VII. It keeps records of research outputs from higher
            education institutions (HEIs) so they are easier to find. It complements publishers and indexes such as
            Scopus and is not a replacement for them. It does not host or sell full-text papers.
          </SectionHeading>
        </section>

        {/* Visibility levels */}
        <section>
          <SectionHeading eyebrow="Visibility levels" title="What the public sees">
            Each institution decides how much of its research is shown. When an HEI submits a record, it picks one of
            three levels. The choice is stored with that record, so changing an institution’s default later does not
            change records that already exist.
          </SectionHeading>

          <div className="grid gap-5 md:grid-cols-3">
            {TIERS.map((tier, tierIndex) => {
              const Icon = tier.icon
              return (
                <div key={tier.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-1.5" style={{ background: tier.accent }} />
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: tier.tint }}
                      >
                        <Icon className="h-5 w-5" style={{ color: tier.accent }} />
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tier.badge}`}>
                        {tier.name}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600">{tier.summary}</p>

                    <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                      {MATRIX.map(([field, ...cells]) => {
                        const on = cells[tierIndex]
                        return (
                          <li key={field} className="flex items-start gap-2.5 text-sm">
                            {on ? (
                              <span
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                style={{ background: tier.tint, color: tier.accent }}
                              >
                                <Check className="h-3 w-3" />
                                <span className="sr-only">Shown:</span>
                              </span>
                            ) : (
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                                <Minus className="h-3 w-3" />
                                <span className="sr-only">Not shown:</span>
                              </span>
                            )}
                            <span className={on ? 'text-[#0A2A66]' : 'text-slate-400'}>{field}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="mt-6 flex items-start gap-3 rounded-2xl border px-5 py-4"
            style={{ background: 'rgba(201, 168, 76, 0.12)', borderColor: 'rgba(201, 168, 76, 0.4)' }}
          >
            <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-[#B8932F]" />
            <p className="text-sm leading-relaxed text-[#0A2A66]">
              <span className="font-semibold">The uploaded PDF is never shown</span>, at any level. Full text comes from
              the publisher or from the institution.
            </p>
          </div>
        </section>

        {/* Getting the full text */}
        <section>
          <SectionHeading eyebrow="Full text" title="Getting the full text">
            Every record has a “Full text” option. Which one you get depends on the record.
          </SectionHeading>

          <div className="grid gap-5 md:grid-cols-2">
            {FULL_TEXT_PATHS.map((path) => {
              const Icon = path.icon
              return (
                <div key={path.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-1.5" style={{ background: path.accent }} />
                  <div className="p-6">
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: path.tint }}
                    >
                      <Icon className="h-5 w-5" style={{ color: path.accent }} />
                    </div>
                    <h3 className="text-base font-semibold text-[#0A2A66]">{path.title}</h3>
                    <p className="mt-1 text-xs font-semibold" style={{ color: path.accent }}>
                      {path.when}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{path.text}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
            DASIG never attaches or serves the PDF. Please give a short reason for your request, and expect that some
            requests may be declined.
          </p>
        </section>

        {/* Privacy and accountability */}
        <section>
          <SectionHeading eyebrow="Privacy and accountability" title="How your information is handled" />
          <div className="grid gap-5 md:grid-cols-3">
            {PRIVACY.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-1.5" style={{ background: item.accent }} />
                  <div className="p-6">
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: item.tint }}
                    >
                      <Icon className="h-5 w-5" style={{ color: item.accent }} />
                    </div>
                    <h3 className="text-base font-semibold text-[#0A2A66]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Questions + calls to action */}
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-12 text-center md:px-12"
          style={{ background: '#1a3a6b' }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/DOST_Building.png)',
              backgroundSize: 'cover',
              backgroundPosition: '50% 30%',
              opacity: 0.25,
              mixBlendMode: 'luminosity',
            }}
          />
          <div className="absolute inset-0" style={{ background: 'rgba(15, 40, 90, 0.72)' }} />

          <div className="relative z-10 mx-auto max-w-2xl">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)' }}
            >
              <ShieldCheck className="h-6 w-6 text-[#F5C518]" />
            </div>
            <h2
              className="text-2xl text-white md:text-3xl"
              style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
            >
              Questions
            </h2>
            <p className="mt-3 text-sm leading-relaxed md:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
              If you believe a record is shown at the wrong level, contact the owning institution’s research office or
              DOST Region VII.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ backgroundColor: '#1a6e3c' }}
              >
                Browse research
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.35)' }}
              >
                About DASIG
              </button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
