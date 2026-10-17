// Visibility tiers (Refactoring Priority 1). Values match the backend enum
// AccessVisibility: PUBLIC | METADATA_ONLY | RESTRICTED.
export const VISIBILITY_OPTIONS = [
  {
    value: 'PUBLIC',
    label: 'Public',
    summary: 'Everything is shown on the public portal.',
    shows: 'Title, institution, authors, year, type, funding, venue, keywords, DOI and abstract.',
    fullText: 'Full text button links to the DOI page, or opens a request form if there is no DOI.',
  },
  {
    value: 'METADATA_ONLY',
    label: 'Metadata-only',
    summary: 'The abstract is hidden from the public.',
    shows: 'Title, institution, authors, year, type, funding, venue, keywords and DOI.',
    fullText: 'Full text button links to the DOI page, or opens a request form if there is no DOI.',
  },
  {
    value: 'RESTRICTED',
    label: 'Restricted',
    summary: 'Only the title and institution are shown.',
    shows: 'Title and institution only.',
    fullText: 'Visitors can only send a full-text request to your research office.',
  },
]

export function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find((option) => option.value === value)?.label || 'Not selected'
}