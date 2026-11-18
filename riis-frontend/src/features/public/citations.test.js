// Run with: npm test
// These tests lock in the citation formats (requirements 3 and 12). Every expected string below was
// checked by hand against the style rules, so a change in the output means a rule changed.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildCitation,
  CITATION_STYLES,
  mergeSegments,
  normalizeDoi,
  parseName,
  segmentsToHtml,
} from './citations.js'

const URL = 'https://dasig.example/research/abc123'
const TODAY = new Date(2026, 10, 15) // 15 Nov 2026, used for the Vancouver "[cited ...]" date

const journal = {
  title: 'Biomass energy potential of coconut husks in Central Visayas',
  researchType: 'JOURNAL_ARTICLE',
  publicationVenue: 'Philippine Journal of Science',
  completionYear: 2025,
  doi: 'https://doi.org/10.1234/PJS.2025.001',
  institutionName: 'Cebu Institute of Technology - University',
  authors: [{ fullName: 'Maria Theresa dela Cruz' }, { fullName: 'Juan Carlos Santos Jr.' }],
}

const capstone = {
  title: 'DASIG: A research information system for DOST Region VII',
  researchType: 'FUNDED_PROJECT',
  publicationVenue: 'Unpublished',
  completionYear: '2026',
  institutionName: 'Cebu Institute of Technology - University',
  authors: [{ fullName: 'Francis Abelgas' }, { fullName: 'Ana Lopez' }, { fullName: 'Reyes, Mark Anthony' }],
}

const conference = {
  title: "Can mangroves protect Cebu's coast?",
  researchType: 'CONFERENCE_PAPER',
  publicationVenue: 'Proceedings of the Regional Science Congress',
  completionYear: 2024,
  doi: '10.5555/rsc.2024.77',
  institutionName: 'USC',
  authors: [{ fullName: 'Jose Rizal' }],
}

const noAuthors = {
  title: 'Rice terrace water use survey',
  researchType: 'INNOVATION_OUTPUT',
  institutionName: 'DOST Region VII',
  authors: [],
}

const options = { url: URL, accessDate: TODAY }
const textsOf = (record, style) => buildCitation(record, style, options).entries.map((e) => e.text)

