// Requirements 3 and 12: builds a bibliographic citation for a research record in five styles:
// APA 7, MLA 9, IEEE, Chicago 17 (notes and bibliography) and Vancouver.
//
// It is plain JavaScript with no React or browser code, so it can be unit tested (citations.test.js).
//
// What a citation can contain is limited by what DASIG stores. A record has no volume, issue or page
// numbers, so those parts are left out. Titles are used exactly as submitted (the styles ask for
// sentence case or title case, and that cannot be done reliably by a program). Journal names are used
// as submitted, so Vancouver and IEEE journal abbreviations are not applied.

export const CITATION_STYLES = [
  { id: 'apa', label: 'APA 7' },
  { id: 'mla', label: 'MLA 9' },
  { id: 'ieee', label: 'IEEE' },
  { id: 'chicago', label: 'Chicago 17' },
  { id: 'vancouver', label: 'Vancouver' },
]

// ---------- small text helpers ----------

// A citation is a list of pieces: { text } or { text, italic: true }.
const t = (text) => ({ text })
const i = (text) => ({ text, italic: true })

const clean = (value) => (value == null ? '' : String(value).replace(/\s+/g, ' ').trim())
const stripTerminal = (text) => clean(text).replace(/[.,;:]+$/, '')
const terminal = (text) => {
  const value = clean(text)
  return !value || /[.?!]$/.test(value) ? value : `${value}.`
}

// Straight quotes become the curly quotes that MLA, IEEE and Chicago print around article titles.
// The punctuation mark goes INSIDE the closing quote (American style), unless the title already
// ends with ? or !.
function quote(title, mark) {
  const base = stripTerminal(title)
  return /[?!]$/.test(base) ? `\u201C${base}\u201D` : `\u201C${base}${mark}\u201D`
}

// Merges neighbouring pieces of the same style, and never prints ".." where a piece that ends with a
// period meets a piece that starts with one.
export function mergeSegments(segments) {
  const out = []
  for (const piece of segments) {
    let text = piece.text
    if (!text) continue
    const prev = out[out.length - 1]
    if (prev && prev.text.endsWith('.') && text.startsWith('.')) text = text.slice(1)
    if (!text) continue
    if (prev && Boolean(prev.italic) === Boolean(piece.italic)) {
      prev.text += text
    } else {
      out.push(piece.italic ? { text, italic: true } : { text })
    }
  }
  return out
}

export const segmentsToText = (segments) => segments.map((s) => s.text).join('')

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const segmentsToHtml = (segments) =>
  segments.map((s) => (s.italic ? `<i>${escapeHtml(s.text)}</i>` : escapeHtml(s.text))).join('')

// ---------- names ----------

// Lower-case words that belong to a family name: "Maria dela Cruz" has the family name "dela Cruz".
const PARTICLES = new Set([
  'de', 'del', 'della', 'dela', 'delos', 'de la', 'la', 'le', 'van', 'von', 'der', 'den', 'da', 'di', 'du',
  'san', 'santa', 'dos', 'das', 'bin', 'binti', 'ibn', 'al', 'el', 'ter', 'ten',
])
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv'])
const SUFFIX_LABEL = { jr: 'Jr.', sr: 'Sr.', ii: 'II', iii: 'III', iv: 'IV' }

function suffixOf(token) {
  const key = token.replace(/[.,]/g, '').toLowerCase()
  return SUFFIXES.has(key) ? SUFFIX_LABEL[key] : ''
}

/**
 * "Maria Theresa dela Cruz" and "dela Cruz, Maria Theresa" both give
 * { family: 'dela Cruz', given: ['Maria', 'Theresa'], suffix: '' }. A trailing Jr., Sr., II, III or
 * IV is kept as the suffix. Returns null for an empty name.
 */
export function parseName(full) {
  const value = clean(typeof full === 'string' ? full : full?.fullName || full?.name)
  if (!value) return null

  let family
  let given = []
  let suffix = ''

  if (value.includes(',')) {
    const [familyPart, ...rest] = value.split(',').map((p) => p.trim()).filter(Boolean)
    family = familyPart
    const tokens = rest.join(' ').split(' ').filter(Boolean)
    if (tokens.length && suffixOf(tokens[tokens.length - 1])) suffix = suffixOf(tokens.pop())
    given = tokens
  } else {
    const tokens = value.split(' ')
    if (tokens.length > 1 && suffixOf(tokens[tokens.length - 1])) suffix = suffixOf(tokens.pop())
    if (tokens.length === 1) {
      family = tokens[0]
    } else {
      let start = tokens.length - 1
      while (start > 1 && PARTICLES.has(tokens[start - 1].toLowerCase())) start -= 1
      family = tokens.slice(start).join(' ')
      given = tokens.slice(0, start)
    }
  }
  return family ? { family, given, suffix } : null
}

