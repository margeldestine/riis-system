// Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { documentTypeLabel, formatFileSize, researchTypeLabel } from './documentFormat.js'

test('file sizes are shown in B, KB, MB and GB', () => {
  assert.equal(formatFileSize(0), '0 B')
  assert.equal(formatFileSize(512), '512 B')
  assert.equal(formatFileSize(1024), '1.0 KB')
  assert.equal(formatFileSize(1536), '1.5 KB')
  assert.equal(formatFileSize(10 * 1024), '10 KB')
  assert.equal(formatFileSize(1048576), '1.0 MB')
  assert.equal(formatFileSize(2.4 * 1024 * 1024), '2.4 MB')
  assert.equal(formatFileSize(12 * 1024 * 1024), '12 MB')
  assert.equal(formatFileSize(20 * 1024 * 1024), '20 MB')
  assert.equal(formatFileSize(3 * 1024 ** 3), '3.0 GB')
})

test('a size that would round up to 1024 moves to the next unit', () => {
  assert.equal(formatFileSize(1024 * 1024 - 1), '1.0 MB')
})

test('missing or invalid sizes give an empty string', () => {
  assert.equal(formatFileSize(null), '')
  assert.equal(formatFileSize(undefined), '')
  assert.equal(formatFileSize(''), '')
  assert.equal(formatFileSize('abc'), '')
  assert.equal(formatFileSize(-5), '')
})

test('document types: PDF by content type, otherwise the extension', () => {
  assert.equal(documentTypeLabel('application/pdf', 'My_Paper.pdf'), 'PDF document')
  assert.equal(documentTypeLabel('application/pdf; charset=binary', 'x'), 'PDF document')
  assert.equal(documentTypeLabel('', 'notes.docx'), 'DOCX file')
  assert.equal(documentTypeLabel(null, 'no-extension'), 'Document')
  assert.equal(documentTypeLabel(undefined, undefined), 'Document')
})

test('research types: labels and enum names give the same label', () => {
  assert.equal(researchTypeLabel('Journal Article'), 'Journal Article')
  assert.equal(researchTypeLabel('JOURNAL_ARTICLE'), 'Journal Article')
  assert.equal(researchTypeLabel('IP_REGISTRATION'), 'IP Registration')
  assert.equal(researchTypeLabel('community extension research'), 'Community Extension Research')
  assert.equal(researchTypeLabel('SOMETHING_NEW'), 'Something New')
  assert.equal(researchTypeLabel(''), '')
  assert.equal(researchTypeLabel(null), '')
})
