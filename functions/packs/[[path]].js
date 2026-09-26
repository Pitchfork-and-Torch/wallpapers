import { text } from '../_lib/http.js'
import { PACK_NAME_RE, loadPacks } from '../_lib/packs.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return text('Method not allowed', 405)
  }
  const raw = params.path
  const name = Array.isArray(raw) ? raw.join('/') : String(raw || '')
  if (!PACK_NAME_RE.test(name)) return text('Not found', 404)

  const packs = await loadPacks(env, request)
  const pack = packs.find((entry) => entry && entry.filename === name && entry.file === `/packs/${name}`)
  if (!pack) return text('Not found', 404)

  const asset = await env.ASSETS.fetch(new Request(new URL(pack.file, request.url)))
  if (!asset.ok && asset.status !== 206) return text('File missing', 404)

  const headers = new Headers()
  const length = asset.headers.get('content-length')
  const contentRange = asset.headers.get('content-range')
  if (length) headers.set('content-length', length)
  if (contentRange) headers.set('content-range', contentRange)
  headers.set('accept-ranges', asset.headers.get('accept-ranges') || 'bytes')
  headers.set('content-type', 'application/zip')
  headers.set('content-disposition', `attachment; filename="${name}"`)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-robots-tag', 'noindex')
  headers.set('cache-control', 'private, no-store')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers })
}
