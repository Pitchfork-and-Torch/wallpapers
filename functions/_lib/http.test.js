import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalRedirect, shouldCountDownload } from './http.js'

const url = 'https://wallpapers.jonbailey.xyz/dl/grok-bots-orbs'

test('real clicks and plain download tools count, prefetches do not', () => {
  assert.equal(shouldCountDownload(new Request(url)), true)
  assert.equal(shouldCountDownload(new Request(url, {
    headers: { 'sec-fetch-site': 'same-origin', 'sec-fetch-user': '?1' },
  })), true)
  assert.equal(shouldCountDownload(new Request(url, {
    headers: { 'sec-fetch-site': 'same-origin', 'sec-fetch-dest': 'empty' },
  })), true)
  assert.equal(shouldCountDownload(new Request(url, {
    headers: { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'empty' },
  })), false)
  assert.equal(shouldCountDownload(new Request(url, {
    headers: { 'sec-fetch-site': 'same-origin', 'sec-fetch-dest': 'image' },
  })), false)
  assert.equal(shouldCountDownload(new Request(url, {
    headers: { 'sec-purpose': 'prefetch', 'sec-fetch-user': '?1' },
  })), false)
  assert.equal(shouldCountDownload(new Request(url, { method: 'HEAD' })), false)
})

test('the plural hostname redirects to wallpaper.jonbailey.xyz', () => {
  const moved = canonicalRedirect(new Request('https://wallpapers.jonbailey.xyz/dl/grok-bots-orbs'))
  assert.equal(moved.status, 308)
  assert.equal(moved.headers.get('location'), 'https://wallpaper.jonbailey.xyz/dl/grok-bots-orbs')
  assert.equal(canonicalRedirect(new Request('https://wallpaper.jonbailey.xyz/')), null)
})
