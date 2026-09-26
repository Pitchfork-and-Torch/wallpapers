import assert from 'node:assert/strict'
import test from 'node:test'
import { countLabel, formatBytes } from './format.js'
import { flagsFor, pickFeatured } from './rank.js'

const a = { id: 'older', title: 'Older', added: '2026-09-01' }
const b = { id: 'newer', title: 'Newer', added: '2026-09-26' }

test('one wallpaper is both newest and most loved', () => {
  const picked = pickFeatured([b], {})
  assert.deepEqual(picked, { newestId: 'newer', belovedId: 'newer', featuredId: null })
  assert.deepEqual(flagsFor('newer', picked), ['Most loved', 'Newest'])
})

test('loves outrank recency, then downloads, then newer date', () => {
  assert.equal(pickFeatured([a, b], {
    older: { loves: 2, downloads: 0 },
    newer: { loves: 0, downloads: 9 },
  }).belovedId, 'older')

  assert.equal(pickFeatured([a, b], {
    older: { loves: 1, downloads: 4 },
    newer: { loves: 1, downloads: 9 },
  }).belovedId, 'newer')

  assert.equal(pickFeatured([a, b], {
    older: { loves: 0, downloads: 3 },
    newer: { loves: 0, downloads: 3 },
  }).belovedId, 'newer')

  assert.equal(pickFeatured([a, b], {}).newestId, 'newer')
})

test('a pinned wallpaper stays the featured one', () => {
  const pinned = { ...a, featured: true }
  const picked = pickFeatured([pinned, b], {})
  assert.equal(picked.featuredId, 'older')
  assert.equal(picked.newestId, 'newer')
  assert.deepEqual(flagsFor('older', picked), ['Featured'])
  assert.deepEqual(flagsFor('newer', picked), ['Most loved', 'Newest'])
})

test('labels and file size stay plain', () => {
  assert.equal(countLabel(0, 'love', 'loves'), '0 loves')
  assert.equal(countLabel(1, 'download', 'downloads'), '1 download')
  assert.equal(countLabel(1200, 'download', 'downloads'), '1,200 downloads')
  assert.equal(formatBytes(16351154), '15.6 MB')
})