const firstLetter = (word) => (word.match(/\p{L}/u) || [''])[0].toUpperCase()

// "Jean-Paul" gives "J.-P." and "Maria" gives "M."
const initialOf = (word) =>
  word.split('-').map((part) => firstLetter(part)).filter(Boolean).map((l) => `${l}.`).join('-')

const initialsSpaced = (given) => given.map(initialOf).filter(Boolean).join(' ') // "M. T."
const initialsCompact = (given) => given.map((w) => w.split('-').map(firstLetter).join('')).join('') // "MT"
const givenFull = (given) => given.join(' ')

function parseAuthors(authors) {
  return (Array.isArray(authors) ? authors : []).map(parseName).filter(Boolean)
}

// ---------- the record ----------

const NOT_A_VENUE = /^(unpublished|under review|in review|ongoing|submitted|pending|in progress|accepted|in press|n\/?a|none|not applicable|-+|—)$/i

const DESCRIPTORS = {
  JOURNAL_ARTICLE: 'Journal article',
  CONFERENCE_PAPER: 'Conference paper',
  FUNDED_PROJECT: 'Funded research project',
  INNOVATION_OUTPUT: 'Innovation output',
  IP_REGISTRATION: 'Intellectual property registration',
  COMMUNITY_EXTENSION_RESEARCH: 'Community extension research',
}

// DASIG stores the research type as the label the submission form sends ("Journal Article"), while
// older data and some tools use the enum style (JOURNAL_ARTICLE). Both are accepted, so
// "Journal Article", "journal article" and "JOURNAL_ARTICLE" all give JOURNAL_ARTICLE.
const typeKey = (type) =>
  clean(type).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')

export function normalizeDoi(raw) {
  const doi = clean(raw)
    .replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '')
    .toLowerCase()
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : ''
}

function toWork(record, options = {}) {
  const venueRaw = clean(record?.publicationVenue)
  const venue = venueRaw && !NOT_A_VENUE.test(venueRaw) ? venueRaw : ''
  const type = typeKey(record?.researchType)
  let kind = 'other'
  if (type === 'JOURNAL_ARTICLE' && venue) kind = 'journal'
  if (type === 'CONFERENCE_PAPER' && venue) kind = 'conference'

  const year = clean(record?.completionYear).match(/\d{4}/)?.[0] || ''
  return {
    authors: parseAuthors(record?.authors),
    title: clean(record?.title),
    year,
    kind,
    venue,
    publisher: clean(record?.publisherDc && kind === 'other' ? record.publisherDc : record?.institutionName),
    descriptor: DESCRIPTORS[type] || 'Research output',
    doi: normalizeDoi(record?.doi),
    url: clean(options.url),
    accessDate: options.accessDate instanceof Date ? options.accessDate : new Date(),
  }
}

const link = (w) => (w.doi ? `https://doi.org/${w.doi}` : w.url)

// ---------- APA 7 ----------

function apaName(a) {
  const initials = initialsSpaced(a.given)
  return `${a.family}${initials ? `, ${initials}` : ''}${a.suffix ? `, ${a.suffix}` : ''}`
}

function apaAuthors(authors) {
  const names = authors.map(apaName)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]}, & ${names[1]}`
  if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`
  return `${names.slice(0, 19).join(', ')}, . . . ${names[names.length - 1]}`
}

function apa(w) {
  const authors = apaAuthors(w.authors)
  const date = `(${w.year || 'n.d.'})`
  const url = link(w)
  const tail = url ? [t(` ${url}`)] : []
  const segs = []

  if (w.kind === 'other') {
    // Reports and unpublished work: the title is in italics, followed by a description in brackets.
    // With an author:    Author. (Year). *Title* [Description]. Publisher. URL
    // Without an author: *Title* [Description]. (Year). Publisher. URL  (the title takes the author's place)
    if (authors) {
      segs.push(t(`${terminal(authors)} ${date}. `))
      segs.push(i(stripTerminal(w.title)))
      segs.push(t(` [${w.descriptor}]. `))
    } else {
      segs.push(i(stripTerminal(w.title)))
      segs.push(t(` [${w.descriptor}]. ${date}. `))
    }
    if (w.publisher) segs.push(t(`${terminal(w.publisher)}`))
    segs.push(...tail)
  } else {
    segs.push(t(authors ? `${terminal(authors)} ${date}. ` : `${terminal(w.title)} ${date}. `))
    if (authors) segs.push(t(`${terminal(w.title)} `))
    segs.push(t(w.kind === 'conference' ? 'In ' : ''))
    segs.push(i(stripTerminal(w.venue)))
    segs.push(t('.'))
    segs.push(...tail)
  }
  return mergeSegments(segs)
}

// ---------- MLA 9 ----------

