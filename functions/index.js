import { clientHash, loadCatalog, loadCounts, loadLoved, securityHeaders, text } from './_lib/http.js'
import { loadPacks } from './_lib/packs.js'
import { renderPage } from './_lib/render.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return text('Method not allowed', 405)
  }
  try {
    const catalog = await loadCatalog(env, request)
    const ids = catalog.wallpapers.map((item) => item.id)
    const [counts, ip, packs] = await Promise.all([
      loadCounts(env, ids),
      clientHash(request, 'love'),
      loadPacks(env, request),
    ])
    const lovedIds = await loadLoved(env, ip, ids)
    const { html, csp } = await renderPage({
      wallpapers: catalog.wallpapers,
      counts,
      lovedIds,
      version: catalog.version,
      packs,
    })
    const headers = securityHeaders({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
    }, csp)
    return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers })
  } catch {
    return text('Wallpapers are unavailable right now.', 500)
  }
}
