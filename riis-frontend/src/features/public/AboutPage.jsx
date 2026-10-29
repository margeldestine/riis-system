import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileUp,
  GraduationCap,
  Landmark,
  Link2,
  MapPin,
  ScanSearch,
  Search,
  ShieldCheck,
} from 'lucide-react'
import apiClient from '../../services/apiClient'
import PublicFooter from './PublicFooter'

// DRAFT WORDING: have DOST Region VII review this text before it is treated as official.
// It lists only what the system does today. No funding or support is promised.

const PROVINCES = ['Cebu', 'Bohol']

const HIGHLIGHTS = [
  { value: '2', label: 'Provinces covered', note: 'Cebu and Bohol are covered at present' },
  { value: '3', label: 'Visibility levels', note: 'Each institution chooses what the public sees' },
  { value: '0', label: 'Public PDF downloads', note: 'Full text stays with the publisher or the HEI' },
]

const BENEFITS = [
  {
    who: 'DOST Region VII',
    icon: Landmark,
    accent: '#0A2A66',
    tint: 'rgba(18, 59, 114, 0.08)',
    points: [
      'One regional view of research outputs across HEIs, by province, type and year.',
      'Reports and analytics for S&T planning, with an audit log of administrative actions.',
      'A participation view that shows which HEIs have started submitting and which have not.',
    ],
  },
  {
    who: 'Higher education institutions',
    icon: GraduationCap,
    accent: '#1a6e3c',
    tint: 'rgba(26, 110, 60, 0.08)',
    points: [
      'A public institutional profile that makes your research easier to find, including for smaller HEIs.',
      'You choose how much of each record is shown: Public, Metadata only or Restricted.',
      'Upload a PDF and DASIG pre-fills the submission form. HEI staff review the details before submitting.',
      'Reports on your own submissions, and an inbox for full-text requests that you answer yourself.',
    ],
  },
  {
    who: 'Researchers and the public',
    icon: Search,
    accent: '#B8932F',
    tint: 'rgba(201, 168, 76, 0.14)',
    points: [
      'One place to search locally produced Region VII research that is hard to find elsewhere.',
      'Search by topic, institution, year and type.',
      'A clear route to the full text: a link to the publisher, or a request to the owning institution.',
    ],
  },
]

const STEPS = [
  {
    icon: FileUp,
    title: 'Institutions submit',
    text: 'Whitelisted HEIs upload a paper. DASIG reads the PDF and pre-fills the details, and the officer checks them before sending.',
  },
  {
    icon: ScanSearch,
    title: 'Records are checked',
    text: 'Format and completeness checks run automatically. Similarity flags and quality reviews help DOST spot overlaps and gaps.',
  },
  {
    icon: BookOpen,
    title: 'The public discovers',
    text: 'Records appear in search at the level the institution chose, with a clear way to reach the full text.',
  },
]

const ANIMATION_CSS = `
@keyframes about-rise {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.about-rise { animation: about-rise 0.6s ease-out both; }
.about-delay-1 { animation-delay: 0.08s; }
.about-delay-2 { animation-delay: 0.16s; }
.about-delay-3 { animation-delay: 0.24s; }
@media (prefers-reduced-motion: reduce) {
  .about-rise { animation: none; }
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

export default function AboutPage() {
  const navigate = useNavigate()
  const [submissionModel, setSubmissionModel] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/public/submission-model')
      .then((response) => {
        if (!cancelled) setSubmissionModel(response?.data?.label || null)
      })
      .catch(() => {
        // The page reads fine without this line, so a failure is silent.
      })
    return () => {
      cancelled = true
    }
  }, [])

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
          <button type="button" className="border-b-2 border-[#1A1A2E] pb-0.5 text-sm font-semibold text-[#1A1A2E]">
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

      {/* Hero: DOST building photo under the same faded blue wash as the directory page */}
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
          <p className="about-rise text-[11px] font-bold uppercase tracking-[0.26em] text-[#F5C518]">
            DOST Region VII
          </p>
          <h1
            className="about-rise about-delay-1 mt-3 text-4xl leading-tight text-white md:text-5xl"
            style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
          >
            About DASIG
          </h1>
          <p
            className="about-rise about-delay-2 mx-auto mt-4 max-w-xl text-sm md:text-base"
            style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.75 }}
          >
            A local organizer of Region VII research, built to sit alongside the indexes you already use.
          </p>

          <div className="about-rise about-delay-3 mt-7 flex flex-wrap items-center justify-center gap-2">
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
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_8px_24px_rgba(15,40,90,0.10)]"
            >
              <p
                className="text-4xl text-[#0A2A66]"
                style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
              >
                {item.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0A2A66]">{item.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-16 px-6 py-14">
        {/* What DASIG is + Scopus positioning */}
        <section>
          <SectionHeading eyebrow="Our place in the research landscape" title="A local layer, not a competitor">
            DASIG is the research information system of DOST Region VII. It brings together research outputs from
            higher education institutions so that locally produced studies are organized, searchable and visible
            in one place.
          </SectionHeading>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: 'rgba(10, 42, 102, 0.08)' }}
              >
                <Link2 className="h-5 w-5 text-[#0A2A66]" />
              </div>
              <h3 className="text-base font-semibold text-[#0A2A66]">Scopus and other indexes stay as they are</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                DASIG complements Scopus and similar indexes. It does not replace them and it does not compete with
                them. Papers published in indexed journals stay where they are, and DASIG links out to the publisher
                for the full text.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: 'rgba(201, 168, 76, 0.16)' }}
              >
                <Building2 className="h-5 w-5 text-[#B8932F]" />
              </div>
              <h3 className="text-base font-semibold text-[#0A2A66]">What DASIG adds is the local layer</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Region VII studies, including theses, technical reports and institutional outputs that are hard to
                find in international indexes, organized by institution, province and theme. DASIG does not host or
                sell full-text papers.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section>
          <SectionHeading eyebrow="Who benefits" title="What each group gets" />
          <div className="grid gap-5 md:grid-cols-3">
            {BENEFITS.map((group) => {
              const Icon = group.icon
              return (
                <div
                  key={group.who}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-1.5" style={{ background: group.accent }} />
                  <div className="p-6">
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: group.tint }}
                    >
                      <Icon className="h-5 w-5" style={{ color: group.accent }} />
                    </div>
                    <h3 className="text-base font-semibold text-[#0A2A66]">{group.who}</h3>
                    <ul className="mt-3 space-y-2.5">
                      {group.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: group.accent }}
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* How it works */}
        <section>
          <SectionHeading eyebrow="How it works" title="From submission to discovery" />
          <div className="relative grid gap-5 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-[#F5C518]/50 md:block" />
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative text-center">
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0A2A66] shadow-md ring-4 ring-[#F5F7FB]">
                    <Icon className="h-6 w-6 text-[#F5C518]" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-bold text-[#0A2A66]">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#0A2A66]">{step.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{step.text}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Who submits + calls to action */}
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
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
              <ShieldCheck className="h-6 w-6 text-[#F5C518]" />
            </div>
            <h2
              className="text-2xl text-white md:text-3xl"
              style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
            >
              Who submits
            </h2>
            <p className="mt-3 text-sm leading-relaxed md:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Only whitelisted institutions with approved accounts can submit to DASIG.
            </p>
            {submissionModel && (
              <p
                className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)' }}
              >
                <span className="h-2 w-2 rounded-full bg-[#F5C518]" />
                Submission is currently recorded as {submissionModel}
              </p>
            )}

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
                onClick={() => navigate('/access-policy')}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.35)' }}
              >
                Read the access policy
              </button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