function mlaAuthors(authors) {
  if (authors.length === 0) return ''
  const first = authors[0]
  const firstName = `${first.family}${first.given.length ? `, ${givenFull(first.given)}` : ''}${first.suffix ? `, ${first.suffix}` : ''}`
  if (authors.length === 1) return firstName
  if (authors.length >= 3) return `${firstName}, et al.`
  const second = authors[1]
  return `${firstName}, and ${givenFull(second.given)}${second.given.length ? ' ' : ''}${second.family}${second.suffix ? ` ${second.suffix}` : ''}`
}

function mla(w) {
  const authors = mlaAuthors(w.authors)
  const url = link(w)
  const segs = []
  if (authors) segs.push(t(`${terminal(authors)} `))

  if (w.kind === 'other') {
    // A stand-alone work: the title is in italics and the publisher follows it.
    segs.push(i(stripTerminal(w.title)))
    segs.push(t('. '))
    const rest = [w.publisher, w.year, url].filter(Boolean).join(', ')
    segs.push(t(rest ? `${rest}.` : ''))
  } else {
    // A work inside a container (journal or proceedings): the title is in quotation marks.
    segs.push(t(`${quote(w.title, '.')} `))
    segs.push(i(stripTerminal(w.venue)))
    const rest = [w.year, url].filter(Boolean).join(', ')
    segs.push(t(rest ? `, ${rest}.` : '.'))
  }
  return mergeSegments(segs)
}

// ---------- IEEE ----------

function ieeeName(a) {
  const initials = initialsSpaced(a.given)
  return `${initials ? `${initials} ` : ''}${a.family}${a.suffix ? ` ${a.suffix}` : ''}`
}

