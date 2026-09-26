import assert from 'node:assert/strict'
import test from 'node:test'
import { renderPage } from './render.js'

function wallpaper(id, title, added) {
  return {
    id,
    title,
    summary: `${title} summary.`,
    added,
    width: 7680,
    height: 3291,
    bytes: 16351154,
    aspect: '21:9',
    filename: `${id}.png`,
    file: `/files/${id}.png`,
    alt: `${title} alt.`,
    preview: { src: `/previews/${id}.webp`, srcset: `/previews/${id}.webp 2400w` },
  }
}

test('a single wallpaper is featured once, with both labels', async () => {
  const { html, csp } = await renderPage({
    wallpapers: [wallpaper('grok-bots-orbs', 'Grok Bots', '2026-09-26')],
    counts: { 'grok-bots-orbs': { loves: 0, downloads: 0 } },
    lovedIds: [],
    version: '1.0.0',
  })
  assert.match(html, /Most loved/)
  assert.match(html, /Newest/)
  assert.match(html, /Download full resolution/)
  assert.match(html, /, PNG, /)
  assert.doesNotMatch(html, /Download for phone/)
  assert.match(html, /Full resolution\. No account\. Free\./)
  assert.match(html, /data-total-downloads>0 downloads</)
  assert.doesNotMatch(html, /data-download-all/)
  assert.match(html, /data-site="wallpapers"/)
  assert.match(html, /15\.6 MB/)
  assert.equal((html.match(/id="wallpaper-grok-bots-orbs"/g) || []).length, 1)
  assert.doesNotMatch(html, /All wallpapers/)
  assert.match(csp, /sha256-/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('loved and newest stay separate when they are different wallpapers', async () => {
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
    ],
    counts: {
      older: { loves: 3, downloads: 1 },
      newer: { loves: 0, downloads: 9 },
    },
    lovedIds: ['older'],
    version: '1.0.0',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.ok(hero.indexOf('id="wallpaper-newer"') > -1)
  assert.ok(hero.indexOf('id="wallpaper-newer"') < hero.indexOf('id="wallpaper-older"'))
  assert.match(html, /Most loved/)
  assert.match(html, /All wallpapers/)
  assert.match(html, /aria-pressed="true"/)
  assert.match(html, />Loved</)
})

test('a pinned wallpaper stays the large one', async () => {
  const older = wallpaper('older', 'Older Piece', '2026-09-01')
  older.featured = true
  const { html } = await renderPage({
    wallpapers: [older, wallpaper('newer', 'Newer Piece', '2026-09-26')],
    counts: {
      older: { loves: 0, downloads: 0 },
      newer: { loves: 0, downloads: 0 },
    },
    lovedIds: [],
    version: '1.1.0',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.ok(hero.indexOf('id="wallpaper-older"') < hero.indexOf('id="wallpaper-newer"'))
  assert.match(html, /id="wallpaper-older"/)
  assert.match(html, /id="wallpaper-newer"/)
  assert.match(html, /data-hero-rail/)
  assert.match(html, /1 \/ 2/)
  assert.match(html, /id="shelf-newer"/)
  assert.match(html, /<div class="frame" id="older">/)
  assert.equal((html.match(/<div class="frame" id="older">/g) || []).length, 1)
  assert.match(html, /<div class="frame" id="newer">/)
  assert.match(html, />Featured</)
})

test('each preview can copy a link to that wallpaper', async () => {
  const older = wallpaper('older', 'Older Piece', '2026-09-01')
  older.featured = true
  const { html } = await renderPage({
    wallpapers: [older, wallpaper('newer', 'Newer Piece', '2026-09-26')],
    counts: {
      older: { loves: 0, downloads: 0 },
      newer: { loves: 0, downloads: 0 },
    },
    lovedIds: [],
    version: '1.3.3',
  })
  assert.equal((html.match(/data-share-url=/g) || []).length, 4)
  assert.match(html, /data-share-url="https:\/\/wallpaper\.jonbailey\.xyz\/#older"/)
  assert.match(html, /data-share-url="https:\/\/wallpaper\.jonbailey\.xyz\/#newer"/)
  assert.match(html, /aria-label="Copy link to Newer Piece"/)
  assert.match(html, />Share</)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('a phone file adds a second full-resolution download', async () => {
  const item = wallpaper('grok-bots-lake', 'Grok Bots, Lake', '2026-09-25')
  item.mime = 'image/jpeg'
  item.file = '/files/grok-bots-lake.jpg'
  item.filename = 'grok-bots-lake.jpg'
  item.width = 7680
  item.height = 4320
  item.aspect = '16:9'
  item.phone = {
    file: '/files/grok-bots-lake-phone.jpg',
    filename: 'grok-bots-lake-phone.jpg',
    width: 4320,
    height: 7680,
    mime: 'image/jpeg',
    aspect: '9:16',
  }
  const { html } = await renderPage({
    wallpapers: [item],
    counts: { 'grok-bots-lake': { loves: 0, downloads: 0 } },
    lovedIds: [],
    version: '1.3.0',
  })
  assert.match(html, /Download desktop/)
  assert.match(html, /Download for phone/)
  assert.match(html, /href="\/dl\/grok-bots-lake\?screen=phone"/)
  assert.match(html, /7680 &times; 4320 desktop, 4320 &times; 7680 phone, JPEG/)
  assert.doesNotMatch(html, /, PNG,/)
  assert.match(html, /phone-shaped file exists/)
})

test('the header total adds downloads and leaves loves out', async () => {
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
    ],
    counts: {
      older: { loves: 9, downloads: 4 },
      newer: { loves: 2, downloads: 3 },
    },
    lovedIds: [],
    version: '1.3.1',
  })
  assert.match(html, /data-total-downloads>7 downloads</)
  assert.equal((html.match(/data-total-downloads/g) || []).length, 1)
  assert.equal((html.match(/data-downloads-for="older"/g) || []).length, 1)
  assert.equal((html.match(/data-downloads-for="newer"/g) || []).length, 1)
  assert.match(html, /id="shelf-older"[\s\S]*data-downloads-for="older">4 downloads</)
  assert.match(html, /id="shelf-newer"[\s\S]*data-downloads-for="newer">3 downloads</)
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.doesNotMatch(hero, /data-downloads-for/)
})

test('a limited edition stays in its own section', async () => {
  const special = wallpaper('lanterns', 'Lanterns', '2026-09-27')
  special.edition = 'halloween'
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      special,
    ],
    counts: {
      older: { loves: 0, downloads: 1 },
      newer: { loves: 0, downloads: 2 },
      lanterns: { loves: 0, downloads: 4 },
    },
    lovedIds: [],
    version: '1.3.9',
  })
  assert.match(html, /id="edition-title"/)
  assert.match(html, />Limited edition</)
  assert.match(html, /Spooky scary Halloween Grok Bot desktop wallpapers/)
  assert.match(html, /id="edition-lanterns"/)
  assert.match(html, /<div class="frame" id="lanterns">/)
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.doesNotMatch(hero, /lanterns/)
  assert.doesNotMatch(html, /id="shelf-lanterns"/)
  assert.match(html, /id="shelf-newer"/)
  assert.equal((html.match(/data-downloads-for="lanterns"/g) || []).length, 1)
  assert.match(html, /data-total-downloads>7 downloads</)
  assert.match(html, /What is the limited edition\?/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('the featured wallpaper opens ahead of the limited edition', async () => {
  const special = wallpaper('lanterns', 'Lanterns', '2026-09-27')
  special.edition = 'halloween'
  special.editionFeatured = true
  const older = wallpaper('older', 'Older Piece', '2026-09-01')
  older.featured = true
  const { html } = await renderPage({
    wallpapers: [
      older,
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      special,
    ],
    counts: {
      older: { loves: 0, downloads: 1 },
      newer: { loves: 0, downloads: 2 },
      lanterns: { loves: 0, downloads: 4 },
    },
    lovedIds: [],
    version: '1.3.10',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.ok(hero.indexOf('id="wallpaper-older"') > -1)
  assert.ok(hero.indexOf('id="wallpaper-older"') < hero.indexOf('id="wallpaper-lanterns"'))
  assert.match(hero, />Limited edition</)
  assert.match(hero, />Featured</)
  assert.equal((html.match(/<div class="frame" id="lanterns">/g) || []).length, 1)
  assert.match(html, /id="edition-lanterns"/)
  assert.doesNotMatch(html, /id="shelf-lanterns"/)
  assert.equal((html.match(/data-downloads-for="lanterns"/g) || []).length, 1)
  assert.match(html, /1 \/ 3/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('a limited edition opens the large view when nothing is featured', async () => {
  const special = wallpaper('lanterns', 'Lanterns', '2026-09-27')
  special.edition = 'halloween'
  special.editionFeatured = true
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      special,
    ],
    counts: {
      older: { loves: 0, downloads: 1 },
      newer: { loves: 0, downloads: 2 },
      lanterns: { loves: 0, downloads: 4 },
    },
    lovedIds: [],
    version: '1.3.14',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.ok(hero.indexOf('id="wallpaper-lanterns"') < hero.indexOf('id="wallpaper-newer"'))
  assert.match(html, /1 \/ 3/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('the Mace Windu collection stays in its own section', async () => {
  const special = wallpaper('out-the-window', 'Out the Window', '2026-09-30')
  special.edition = 'mace-windu'
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      special,
    ],
    counts: {
      older: { loves: 0, downloads: 1 },
      newer: { loves: 0, downloads: 2 },
      'out-the-window': { loves: 0, downloads: 3 },
    },
    lovedIds: [],
    version: '1.3.13',
  })
  assert.match(html, /id="mace-title"/)
  assert.match(html, />Mace Windu</)
  assert.match(html, /Grok Bots, and a very tall window/)
  assert.match(html, /id="mace-out-the-window"/)
  assert.match(html, /<div class="frame" id="out-the-window">/)
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  assert.doesNotMatch(hero, /out-the-window/)
  assert.doesNotMatch(html, /id="shelf-out-the-window"/)
  assert.match(html, /id="shelf-newer"/)
  assert.equal((html.match(/data-downloads-for="out-the-window"/g) || []).length, 1)
  assert.match(html, /data-total-downloads>6 downloads</)
  assert.match(html, /What is the Mace Windu collection\?/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('a Veil and Vane award stays in its own section', async () => {
  const special = wallpaper('valhallabtc-award', 'Valhallabtc', '2026-10-02')
  special.edition = 'veil-vane'
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      special,
    ],
    counts: {
      older: { loves: 0, downloads: 1 },
      newer: { loves: 0, downloads: 2 },
      'valhallabtc-award': { loves: 9, downloads: 9 },
    },
    lovedIds: [],
    version: '1.3.19',
  })
  assert.match(html, /id="veil-title"/)
  assert.match(html, />Veil &amp; Vane Award Winners</)
  assert.match(html, /Honorary wallpapers for the first person to read the hidden phrase/)
  assert.match(html, /id="veil-valhallabtc-award"/)
  assert.match(html, /<div class="frame" id="valhallabtc-award">/)
  assert.match(html, />Veil &amp; Vane</)
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  const veilCard = html.slice(html.indexOf('id="veil-valhallabtc-award"'), html.indexOf('id="all-title"'))
  assert.doesNotMatch(hero, /valhallabtc-award/)
  assert.doesNotMatch(veilCard, />Newest<|>Featured<|>Most loved</)
  assert.doesNotMatch(html, /id="shelf-valhallabtc-award"/)
  assert.match(html, /id="shelf-newer"/)
  assert.match(html, /id="shelf-newer"[\s\S]*?>Newest</)
  assert.equal((html.match(/data-downloads-for="valhallabtc-award"/g) || []).length, 1)
  assert.match(html, /data-total-downloads>12 downloads</)
  assert.match(html, /What is the Veil &amp; Vane Award Winners section\?/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('a featured Veil and Vane award opens the large view', async () => {
  const special = wallpaper('valhallabtc-award', 'Valhallabtc', '2026-10-02')
  special.edition = 'veil-vane'
  special.featured = true
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('grok-bots-vinyl-friday', 'Vinyl Friday', '2026-10-02'),
      special,
    ],
    counts: {
      older: { loves: 0, downloads: 1 },
      'grok-bots-vinyl-friday': { loves: 1, downloads: 2 },
      'valhallabtc-award': { loves: 9, downloads: 9 },
    },
    lovedIds: [],
    version: '1.3.21',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  const opener = hero.slice(0, hero.indexOf('id="wallpaper-grok-bots-vinyl-friday"'))
  assert.match(opener, /id="wallpaper-valhallabtc-award"/)
  assert.match(opener, />Featured</)
  assert.match(opener, />Veil &amp; Vane</)
  assert.doesNotMatch(opener, />Limited edition</)
  assert.equal((html.match(/<div class="frame" id="valhallabtc-award">/g) || []).length, 1)
  assert.match(html, /id="veil-valhallabtc-award"/)
  assert.doesNotMatch(html, /id="shelf-valhallabtc-award"/)
  assert.match(html, /id="shelf-grok-bots-vinyl-friday"/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('download all lists only the zip parts', async () => {
  const { html } = await renderPage({
    wallpapers: [wallpaper('grok-bots-orbs', 'Grok Bots', '2026-09-26')],
    counts: { 'grok-bots-orbs': { loves: 0, downloads: 2 } },
    lovedIds: [],
    version: '1.3.2',
    packs: [
      { file: '/packs/wallpapers-01.zip', filename: 'wallpapers-01.zip' },
      { file: '/packs/wallpapers-02.zip', filename: 'wallpapers-02.zip' },
      { file: '/files/grok-bots-orbs.png', filename: 'secret.png' },
    ],
  })
  assert.match(html, />Download all \(2\)</)
  assert.match(html, /\/packs\/wallpapers-01\.zip/)
  assert.match(html, /\/packs\/wallpapers-02\.zip/)
  assert.doesNotMatch(html, /secret\.png/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})
