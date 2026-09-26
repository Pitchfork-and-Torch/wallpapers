import { FILE_RE, NAME_RE, bump, loadCatalog, shouldCountDownload, text, validId } from '../_lib/http.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return text('Method not allowed', 405)
  }
  const id = params.id
  if (!validId(id)) return text('Not found', 404)

  let catalog
  try {
    catalog = await loadCatalog(env, request)
  } catch {
    return text('Wallpapers are unavailable right now.', 500)
  }
  const item = catalog.wallpapers.find((entry) => entry.id === id)
  if (!item) return text('Not found', 404)

  const wantPhone = new URL(request.url).searchParams.get('screen') === 'phone'
  const chosen = wantPhone ? item.phone : item
  if (!chosen || !FILE_RE.test(chosen.file || '') || !NAME_RE.test(chosen.filename || '')) {
    return text('Not found', 404)
  }

  const assetHeaders = new Headers()
  const range = request.headers.get('range')
  if (range) assetHeaders.set('range', range)
  const asset = await env.ASSETS.fetch(new Request(new URL(chosen.file, request.url), { headers: assetHeaders }))
  if (!asset.ok && asset.status !== 206) return text('File missing', 404)
  const type = (asset.headers.get('content-type') || '').toLowerCase()
  if (!type.includes('image/')) return text('File missing', 404)

  const freshDownload = !range || range.replace(/\s/g, '').toLowerCase().startsWith('bytes=0-')
  if (shouldCountDownload(request) && freshDownload) {
    await bump(env, 'dl', id)
  }

  const headers = new Headers()
  const length = asset.headers.get('content-length')
  const contentRange = asset.headers.get('content-range')
  if (length) headers.set('content-length', length)
  if (contentRange) headers.set('content-range', contentRange)
  headers.set('accept-ranges', asset.headers.get('accept-ranges') || 'bytes')
  headers.set('content-type', chosen.mime || item.mime || 'image/png')
  headers.set('content-disposition', `attachment; filename="${chosen.filename}"`)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-robots-tag', 'noindex')
  headers.set('cache-control', 'private, no-store')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers })
}
