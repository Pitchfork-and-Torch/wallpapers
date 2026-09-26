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

test('the newest wallpaper opens the large view ahead of an older pin', async () => {
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
  assert.ok(hero.indexOf('id="wallpaper-newer"') < hero.indexOf('id="wallpaper-older"'))
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
  assert.match(hero, /id="wallpaper-lanterns"/)
  assert.doesNotMatch(html, /id="shelf-lanterns"/)
  assert.equal((html.match(/<div class="frame" id="lanterns">/g) || []).length, 1)
  assert.match(html, /id="shelf-newer"/)
  assert.equal((html.match(/data-downloads-for="lanterns"/g) || []).length, 1)
  assert.match(html, /data-total-downloads>7 downloads</)
  assert.match(html, /What is the limited edition\?/)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('the newest wallpaper opens ahead of an older pin and the limited edition follows', async () => {
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
  assert.ok(hero.indexOf('id="wallpaper-lanterns"') < hero.indexOf('id="wallpaper-newer"'))
  assert.ok(hero.indexOf('id="wallpaper-newer"') < hero.indexOf('id="wallpaper-older"'))
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
  assert.ok(html.indexOf('id="all-title"') < html.indexOf('id="mace-title"'))
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
  assert.ok(html.indexOf('id="all-title"') < html.indexOf('id="veil-title"'))
  assert.match(html, />Veil &amp; Vane Award Winners</)
  assert.match(html, /Honorary wallpapers for the first person to read the hidden phrase/)
  assert.match(html, /id="veil-valhallabtc-award"/)
  assert.match(html, /<div class="frame" id="valhallabtc-award">/)
  assert.match(html, />Veil &amp; Vane</)
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  const veilCard = html.slice(html.indexOf('id="veil-valhallabtc-award"'), html.indexOf('id="faq-title"'))
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

test('a featured flag on a Veil and Vane award does not open the large view', async () => {
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
  const opener = hero.slice(0, hero.indexOf('id="wallpaper-older"'))
  assert.doesNotMatch(hero, /valhallabtc-award/)
  assert.match(opener, /id="wallpaper-grok-bots-vinyl-friday"/)
  assert.match(opener, />Featured</)
  assert.match(opener, />Newest</)
  assert.doesNotMatch(opener, />Veil &amp; Vane</)
  assert.equal((html.match(/<div class="frame" id="valhallabtc-award">/g) || []).length, 1)
  assert.match(html, /id="veil-valhallabtc-award"/)
  assert.doesNotMatch(html, /id="shelf-valhallabtc-award"/)
  assert.match(html, /id="shelf-grok-bots-vinyl-friday"/)
  assert.ok(html.indexOf('id="all-title"') < html.indexOf('id="veil-title"'))
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('the Final Fantasy 7 section stays off the main shelf and the newest one opens', async () => {
  const plate = wallpaper('grok-bots-plate-city', 'Grok Bots, Plate City', '2026-10-04T23:00:00')
  plate.edition = 'final-fantasy-7'
  const flowers = wallpaper('grok-bots-slum-flowers', 'Grok Bots, Slum Flowers', '2026-10-04')
  flowers.edition = 'final-fantasy-7'
  const special = wallpaper('valhallabtc-award', 'Valhallabtc', '2026-10-02')
  special.edition = 'veil-vane'
  special.featured = true
  const mace = wallpaper('out-the-window', 'Out the Window', '2026-10-05')
  mace.edition = 'mace-windu'
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      plate,
      flowers,
      special,
      mace,
    ],
    counts: {
      older: { loves: 4, downloads: 1 },
      newer: { loves: 0, downloads: 9 },
      'grok-bots-plate-city': { loves: 0, downloads: 1 },
      'grok-bots-slum-flowers': { loves: 8, downloads: 3 },
      'valhallabtc-award': { loves: 9, downloads: 9 },
      'out-the-window': { loves: 9, downloads: 9 },
    },
    lovedIds: [],
    version: '1.3.23',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  const opener = hero.slice(0, hero.indexOf('id="wallpaper-newer"'))
  assert.match(opener, /id="wallpaper-grok-bots-plate-city"/)
  assert.match(opener, />Featured</)
  assert.match(opener, />Newest</)
  assert.match(opener, />Final Fantasy 7</)
  assert.doesNotMatch(hero, /valhallabtc-award|out-the-window|slum-flowers/)
  assert.match(html, /id="ff7-title"/)
  assert.match(html, />Final Fantasy 7</)
  assert.doesNotMatch(html, /id="shelf-grok-bots-plate-city"/)
  assert.doesNotMatch(html, /id="shelf-grok-bots-slum-flowers"/)
  assert.match(html, /id="ff7-grok-bots-plate-city"/)
  assert.match(html, /data-added="2026-10-04T23:00:00"/)
  assert.match(html, /data-sort="recent"/)
  assert.match(html, /data-sort="popular"/)
  assert.match(html, />Most recent</)
  assert.match(html, />Most popular</)
  assert.ok(html.indexOf('id="ff7-title"') < html.indexOf('id="all-title"'))
  assert.ok(html.indexOf('id="all-title"') < html.indexOf('id="veil-title"'))
  assert.ok(html.indexOf('id="veil-title"') < html.indexOf('id="mace-title"'))
  assert.match(html, /id="shelf-older"[\s\S]*?>Most loved</)
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('the Akira (1988) section stays off the main shelf and the newest one opens', async () => {
  const highway = wallpaper('grok-bots-night-highway', 'Grok Bots, Night Highway', '2026-10-06T00:12:00')
  highway.edition = 'akira-1988'
  const alley = wallpaper('grok-bots-steam-alley', 'Grok Bots, Steam Alley', '2026-10-06T00:11:00')
  alley.edition = 'akira-1988'
  const plate = wallpaper('grok-bots-plate-city', 'Grok Bots, Plate City', '2026-10-04T23:00:00')
  plate.edition = 'final-fantasy-7'
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      plate,
      alley,
      highway,
    ],
    counts: {
      older: { loves: 4, downloads: 1 },
      newer: { loves: 1, downloads: 2 },
      'grok-bots-plate-city': { loves: 0, downloads: 1 },
      'grok-bots-steam-alley': { loves: 3, downloads: 1 },
      'grok-bots-night-highway': { loves: 0, downloads: 1 },
    },
    lovedIds: [],
    version: '1.3.28',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  const opener = hero.slice(0, hero.indexOf('id="wallpaper-newer"'))
  assert.match(opener, /id="wallpaper-grok-bots-night-highway"/)
  assert.match(opener, />Featured</)
  assert.match(opener, />Newest</)
  assert.match(opener, />Akira \(1988\)</)
  assert.doesNotMatch(hero, /steam-alley|plate-city/)
  assert.match(html, /id="akira-title"/)
  assert.match(html, />Akira \(1988\)</)
  assert.doesNotMatch(html, /id="shelf-grok-bots-night-highway"/)
  assert.doesNotMatch(html, /id="shelf-grok-bots-steam-alley"/)
  assert.match(html, /id="akira-grok-bots-night-highway"/)
  assert.match(html, /id="shelf-older"[\s\S]*?>Most loved</)
  assert.ok(html.indexOf('id="akira-title"') < html.indexOf('id="ff7-title"'))
  assert.ok(html.indexOf('id="ff7-title"') < html.indexOf('id="all-title"'))
  assert.doesNotMatch(html, /\u2014|\u2013/)
})

test('the Cowboy Bebop section stays off the main shelf and the newest one opens', async () => {
  const dock = wallpaper('grok-bots-dock-catwalk', 'Grok Bots, Dock Catwalk', '2026-10-10T18:05:00')
  dock.edition = 'cowboy-bebop'
  const bar = wallpaper('grok-bots-dust-bar', 'Grok Bots, Dust Bar', '2026-10-10T18:04:00')
  bar.edition = 'cowboy-bebop'
  const highway = wallpaper('grok-bots-night-highway', 'Grok Bots, Night Highway', '2026-10-06T00:12:00')
  highway.edition = 'akira-1988'
  const { html } = await renderPage({
    wallpapers: [
      wallpaper('older', 'Older Piece', '2026-09-01'),
      wallpaper('newer', 'Newer Piece', '2026-09-26'),
      highway,
      bar,
      dock,
    ],
    counts: {
      older: { loves: 4, downloads: 1 },
      newer: { loves: 1, downloads: 2 },
      'grok-bots-night-highway': { loves: 0, downloads: 1 },
      'grok-bots-dust-bar': { loves: 3, downloads: 1 },
      'grok-bots-dock-catwalk': { loves: 0, downloads: 1 },
    },
    lovedIds: [],
    version: '1.3.30',
  })
  const hero = html.slice(html.indexOf('data-hero-rail'), html.indexOf('data-hero-count'))
  const opener = hero.slice(0, hero.indexOf('id="wallpaper-newer"'))
  assert.match(opener, /id="wallpaper-grok-bots-dock-catwalk"/)
  assert.match(opener, />Featured</)
  assert.match(opener, />Newest</)
  assert.match(opener, />Cowboy Bebop</)
  assert.doesNotMatch(hero, /dust-bar|night-highway/)
  assert.match(html, /id="bebop-title"/)
  assert.match(html, />Cowboy Bebop</)
  assert.doesNotMatch(html, /id="shelf-grok-bots-dock-catwalk"/)
  assert.doesNotMatch(html, /id="shelf-grok-bots-dust-bar"/)
  assert.match(html, /id="bebop-grok-bots-dock-catwalk"/)
  assert.match(html, /id="shelf-older"[\s\S]*?>Most loved</)
  assert.ok(html.indexOf('id="bebop-title"') < html.indexOf('id="akira-title"'))
  assert.ok(html.indexOf('id="akira-title"') < html.indexOf('id="all-title"'))
  assert.match(html, /What is the Cowboy Bebop section\?/)
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
