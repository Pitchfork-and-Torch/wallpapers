import assert from 'node:assert/strict'
import test from 'node:test'
import { packItems, packLinks, validSaveNonce } from './packs.js'

test('pack links keep only named zip parts', () => {
  const links = packLinks([
    { file: '/packs/wallpapers-01.zip', filename: 'wallpapers-01.zip' },
    { file: '/files/grok-bots-orbs.png', filename: 'wallpapers-02.zip' },
    { file: '/packs/wallpapers-03.zip', filename: '../wallpapers-03.zip' },
    { file: '/packs/nope.zip', filename: 'nope.zip' },
  ])
  assert.deepEqual(links, [
    { href: '/packs/wallpapers-01.zip', filename: 'wallpapers-01.zip' },
  ])
})

test('a save nonce is a short token', () => {
  assert.equal(validSaveNonce('abc_def-12'), true)
  assert.equal(validSaveNonce('short'), false)
  assert.equal(validSaveNonce('has space!!'), false)
})

test('pack items ignore bad ids and mark phone files', () => {
  const items = packItems({
    items: [
      { id: 'grok-bots-orbs', variant: 'desktop' },
      { id: 'grok-bots-glacier', variant: 'phone' },
      { id: '../secret', variant: 'desktop' },
      { id: '', variant: 'phone' },
    ],
  })
  assert.deepEqual(items, [
    { id: 'grok-bots-orbs', variant: 'desktop' },
    { id: 'grok-bots-glacier', variant: 'phone' },
  ])
})
