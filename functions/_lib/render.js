import { byNewest, flagsFor, isHeroEligible, isSideShelf, pickFeatured } from './rank.js'
import { countLabel, formatBytes, totalDownloads } from './format.js'
import { FILE_RE, NAME_RE, cspWithJsonLd, esc } from './http.js'
import { packLinks } from './packs.js'

const CANONICAL = 'https://wallpaper.jonbailey.xyz/'

const FAQ = [
  {
    q: 'Are the wallpapers full resolution?',
    a: 'Yes. The download is the original file, at the pixel size it was made. The picture on this page is a smaller preview. Where a phone-shaped file exists, that download is full resolution too. Download all counts a save of every wallpaper in the set.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. There is nothing to sign up for and nothing to log in to.',
  },
  {
    q: 'How much do they cost?',
    a: 'They are free.',
  },
  {
    q: 'How do I share a wallpaper?',
    a: 'Use Share on the picture. It copies a link that opens that wallpaper.',
  },
  {
    q: 'How does a wallpaper get featured?',
    a: 'The newest wallpaper opens the large view. Swipe, or use Previous and Next, to move through the rest. Newest is the wallpaper added most recently. Most loved is the one with the most loves on the main shelf. If loves are tied, the one with more downloads is most loved. If that also ties, the newer wallpaper wins. You can love each wallpaper once from your network. Downloads are counted when the original file is saved. Most recent and Most popular reorder each section. Most popular follows download counts.',
  },
  {
    q: 'What is the limited edition?',
    a: 'A separate section of spooky scary Halloween Grok Bot desktop wallpapers. They are full resolution and free. While that set is current, one of them sits in the large view after the newest wallpaper. The set stays out of the main shelf.',
  },
  {
    q: 'What is the Cowboy Bebop section?',
    a: 'A separate section of Grok Bot desktop wallpapers in a jazz-noir colony: red dust, a cramped ship, and a bar that stays open late. They are full resolution and free. The set stays out of the main shelf. The newest wallpaper on the site opens the large view, including one from this set when it is the newest.',
  },
  {
    q: 'What is the Akira (1988) section?',
    a: 'A separate section of Grok Bot desktop wallpapers in a late-1980s megacity at night. They are full resolution and free. The set stays out of the main shelf. The newest wallpaper on the site opens the large view, including one from this set when it is the newest.',
  },
  {
    q: 'What is the Final Fantasy 7 section?',
    a: 'A separate section of Grok Bot desktop wallpapers in places that echo that world. They are full resolution and free. The set stays out of the main shelf. The newest wallpaper on the site opens the large view, including one from this set when it is the newest.',
  },
  {
    q: 'What is the Mace Windu collection?',
    a: 'A separate section of Grok Bot wallpapers about a very tall window. They are full resolution and free. The set stays out of the main shelf and out of the large view.',
  },
  {
    q: 'What is the Veil & Vane Award Winners section?',
    a: 'A separate section of honorary wallpapers for people who read the hidden phrase. They are full resolution and free. The set stays out of the main shelf and out of the large view.',
  },
]