const expected = {
  journal: {
    apa: ["dela Cruz, M. T., & Santos, J. C., Jr. (2025). Biomass energy potential of coconut husks in Central Visayas. Philippine Journal of Science. https://doi.org/10.1234/pjs.2025.001"],
    mla: ["dela Cruz, Maria Theresa, and Juan Carlos Santos Jr. “Biomass energy potential of coconut husks in Central Visayas.” Philippine Journal of Science, 2025, https://doi.org/10.1234/pjs.2025.001."],
    ieee: ["M. T. dela Cruz and J. C. Santos Jr., “Biomass energy potential of coconut husks in Central Visayas,” Philippine Journal of Science, 2025, doi: 10.1234/pjs.2025.001."],
    chicago: ["dela Cruz, Maria Theresa, and Juan Carlos Santos Jr. “Biomass energy potential of coconut husks in Central Visayas.” Philippine Journal of Science (2025). https://doi.org/10.1234/pjs.2025.001.", "Maria Theresa dela Cruz and Juan Carlos Santos Jr., “Biomass energy potential of coconut husks in Central Visayas,” Philippine Journal of Science (2025), https://doi.org/10.1234/pjs.2025.001."],
    vancouver: ["dela Cruz MT, Santos JC Jr. Biomass energy potential of coconut husks in Central Visayas. Philippine Journal of Science. 2025. doi:10.1234/pjs.2025.001"],
  },
  capstone: {
    apa: ["Abelgas, F., Lopez, A., & Reyes, M. A. (2026). DASIG: A research information system for DOST Region VII [Funded research project]. Cebu Institute of Technology - University. https://dasig.example/research/abc123"],
    mla: ["Abelgas, Francis, et al. DASIG: A research information system for DOST Region VII. Cebu Institute of Technology - University, 2026, https://dasig.example/research/abc123."],
    ieee: ["F. Abelgas, A. Lopez, and M. A. Reyes, “DASIG: A research information system for DOST Region VII,” Cebu Institute of Technology - University, 2026. [Online]. Available: https://dasig.example/research/abc123"],
    chicago: ["Abelgas, Francis, Ana Lopez, and Mark Anthony Reyes. DASIG: A research information system for DOST Region VII. Cebu Institute of Technology - University, 2026. https://dasig.example/research/abc123.", "Francis Abelgas, Ana Lopez, and Mark Anthony Reyes, DASIG: A research information system for DOST Region VII (Cebu Institute of Technology - University, 2026), https://dasig.example/research/abc123."],
    vancouver: ["Abelgas F, Lopez A, Reyes MA. DASIG: A research information system for DOST Region VII [Internet]. Cebu Institute of Technology - University; 2026 [cited 2026 Nov 15]. Available from: https://dasig.example/research/abc123"],
  },
  conference: {
    apa: ["Rizal, J. (2024). Can mangroves protect Cebu's coast? In Proceedings of the Regional Science Congress. https://doi.org/10.5555/rsc.2024.77"],
    mla: ["Rizal, Jose. “Can mangroves protect Cebu's coast?” Proceedings of the Regional Science Congress, 2024, https://doi.org/10.5555/rsc.2024.77."],
    ieee: ["J. Rizal, “Can mangroves protect Cebu's coast?” in Proceedings of the Regional Science Congress, 2024, doi: 10.5555/rsc.2024.77."],
    chicago: ["Rizal, Jose. “Can mangroves protect Cebu's coast?” Paper presented at Proceedings of the Regional Science Congress, 2024. https://doi.org/10.5555/rsc.2024.77.", "Jose Rizal, “Can mangroves protect Cebu's coast?” paper presented at Proceedings of the Regional Science Congress, 2024, https://doi.org/10.5555/rsc.2024.77."],
    vancouver: ["Rizal J. Can mangroves protect Cebu's coast? In: Proceedings of the Regional Science Congress. 2024. doi:10.5555/rsc.2024.77"],
  },
  noAuthors: {
    apa: ["Rice terrace water use survey [Innovation output]. (n.d.). DOST Region VII. https://dasig.example/research/abc123"],
    mla: ["Rice terrace water use survey. DOST Region VII, https://dasig.example/research/abc123."],
    ieee: ["“Rice terrace water use survey,” DOST Region VII. [Online]. Available: https://dasig.example/research/abc123"],
    chicago: ["Rice terrace water use survey. DOST Region VII. https://dasig.example/research/abc123.", "Rice terrace water use survey (DOST Region VII), https://dasig.example/research/abc123."],
    vancouver: ["Rice terrace water use survey [Internet]. DOST Region VII [cited 2026 Nov 15]. Available from: https://dasig.example/research/abc123"],
  },
}

const records = { journal, capstone, conference, noAuthors }

for (const [name, byStyle] of Object.entries(expected)) {
  for (const [style, texts] of Object.entries(byStyle)) {
    test(`${name} in ${style}`, () => {
      assert.deepEqual(textsOf(records[name], style), texts)
    })
  }
}

test('all five styles are offered', () => {
  assert.deepEqual(CITATION_STYLES.map((s) => s.id), ['apa', 'mla', 'ieee', 'chicago', 'vancouver'])
})

test('Chicago gives a bibliography entry and a footnote, every other style one entry', () => {
  assert.deepEqual(buildCitation(journal, 'chicago', options).entries.map((e) => e.label), ['Bibliography', 'Footnote'])
  for (const style of ['apa', 'mla', 'ieee', 'vancouver']) {
    assert.equal(buildCitation(journal, style, options).entries.length, 1)
  }
})

test('research types are recognised as labels ("Journal Article", as the form stores them) and as enum names', () => {
  // DASIG stores the label sent by the submission form, so this is the form real records have.
  for (const [label, enumName] of [
    ['Journal Article', 'JOURNAL_ARTICLE'],
    ['Conference Paper', 'CONFERENCE_PAPER'],
    ['Funded Project', 'FUNDED_PROJECT'],
    ['Innovation Output', 'INNOVATION_OUTPUT'],
    ['IP Registration', 'IP_REGISTRATION'],
  ]) {
    const byLabel = { ...journal, publicationVenue: 'Philippine Journal of Science', researchType: label }
    const byEnum = { ...byLabel, researchType: enumName }
    for (const style of ['apa', 'mla', 'ieee', 'chicago', 'vancouver']) {
      assert.deepEqual(textsOf(byLabel, style), textsOf(byEnum, style), `${label} / ${style}`)
    }
  }
  const labelled = { ...journal, researchType: 'Journal Article' }
  assert.deepEqual(textsOf(labelled, 'apa'), expected.journal.apa) // journal format, not "[Research output]"
  assert.match(textsOf({ ...capstone, researchType: 'Community Extension Research' }, 'apa')[0], /\[Community extension research\]/)
})

