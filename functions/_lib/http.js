const ID_RE = /^[a-z0-9-]{1,64}$/
export const FILE_RE = /^\/files\/[a-z0-9-]+\.(png|jpe?g)$/
export const NAME_RE = /^[A-Za-z0-9._-]{1,180}$/

export function validId(id) {
  return ID_RE.test(id || '')
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

export async function clientHash(request, purpose) {
  const raw = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || 'unknown'
  const ip = raw.split(',')[0].trim()
  const data = new TextEncoder().encode(`${purpose}|${ip}|wallpapers-v1`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  let hex = ''
  for (const byte of new Uint8Array(buf)) hex += byte.toString(16).padStart(2, '0')
  return hex.slice(0, 32)
}

export function sameSite(request) {
  const host = new URL(request.url).host
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false
    } catch {
      return false
    }
  }
  const sec = (request.headers.get('sec-fetch-site') || '').toLowerCase()
  if (sec && sec !== 'same-origin' && sec !== 'none') return false
  return true
}

export function isPrefetch(request) {
  const purpose = `${request.headers.get('purpose') || ''} ${request.headers.get('sec-purpose') || ''} ${request.headers.get('x-purpose') || ''}`.toLowerCase()
  const mode = (request.headers.get('sec-fetch-mode') || '').toLowerCase()
  return purpose.includes('prefetch') || mode === 'prefetch'
}

export function canonicalRedirect(request) {
  const url = new URL(request.url)
  if (url.hostname !== 'wallpapers.jonbailey.xyz') return null
  url.hostname = 'wallpaper.jonbailey.xyz'
  return Response.redirect(url, 308)
}

export function shouldCountDownload(request) {
  if (request.method !== 'GET') return false
  if (isPrefetch(request)) return false
  const dest = (request.headers.get('sec-fetch-dest') || '').toLowerCase()
  if (dest === 'image' || dest === 'script' || dest === 'style' || dest === 'font' || dest === 'manifest') {
    return false
  }
  const site = (request.headers.get('sec-fetch-site') || '').toLowerCase()
  if (!site || site === 'none') return true
  if (request.headers.get('sec-fetch-user') === '?1') return true
  // One click can queue several saves. Later files keep an empty dest and drop the user token.
  return (site === 'same-origin' || site === 'same-site') && (dest === '' || dest === 'empty')
}

export async function loadCatalog(env, request) {
  const res = await env.ASSETS.fetch(new URL('/catalog.json', request.url))
  if (!res.ok) throw new Error('catalog missing')
  const data = await res.json()
  const wallpapers = Array.isArray(data.wallpapers) ? data.wallpapers.filter((item) => (
    validId(item.id)
    && FILE_RE.test(item.file || '')
    && NAME_RE.test(item.filename || '')
    && item.preview
    && item.preview.src
  )) : []
  return {
    version: String(data.version || '1.0.0'),
    wallpapers,
  }
}

export async function loadCounts(env, ids) {
  const counts = {}
  await Promise.all(ids.map(async (id) => {
    if (!env.COUNTS) {
      counts[id] = { downloads: 0, loves: 0 }
      return
    }
    const [downloads, loves] = await Promise.all([
      env.COUNTS.get(`dl:${id}`),
      env.COUNTS.get(`love:${id}`),
    ])
    counts[id] = {
      downloads: parseInt(downloads || '0', 10) || 0,
      loves: parseInt(loves || '0', 10) || 0,
    }
  }))
  return counts
}

export async function loadLoved(env, ipHash, ids) {
  if (!env.COUNTS) return []
  const flags = await Promise.all(ids.map(async (id) => {
    const seen = await env.COUNTS.get(`loverl:${ipHash}:${id}`)
    return seen ? id : null
  }))
  return flags.filter(Boolean)
}

export async function bump(env, kind, id, dedupeKey, ttlSeconds) {
  if (!env.COUNTS) return { ok: false, duplicate: false }
  if (dedupeKey) {
    const seen = await env.COUNTS.get(dedupeKey)
    if (seen) return { ok: true, duplicate: true }
    if (ttlSeconds) await env.COUNTS.put(dedupeKey, '1', { expirationTtl: ttlSeconds })
    else await env.COUNTS.put(dedupeKey, '1')
  }
  const key = `${kind}:${id}`
  const current = parseInt((await env.COUNTS.get(key)) || '0', 10) || 0
  const value = current + 1
  await env.COUNTS.put(key, String(value))
  return { ok: true, duplicate: false, value }
}

export async function cspWithJsonLd(jsonLdRaw) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonLdRaw))
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  const hash = btoa(binary)
  return [
    "default-src 'self'",
    "img-src 'self'",
    "style-src 'self'",
    `script-src 'self' https://hits.jonbailey.xyz 'sha256-${hash}'`,
    "font-src 'self'",
    "connect-src 'self' https://hits.jonbailey.xyz",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

export function securityHeaders(extra, csp) {
  const headers = new Headers(extra || {})
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (csp) headers.set('Content-Security-Policy', csp)
  return headers
}

export function text(body, status, extra) {
  const headers = securityHeaders({
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...(extra || {}),
  })
  return new Response(body, { status, headers })
}

export function json(data, status = 200) {
  const headers = securityHeaders({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
  })
  return new Response(JSON.stringify(data), { status, headers })
}
