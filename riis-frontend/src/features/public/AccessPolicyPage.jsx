import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Minus } from 'lucide-react'
import PublicFooter from './PublicFooter'

// DRAFT WORDING: have DOST Region VII review this text (and the CHED public-posting
// question) before it is treated as the official access policy.

const TIERS = [
  {
    key: 'PUBLIC',
    name: 'Public',
    badge: 'bg-emerald-100 text-emerald-700',
    summary: 'The full public record, including the abstract.',
  },
  {
    key: 'METADATA_ONLY',
    name: 'Metadata only',
    badge: 'bg-amber-100 text-amber-700',
    summary: 'Descriptive details are shown. The abstract is withheld.',
  },
  {
    key: 'RESTRICTED',
    name: 'Restricted',
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

function Mark({ on }) {
  return on ? (
    <span className="inline-flex items-center gap-1 text-emerald-700">
      <Check className="h-4 w-4" />
      <span className="sr-only">Shown</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-300">
      <Minus className="h-4 w-4" />
      <span className="sr-only">Not shown</span>
    </span>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-3 text-lg font-serif text-[#1A1A2E]">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function AccessPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F9] font-sans">
      <div className="relative overflow-hidden" style={{ background: '#1a3a6b' }}>
        <div className="absolute inset-0" style={{ background: 'rgba(15, 40, 90, 0.72)' }} />
        <div className="relative z-10 w-full px-10 py-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-5 flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white/90"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <h1
            className="text-3xl leading-snug text-white"
            style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
          >
            Access Policy
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            How DASIG shows Region VII research outputs, and how to get the full text.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        <Section title="What DASIG is">
          <p>
            DASIG organizes research outputs from higher education institutions (HEIs) in DOST Region VII so they are
            easier to find. It complements publishers and indexes such as Scopus. It is not a replacement for them,
            and it does not host or sell full-text papers.
          </p>
        </Section>

        <Section title="Visibility levels">
          <p>
            Each institution decides how much of its research is shown publicly. When an HEI submits a record, it picks
            one of three levels. The choice is stored with that record, so changing an institution&apos;s default later
            does not change records that already exist.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    What the public sees
                  </th>
                  {TIERS.map((tier) => (
                    <th key={tier.key} className="px-3 py-2 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tier.badge}`}>
                        {tier.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map(([field, ...cells]) => (
                  <tr key={field} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 text-[#1A1A2E]">{field}</td>
                    {cells.map((on, i) => (
                      <td key={TIERS[i].key} className="px-3 py-2.5 text-center">
                        <Mark on={on} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 pr-4 text-[#1A1A2E]">Uploaded PDF</td>
                  {TIERS.map((tier) => (
                    <td key={tier.key} className="px-3 py-2.5 text-center text-xs text-slate-500">
                      Never shown
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <ul className="list-disc space-y-1 pl-5">
            {TIERS.map((tier) => (
              <li key={tier.key}>
                <strong className="text-[#1A1A2E]">{tier.name}:</strong> {tier.summary}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Getting the full text">
          <p>Every record has a &ldquo;Full text&rdquo; option:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              If the record has a DOI and is Public or Metadata only, the button links to the publisher&apos;s page.
            </li>
            <li>
              If there is no DOI, or the record is Restricted, you can send a <strong>Request full text</strong> message.
              It goes to the research office of the institution that owns the record.
            </li>
          </ul>
          <p>
            The research office decides whether to share the paper and replies to you directly by email. DASIG never
            attaches or serves the PDF. Please give a short reason for your request, and expect that some requests
            may be declined.
          </p>
        </Section>

        <Section title="Privacy and accountability">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your name, email and reason are used only to route your request to the research office and to send you a
              confirmation.
            </li>
            <li>Changes to a record&apos;s visibility, or to an institution&apos;s default, are written to an audit log.</li>
            <li>
              Hidden fields are never sent to your browser, and they are not used when you search. Searching for words
              from a withheld abstract will not find the record.
            </li>
          </ul>
        </Section>

        <Section title="Questions">
          <p>
            If you believe a record is shown at the wrong level, contact the owning institution&apos;s research office
            or DOST Region VII.
          </p>
        </Section>
      </main>

      <PublicFooter />
    </div>
  )
}
