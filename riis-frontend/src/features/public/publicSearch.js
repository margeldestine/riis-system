// Requirement 4: where the header search bar sends the reader.
// The Discovery page (the "/" route) reads "q" from the address on load and runs that search.

/** "coconut husk" gives "/?q=coconut%20husk". An empty search just opens the Discovery page. */
export function searchPath(query) {
  const text = String(query ?? '').replace(/\s+/g, ' ').trim()
  return text ? `/?q=${encodeURIComponent(text)}` : '/'
}