function fileKind(entry) {
  const mime = String(entry?.mime || '')
  const file = String(entry?.file || '')
  if (mime.includes('jpeg') || file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'JPEG'
  return 'PNG'
}

function phoneFile(w) {
  const phone = w.phone
  if (!phone || typeof phone !== 'object') return null
  if (!FILE_RE.test(phone.file || '') || !NAME_RE.test(phone.filename || '')) return null
  if (!Number(phone.width) || !Number(phone.height)) return null
  return phone
}

function piece(w, counts, lovedIds, options) {
  const stats = counts[w.id] || { downloads: 0, loves: 0 }
  const loved = lovedIds.has(w.id)
  const flags = options.flags || []
  const heading = options.heading || 'h2'
  const priority = options.priority ? ' fetchpriority="high"' : ''
  const loading = options.priority ? 'eager' : 'lazy'
  const decoding = options.priority ? 'sync' : 'async'
  const sizes = options.large
    ? '(min-width: 1720px) 1680px, calc(100vw - 40px)'
    : '(min-width: 900px) 360px, calc(100vw - 40px)'
  const flagHtml = flags.length
    ? `<p class="flags">${flags.map((flag) => `<span>${esc(flag)}</span>`).join('')}</p>`
    : ''
  const summary = options.large && w.summary
    ? `<p class="summary">${esc(w.summary)}</p>`
    : ''
  const credit = options.large
    ? '<p class="by">Jon Bailey</p>'
    : ''
  const phone = phoneFile(w)
  const kind = fileKind(w)
  const specs = phone
    ? `${Number(w.width)} &times; ${Number(w.height)} desktop, ${Number(phone.width)} &times; ${Number(phone.height)} phone, ${esc(kind)}, ${esc(formatBytes(w.bytes))}`
    : `${Number(w.width)} &times; ${Number(w.height)}, ${esc(w.aspect)}, ${esc(kind)}, ${esc(formatBytes(w.bytes))}`
  const deskClass = phone ? 'btn btn-desk' : 'btn'
  const deskLabel = phone ? 'Download desktop' : 'Download full resolution'
  const phoneBtn = phone
    ? `<a class="btn quiet btn-phone" href="/dl/${esc(w.id)}?screen=phone" data-download="${esc(w.id)}" download="${esc(phone.filename)}">Download for phone</a>`
    : ''
  const shareUrl = `${CANONICAL}#${w.id}`
  const frameId = options.shareTarget ? ` id="${esc(w.id)}"` : ''

  return `<article class="piece${options.large ? ' piece-large' : ''}" id="${esc(options.domId)}" data-wallpaper-id="${esc(w.id)}" data-added="${esc(w.added || '')}" data-downloads="${Number(stats.downloads) || 0}">
    ${flagHtml}
    <div class="frame"${frameId}>
      <img src="${esc(w.preview.src)}" srcset="${esc(w.preview.srcset)}" sizes="${sizes}" width="${Number(w.width)}" height="${Number(w.height)}" alt="${esc(w.alt || w.title)}" loading="${loading}" decoding="${decoding}"${priority}>
      <button type="button" class="share" data-share-url="${esc(shareUrl)}" aria-label="Copy link to ${esc(w.title)}" aria-live="polite">Share</button>
    </div>
    <div class="label">
      <div class="meta">
        <${heading}>${esc(w.title)}</${heading}>
        ${summary}
        <p class="specs">${specs}</p>
        ${credit}
        ${options.showStats === false ? '' : `<p class="counts"><span data-loves-for="${esc(w.id)}">${esc(countLabel(stats.loves, 'love', 'loves'))}</span>, <span data-downloads-for="${esc(w.id)}">${esc(countLabel(stats.downloads, 'download', 'downloads'))}</span></p>`}
      </div>
      <div class="actions">
        <a class="${deskClass}" href="/dl/${esc(w.id)}" data-download="${esc(w.id)}" download="${esc(w.filename)}">${deskLabel}</a>
        ${phoneBtn}
        <form method="post" action="/love/${esc(w.id)}">
          <button class="btn quiet" type="submit" aria-pressed="${loved ? 'true' : 'false'}">${loved ? 'Loved' : 'Love'}</button>
        </form>
      </div>
    </div>
  </article>`
}

function isHalloween(item) {
  return item.edition === 'halloween'
}

function isMace(item) {
  return item.edition === 'mace-windu'
}

function isVeil(item) {
  return item.edition === 'veil-vane'
}

function isFf7(item) {
  return item.edition === 'final-fantasy-7'
}

function isAkira(item) {
  return item.edition === 'akira-1988'
}

function isBebop(item) {
  return item.edition === 'cowboy-bebop'
}

function editionLead(items) {
  const leads = byNewest(items.filter((item) => item.editionFeatured))
  return leads[0] || null
}

function editionFlag(item) {
  if (isHalloween(item)) return 'Limited edition'
  if (isMace(item)) return 'Mace Windu'
  if (isVeil(item)) return 'Veil & Vane'
  if (isFf7(item)) return 'Final Fantasy 7'
  if (isAkira(item)) return 'Akira (1988)'
  if (isBebop(item)) return 'Cowboy Bebop'
  return ''
}

function heroSlides(mainSet, lead, pinned) {
  const slides = []
  const seen = new Set()
  const push = (item) => {
    if (!item || seen.has(item.id)) return
    seen.add(item.id)
    slides.push(item)
  }
  if (pinned) push(pinned)
  push(lead)
  for (const item of byNewest(mainSet)) push(item)
  return slides
}

function downloadAll(packs) {
  const links = packLinks(packs)
  if (!links.length) return ''
  const label = links.length === 1 ? 'Download all' : `Download all (${links.length})`
  return `<button type="button" class="btn quiet btn-all" data-download-all data-packs="${esc(JSON.stringify(links))}">${label}</button>`
}

export async function renderPage({ wallpapers, counts, lovedIds, version, packs }) {
  const mainSet = wallpapers.filter((item) => !isSideShelf(item))
  const halloween = byNewest(wallpapers.filter(isHalloween))
  const mace = byNewest(wallpapers.filter(isMace))
  const veil = byNewest(wallpapers.filter(isVeil))
  const ff7 = byNewest(wallpapers.filter(isFf7))
  const akira = byNewest(wallpapers.filter(isAkira))
  const bebop = byNewest(wallpapers.filter(isBebop))
  const heroPool = wallpapers.filter(isHeroEligible)
  const lovedPool = mainSet.length ? mainSet : wallpapers
  const openerPool = heroPool.length ? heroPool : wallpapers
  const featured = pickFeatured(openerPool, counts)
  const lovedPick = pickFeatured(lovedPool, counts)
  if (mainSet.length) featured.belovedId = lovedPick.belovedId
  const lovedSet = new Set(lovedIds || [])
  const byId = new Map(wallpapers.map((item) => [item.id, item]))
  const newest = byId.get(featured.newestId)
  const loved = byId.get(featured.belovedId)
  const description = wallpapers.length
    ? `Original wallpapers at full resolution. No account. Free. Newest: ${newest?.title || 'none'}. Most loved: ${loved?.title || 'none'}.`
    : 'Original wallpapers at full resolution. No account. Free.'
  const hero = byId.get(featured.featuredId) || newest
  const imageAlt = hero?.alt || 'Wallpaper preview'
  const ver = version || '1.0.0'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Wallpapers',
        url: CANONICAL,
        description: 'Original wallpapers at full resolution. No account. Free.',
        author: { '@type': 'Person', name: 'Jon Bailey', url: 'https://jonbailey.xyz/' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }
  const jsonLdRaw = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
  const csp = await cspWithJsonLd(jsonLdRaw)
  const lead = editionLead(halloween)
  const pinned = featured.featuredId ? byId.get(featured.featuredId) : null
  const heroOrder = heroSlides(mainSet, lead, pinned)
  const featureHtml = heroOrder.length
    ? `<div class="hero">
        <div class="hero-rail" data-hero-rail tabindex="0" aria-label="Large view">
          ${heroOrder.map((item, index) => {
            const extra = editionFlag(item)
            const flags = flagsFor(item.id, featured)
            return piece(item, counts, lovedSet, {
            large: true,
            priority: index === 0,
            flags: extra ? [...flags, extra] : flags,
            heading: 'h2',
            domId: `wallpaper-${item.id}`,
            shareTarget: true,
            showStats: wallpapers.length < 2,
          })
          }).join('')}
        </div>
        <div class="hero-nav">
          <button type="button" class="btn quiet hero-step" data-hero="prev">Previous</button>
          <p class="hero-count" data-hero-count aria-live="polite">1 / ${heroOrder.length}</p>
          <button type="button" class="btn quiet hero-step" data-hero="next">Next</button>
        </div>
      </div>`
    : '<p class="empty">No wallpapers yet.</p>'
  const bebopShelf = bebop.length
    ? `<section class="shelf edition" aria-labelledby="bebop-title">
        <h2 class="section-title" id="bebop-title">Cowboy Bebop</h2>
        <p class="edition-lead">Grok Bots in a jazz-noir colony: red dust, a cramped ship, and a bar that stays open late.</p>
        <div class="shelf-grid">
          ${bebop.map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: [...flagsFor(item.id, featured), 'Cowboy Bebop'],
            heading: 'h3',
            domId: `bebop-${item.id}`,
            shareTarget: item.id !== featured.featuredId,
          })).join('')}
        </div>
      </section>`
    : ''
  const akiraShelf = akira.length
    ? `<section class="shelf edition" aria-labelledby="akira-title">
        <h2 class="section-title" id="akira-title">Akira (1988)</h2>
        <p class="edition-lead">Grok Bots on rain-black avenues, a red bike, and a city that outgrew its century.</p>
        <div class="shelf-grid">
          ${akira.map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: [...flagsFor(item.id, featured), 'Akira (1988)'],
            heading: 'h3',
            domId: `akira-${item.id}`,
            shareTarget: item.id !== featured.featuredId,
          })).join('')}
        </div>
      </section>`
    : ''
  const ff7Shelf = ff7.length
    ? `<section class="shelf edition" aria-labelledby="ff7-title">
        <h2 class="section-title" id="ff7-title">Final Fantasy 7</h2>
        <p class="edition-lead">Grok Bots, in a city of plates and the places around it.</p>
        <div class="shelf-grid">
          ${ff7.map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: [...flagsFor(item.id, featured), 'Final Fantasy 7'],
            heading: 'h3',
            domId: `ff7-${item.id}`,
            shareTarget: item.id !== featured.featuredId,
          })).join('')}
        </div>
      </section>`
    : ''
  const sortBar = (bebop.length || akira.length || ff7.length || mainSet.length > 1 || halloween.length || veil.length || mace.length)
    ? `<div class="sortbar" data-sort-bar>
        <button type="button" class="btn quiet" data-sort="recent" aria-pressed="true">Most recent</button>
        <button type="button" class="btn quiet" data-sort="popular" aria-pressed="false">Most popular</button>
      </div>`
    : ''
  const shelf = mainSet.length > 1
    ? `<section class="shelf" aria-labelledby="all-title">
        <h2 class="section-title" id="all-title">All wallpapers</h2>
        <div class="shelf-grid">
          ${byNewest(mainSet).map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: flagsFor(item.id, featured),
            heading: 'h3',
            domId: `shelf-${item.id}`,
            shareTarget: false,
          })).join('')}
        </div>
      </section>`
    : ''
  const edition = halloween.length
    ? `<section class="shelf edition" aria-labelledby="edition-title">
        <h2 class="section-title" id="edition-title">Limited edition</h2>
        <p class="edition-lead">Spooky scary Halloween Grok Bot desktop wallpapers.</p>
        <div class="shelf-grid">
          ${halloween.map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: [...flagsFor(item.id, featured), 'Limited edition'],
            heading: 'h3',
            domId: `edition-${item.id}`,
            shareTarget: item.id !== featured.featuredId && (!lead || item.id !== lead.id),
          })).join('')}
        </div>
      </section>`
    : ''
  const veilShelf = veil.length
    ? `<section class="shelf edition" aria-labelledby="veil-title">
        <h2 class="section-title" id="veil-title">Veil &amp; Vane Award Winners</h2>
        <p class="edition-lead">Honorary wallpapers for the first person to read the hidden phrase.</p>
        <div class="shelf-grid">
          ${veil.map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: [...flagsFor(item.id, featured), 'Veil & Vane'],
            heading: 'h3',
            domId: `veil-${item.id}`,
            shareTarget: true,
          })).join('')}
        </div>
      </section>`
    : ''
  const maceShelf = mace.length
    ? `<section class="shelf edition" aria-labelledby="mace-title">
        <h2 class="section-title" id="mace-title">Mace Windu</h2>
        <p class="edition-lead">Grok Bots, and a very tall window.</p>
        <div class="shelf-grid">
          ${mace.map((item) => piece(item, counts, lovedSet, {
            large: false,
            priority: false,
            flags: [...flagsFor(item.id, featured), 'Mace Windu'],
            heading: 'h3',
            domId: `mace-${item.id}`,
            shareTarget: true,
          })).join('')}
        </div>
      </section>`
    : ''
  const faq = FAQ.map((item) => `<div class="qa"><h3>${esc(item.q)}</h3><p>${esc(item.a)}</p></div>`).join('')
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wallpapers</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${CANONICAL}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#e6eef6" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e1216" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Wallpapers">
  <meta property="og:title" content="Wallpapers">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${CANONICAL}">
  <meta property="og:image" content="${CANONICAL}og.jpg?v=${esc(ver)}">
  <meta property="og:image:secure_url" content="${CANONICAL}og.jpg?v=${esc(ver)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@suddenlyjon">
  <meta name="twitter:creator" content="@suddenlyjon">
  <meta name="twitter:title" content="Wallpapers">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${CANONICAL}og.jpg?v=${esc(ver)}">
  <meta name="twitter:image:alt" content="${esc(imageAlt)}">
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="preload" href="/fonts/fontshare/clash-display/woff2/ClashDisplay-Semibold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/fontshare/satoshi/woff2/Satoshi-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/fonts/fontshare/fonts.css">
  <link rel="stylesheet" href="/styles.css?v=${esc(ver)}">
  <script type="application/ld+json">${jsonLdRaw}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to wallpapers</a>
  <header class="site-header">
    <div class="wrap">
      <div class="tally-row">
        ${downloadAll(packs)}
        <p class="tally"><span data-total-downloads>${esc(countLabel(totalDownloads(counts), 'download', 'downloads'))}</span></p>
      </div>
      <div class="bar">
        <a class="wordmark" href="/"><h1>Wallpapers</h1></a>
        <p class="promises">Full resolution. No account. Free.</p>
      </div>
    </div>
  </header>
  <main id="main">
    <div class="wrap">
      <section class="feature" aria-label="Wallpapers">
        ${featureHtml}
      </section>
      ${sortBar}
      ${bebopShelf}
      ${akiraShelf}
      ${ff7Shelf}
      ${shelf}
      ${edition}
      ${veilShelf}
      ${maceShelf}
      <section class="faq" aria-labelledby="faq-title">
        <h2 class="section-title" id="faq-title">Questions</h2>
        ${faq}
      </section>
    </div>
  </main>
  <footer class="site-footer">
    <div class="wrap foot">
      <p><a href="https://jonbailey.xyz/">Jon Bailey</a></p>
    </div>
  </footer>
  <script src="/app.js?v=${esc(ver)}" defer></script>
  <script defer src="https://hits.jonbailey.xyz/c.js" data-site="wallpapers"></script>
</body>
</html>`
  return { html, csp }
}
