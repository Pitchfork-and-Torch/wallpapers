import { bump, clientHash, json, loadCatalog, loadCounts, sameSite, text } from '../_lib/http.js'
import { loadPacks, packItems, validSaveNonce } from '../_lib/packs.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return text('Method not allowed', 405)
  if (!sameSite(request)) return text('Forbidden', 403)

  let nonce = ''
  try {
    const body = await request.json()
    nonce = String(body?.nonce || '')
  } catch {
    return text('Bad request', 400)
  }
  if (!validSaveNonce(nonce)) return text('Bad request', 400)

  let catalog
  let packs
  try {
    ;[catalog, packs] = await Promise.all([
      loadCatalog(env, request),
      loadPacks(env, request),
    ])
  } catch {
    return text('Wallpapers are unavailable right now.', 500)
  }

  const known = new Set(catalog.wallpapers.map((item) => item.id))
  const ids = []
  const seen = new Set()
  for (const pack of packs) {
    for (const item of packItems(pack)) {
      if (!known.has(item.id) || seen.has(item.id)) continue
      seen.add(item.id)
      ids.push(item.id)
    }
  }

  const ip = await clientHash(request, 'dl')
  for (let i = 0; i < ids.length; i += 12) {
    const slice = ids.slice(i, i + 12)
    await Promise.all(slice.map((id) => bump(
      env,
      'dl',
      id,
      `dlrl:${ip}:${id}:set:${nonce}`,
      86400,
    )))
  }

  const counts = await loadCounts(env, catalog.wallpapers.map((item) => item.id))
  return json({ ok: true, counts })
}