test('names: particles, suffixes and "Last, First" order', () => {
  assert.deepEqual(parseName('Maria Theresa dela Cruz'), { family: 'dela Cruz', given: ['Maria', 'Theresa'], suffix: '' })
  assert.deepEqual(parseName('Maria Theresa De La Cruz'), { family: 'De La Cruz', given: ['Maria', 'Theresa'], suffix: '' })
  assert.deepEqual(parseName('dela Cruz, Maria Theresa'), { family: 'dela Cruz', given: ['Maria', 'Theresa'], suffix: '' })
  assert.deepEqual(parseName('Juan Santos Jr.'), { family: 'Santos', given: ['Juan'], suffix: 'Jr.' })
  assert.deepEqual(parseName('Santos, Juan, Jr.'), { family: 'Santos', given: ['Juan'], suffix: 'Jr.' })
  assert.deepEqual(parseName('Ana Marie Santos-Reyes'), { family: 'Santos-Reyes', given: ['Ana', 'Marie'], suffix: '' })
  assert.deepEqual(parseName('Plato'), { family: 'Plato', given: [], suffix: '' })
  assert.equal(parseName('   '), null)
  assert.equal(parseName(null), null)
})

test('hyphenated given names keep both initials', () => {
  const record = { ...journal, authors: [{ fullName: 'Jean-Paul Sartre' }] }
  assert.match(textsOf(record, 'apa')[0], /^Sartre, J\.-P\. \(2025\)/)
  assert.match(textsOf(record, 'vancouver')[0], /^Sartre JP\./)
})

test('DOIs are cleaned', () => {
  assert.equal(normalizeDoi('https://doi.org/10.1234/ABC'), '10.1234/abc')
  assert.equal(normalizeDoi(' doi:10.1234/abc '), '10.1234/abc')
  assert.equal(normalizeDoi('not a doi'), '')
  assert.equal(normalizeDoi(null), '')
})

test('quotation marks: only MLA, IEEE and Chicago quote an article title', () => {
  const quoted = (style) => textsOf(journal, style)[0].includes('\u201C')
  assert.equal(quoted('mla'), true)
  assert.equal(quoted('ieee'), true)
  assert.equal(quoted('chicago'), true)
  assert.equal(quoted('apa'), false)
  assert.equal(quoted('vancouver'), false)
  // A stand-alone work (a report or capstone) is never in quotation marks in MLA or Chicago.
  assert.equal(textsOf(capstone, 'mla')[0].includes('\u201C'), false)
  assert.equal(textsOf(capstone, 'chicago')[0].includes('\u201C'), false)
})

test('a title that ends with a question mark gets no extra punctuation', () => {
  assert.match(textsOf(conference, 'mla')[0], /coast\?\u201D Proceedings/)
  assert.match(textsOf(conference, 'ieee')[0], /coast\?\u201D in Proceedings/)
  assert.doesNotMatch(textsOf(conference, 'apa')[0], /\?\./)
  assert.doesNotMatch(textsOf(conference, 'vancouver')[0], /\?\./)
})

test('italics: journal names in APA, MLA, IEEE and Chicago, titles of stand-alone works in APA, MLA and Chicago', () => {
  const italicsOf = (record, style, index = 0) =>
    buildCitation(record, style, options).entries[index].segments.filter((s) => s.italic).map((s) => s.text)
  assert.deepEqual(italicsOf(journal, 'apa'), ['Philippine Journal of Science'])
  assert.deepEqual(italicsOf(journal, 'mla'), ['Philippine Journal of Science'])
  assert.deepEqual(italicsOf(journal, 'ieee'), ['Philippine Journal of Science'])
  assert.deepEqual(italicsOf(journal, 'chicago', 1), ['Philippine Journal of Science'])
  assert.deepEqual(italicsOf(capstone, 'apa'), ['DASIG: A research information system for DOST Region VII'])
  assert.deepEqual(italicsOf(capstone, 'mla'), ['DASIG: A research information system for DOST Region VII'])
  assert.deepEqual(italicsOf(journal, 'vancouver'), []) // Vancouver uses no italics
})

