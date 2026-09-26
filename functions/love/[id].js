import { bump, clientHash, loadCatalog, sameSite, text, validId } from '../_lib/http.js'

function home(request, id) {
  const url = new URL('/', request.url)
  url.hash = `wallpaper-${id}`
  return Response.redirect(url, 303)
}

export async function onRequest(context) {
  const { request, env, params } = context
  const id = params.id
  if (!validId(id)) return text('Not found', 404)
  if (request.method === 'GET') return home(request, id)
  if (request.method !== 'POST') return text('Method not allowed', 405)
  if (!sameSite(request)) return text('Forbidden', 403)

  let catalog
  try {
    catalog = await loadCatalog(env, request)
  } catch {
    return text('Wallpapers are unavailable right now.', 500)
  }
  if (!catalog.wallpapers.some((entry) => entry.id === id)) return text('Not found', 404)

  const ip = await clientHash(request, 'love')
  await bump(env, 'love', id, `loverl:${ip}:${id}`)
  return home(request, id)
}