function ieeeAuthors(authors) {
  const names = authors.map(ieeeName)
  if (names.length === 0) return ''
  if (names.length > 6) return `${names[0]} et al.`
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function ieee(w) {
  const authors = ieeeAuthors(w.authors)
  const segs = []
  // IEEE puts a comma after the author list, also after "et al."
  if (authors) segs.push(t(`${authors}, `))
  segs.push(t(`${quote(w.title, ',')} `))

  const tail = []
  if (w.year) tail.push(w.year)
  if (w.doi) tail.push(`doi: ${w.doi}`)

  if (w.kind === 'journal' || w.kind === 'conference') {
    segs.push(t(w.kind === 'conference' ? 'in ' : ''))
    segs.push(i(stripTerminal(w.venue)))
    segs.push(t(tail.length ? `, ${tail.join(', ')}.` : '.'))
  } else {
    const parts = [w.publisher, ...tail].filter(Boolean)
    segs.push(t(parts.length ? `${parts.join(', ')}.` : ''))
  }
  // Without a DOI, an online source is given as "[Online]. Available: <url>".
  if (!w.doi && w.url) segs.push(t(` [Online]. Available: ${w.url}`))
  return mergeSegments(segs)
}

// ---------- Chicago 17 (notes and bibliography) ----------

function chicagoBibAuthors(authors) {
  if (authors.length === 0) return ''
  const list = authors.length > 10 ? authors.slice(0, 7) : authors
  const names = list.map((a, index) => {
    if (index === 0) {
      return `${a.family}${a.given.length ? `, ${givenFull(a.given)}` : ''}${a.suffix ? `, ${a.suffix}` : ''}`
    }
    return `${givenFull(a.given)}${a.given.length ? ' ' : ''}${a.family}${a.suffix ? ` ${a.suffix}` : ''}`
  })
  if (authors.length > 10) return `${names.join(', ')}, et al.`
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]}, and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function chicagoNoteAuthors(authors) {
  const normal = (a) => `${givenFull(a.given)}${a.given.length ? ' ' : ''}${a.family}${a.suffix ? ` ${a.suffix}` : ''}`
  if (authors.length === 0) return ''
  if (authors.length >= 4) return `${normal(authors[0])} et al.`
  const names = authors.map(normal)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function chicagoBibliography(w) {
  const authors = chicagoBibAuthors(w.authors)
  const url = link(w)
  const segs = []
  if (authors) segs.push(t(`${terminal(authors)} `))

  if (w.kind === 'journal') {
    segs.push(t(`${quote(w.title, '.')} `))
    segs.push(i(stripTerminal(w.venue)))
    segs.push(t(`${w.year ? ` (${w.year})` : ''}.${url ? ` ${url}.` : ''}`))
  } else if (w.kind === 'conference') {
    segs.push(t(`${quote(w.title, '.')} Paper presented at ${stripTerminal(w.venue)}${w.year ? `, ${w.year}` : ''}.${url ? ` ${url}.` : ''}`))
  } else {
    segs.push(i(stripTerminal(w.title)))
    segs.push(t('. '))
    const rest = [w.publisher, w.year].filter(Boolean).join(', ')
    segs.push(t(`${rest ? `${rest}.` : ''}${url ? `${rest ? ' ' : ''}${url}.` : ''}`))
  }
  return mergeSegments(segs)
}

function chicagoNote(w) {
  const authors = chicagoNoteAuthors(w.authors)
  const url = link(w)
  const segs = []
  const urlTail = url ? `, ${url}` : ''

  if (w.kind === 'journal') {
    if (authors) segs.push(t(`${authors}, `))
    segs.push(t(`${quote(w.title, ',')} `))
    segs.push(i(stripTerminal(w.venue)))
    segs.push(t(`${w.year ? ` (${w.year})` : ''}${urlTail}.`))
  } else if (w.kind === 'conference') {
    if (authors) segs.push(t(`${authors}, `))
    segs.push(t(`${quote(w.title, ',')} paper presented at ${stripTerminal(w.venue)}${w.year ? `, ${w.year}` : ''}${urlTail}.`))
  } else {
    if (authors) segs.push(t(`${authors}, `))
    segs.push(i(stripTerminal(w.title)))
    const imprint = [w.publisher, w.year].filter(Boolean).join(', ')
    segs.push(t(`${imprint ? ` (${imprint})` : ''}${urlTail}.`))
  }
  return mergeSegments(segs)
}

// ---------- Vancouver ----------

function vancouverName(a) {
  const initials = initialsCompact(a.given)
  return `${a.family}${initials ? ` ${initials}` : ''}${a.suffix ? ` ${a.suffix.replace('.', '')}` : ''}`
}

function vancouverAuthors(authors) {
  if (authors.length === 0) return ''
  const names = authors.slice(0, 6).map(vancouverName)
  return authors.length > 6 ? `${names.join(', ')}, et al.` : names.join(', ')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const vancouverDate = (d) => `${d.getFullYear()} ${MONTHS[d.getMonth()]} ${d.getDate()}`

function vancouver(w) {
  const authors = vancouverAuthors(w.authors)
  const segs = []
  if (authors) segs.push(t(`${terminal(authors)} `))
  const title = terminal(w.title)

  if (w.kind === 'journal') {
    segs.push(t(`${title} ${terminal(w.venue)}`))
    if (w.year) segs.push(t(` ${w.year}.`))
    if (w.doi) segs.push(t(` doi:${w.doi}`))
    else if (w.url) segs.push(t(` Available from: ${w.url}`))
  } else if (w.kind === 'conference') {
    segs.push(t(`${title} In: ${terminal(w.venue)}`))
    if (w.year) segs.push(t(` ${w.year}.`))
    if (w.doi) segs.push(t(` doi:${w.doi}`))
    else if (w.url) segs.push(t(` Available from: ${w.url}`))
  } else {
    // A web document: "[Internet]", the publisher, the year, the date it was read, and where to find it.
    const url = link(w)
    segs.push(t(`${stripTerminal(w.title)}${url ? ' [Internet]' : ''}. `))
    const imprint = [w.publisher, w.year].filter(Boolean).join('; ')
    segs.push(t(`${imprint}${url ? ` [cited ${vancouverDate(w.accessDate)}]` : ''}${imprint || url ? '. ' : ''}`))
    if (url) segs.push(t(`Available from: ${url}`))
  }
  return mergeSegments(segs)
}

// ---------- public entry point ----------

/**
 * Builds the citation(s) for one style. Returns { style, entries }, where each entry is
 * { label, segments, text, html }. Most styles have one entry. Chicago has two: the bibliography
 * entry and the footnote.
 *
 * options.url: the address of the record page, used when the record has no DOI.
 * options.accessDate: the "date read" for Vancouver web documents (defaults to today).
 */
export function buildCitation(record, styleId, options = {}) {
  const w = toWork(record, options)
  const make = (label, segments) => ({
    label,
    segments,
    text: segmentsToText(segments),
    html: segmentsToHtml(segments),
  })
  switch (styleId) {
    case 'mla':
      return { style: 'mla', entries: [make('', mla(w))] }
    case 'ieee':
      return { style: 'ieee', entries: [make('', ieee(w))] }
    case 'chicago':
      return { style: 'chicago', entries: [make('Bibliography', chicagoBibliography(w)), make('Footnote', chicagoNote(w))] }
    case 'vancouver':
      return { style: 'vancouver', entries: [make('', vancouver(w))] }
    case 'apa':
    default:
      return { style: 'apa', entries: [make('', apa(w))] }
  }
}

/**
 * A restricted record comes back with only a title and an institution. A citation built from that
 * would be misleading, so the Cite controls are hidden unless there are authors or a year.
 */
export function hasCitableMetadata(record) {
  return Boolean(clean(record?.title)) && (parseAuthors(record?.authors).length > 0 || Boolean(clean(record?.completionYear)))
}