test('a record without a venue, or with a status instead of a venue, is cited as a stand-alone work', () => {
  const noVenue = { ...journal, publicationVenue: '' }
  const status = { ...journal, publicationVenue: 'Under review' }
  for (const record of [noVenue, status]) {
    assert.match(textsOf(record, 'apa')[0], /\[Journal article\]/)
    assert.equal(textsOf(record, 'mla')[0].includes('Under review'), false)
  }
})

test('a record without a DOI falls back to the record page address', () => {
  const noDoi = { ...journal, doi: null }
  assert.ok(textsOf(noDoi, 'apa')[0].endsWith(URL))
  assert.ok(textsOf(noDoi, 'mla')[0].endsWith(`${URL}.`))
  assert.ok(textsOf(noDoi, 'vancouver')[0].endsWith(`Available from: ${URL}`))
})

test('many authors: et al. rules of each style', () => {
  const names = ['Ann One', 'Ben Two', 'Cal Three', 'Dee Four', 'Eli Five', 'Fay Six', 'Gus Seven']
  const record = { ...journal, authors: names.map((fullName) => ({ fullName })) }
  assert.match(textsOf(record, 'apa')[0], /^One, A\., Two, B\., Three, C\., Four, D\., Five, E\., Six, F\., & Seven, G\. \(2025\)/)
  assert.match(textsOf(record, 'mla')[0], /^One, Ann, et al\. /)
  assert.match(textsOf(record, 'ieee')[0], /^A\. One et al\., /)
  assert.match(textsOf(record, 'vancouver')[0], /^One A, Two B, Three C, Four D, Five E, Six F, et al\. /)
  assert.match(textsOf(record, 'chicago')[1], /^Ann One et al\., /) // footnote: 4 or more authors
  assert.match(textsOf(record, 'chicago')[0], /^One, Ann, Ben Two, .*, and Gus Seven\. /) // bibliography: up to 10 listed
})

test('APA lists up to 20 authors, and beyond that the first 19, an ellipsis and the last', () => {
  const people = Array.from({ length: 21 }, (_, n) => ({ fullName: `Person${String.fromCharCode(65 + (n % 26))} Family${String.fromCharCode(65 + (n % 26))}` }))
  const apaText = textsOf({ ...journal, authors: people }, 'apa')[0]
  assert.ok(apaText.includes(', . . . FamilyU, P.'), apaText)
  assert.ok(!apaText.includes('FamilyT, P., & '))
})

test('no double periods, even when a venue already ends with one', () => {
  const record = { ...journal, publicationVenue: 'Phil. J. Sci.' }
  for (const style of ['apa', 'mla', 'ieee', 'chicago', 'vancouver']) {
    for (const text of textsOf(record, style)) assert.doesNotMatch(text, /\.\./, text)
  }
  assert.deepEqual(mergeSegments([{ text: 'A.' }, { text: '. B' }]), [{ text: 'A. B' }])
})

test('HTML output marks italics and escapes special characters', () => {
  const html = segmentsToHtml([{ text: 'Tom & <Jerry> ' }, { text: 'Journal', italic: true }])
  assert.equal(html, 'Tom &amp; &lt;Jerry&gt; <i>Journal</i>')
  assert.ok(buildCitation(journal, 'apa', options).entries[0].html.includes('<i>Philippine Journal of Science</i>'))
})

test('a nearly empty record still gives a readable citation', () => {
  for (const style of ['apa', 'mla', 'ieee', 'chicago', 'vancouver']) {
    const [entry] = buildCitation({ title: 'Only a title' }, style, options).entries
    assert.ok(entry.text.includes('Only a title'), entry.text)
  }
  // An empty record must not throw, and still returns a (blank) string.
  assert.equal(typeof buildCitation({}, 'apa').entries[0].text, 'string')
  assert.equal(typeof buildCitation(null, 'mla').entries[0].text, 'string')
})
