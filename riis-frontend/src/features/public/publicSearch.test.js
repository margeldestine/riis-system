// Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchPath } from './publicSearch.js'

test('a search goes to the Discovery page with the query in the address', () => {
  assert.equal(searchPath('coconut'), '/?q=coconut')
  assert.equal(searchPath('coconut husk'), '/?q=coconut%20husk')
})

test('extra spaces are cleaned up', () => {
  assert.equal(searchPath('  coconut    husk  '), '/?q=coconut%20husk')
})

test('special characters are encoded, so they cannot break the address', () => {
  assert.equal(searchPath('R&D #1 100%'), '/?q=R%26D%20%231%20100%25')
  assert.equal(searchPath('a=b&c=d'), '/?q=a%3Db%26c%3Dd')
})

test('an empty search just opens the Discovery page', () => {
  assert.equal(searchPath(''), '/')
  assert.equal(searchPath('    '), '/')
  assert.equal(searchPath(null), '/')
  assert.equal(searchPath(undefined), '/')
})
