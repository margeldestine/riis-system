import { CITATION_STYLES } from './citations'

// Remembers the citation style a person picked last, so the Cite panel and the quick-copy menu on
// result cards use it next time. Browser storage can be unavailable (private mode), so every call is
// wrapped, and the page works the same without it.
const STORAGE_KEY = 'dasig.citationStyle'
const DEFAULT_STYLE = 'apa'

export function loadCitationStyle() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return CITATION_STYLES.some((style) => style.id === saved) ? saved : DEFAULT_STYLE
  } catch {
    return DEFAULT_STYLE
  }
}

export function saveCitationStyle(styleId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, styleId)
  } catch {
    // Not saving is fine.
  }
}
