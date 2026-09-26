import { isSideShelf, pickFeatured } from '../_lib/rank.js'
import { clientHash, json, loadCatalog, loadCounts, loadLoved, text } from '../_lib/http.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return text('Method not allowed', 405)
  }
  try {
    const catalog = await loadCatalog(env, request)
    const ids = catalog.wallpapers.map((item) => item.id)
    const [counts, ip] = await Promise.all([
      loadCounts(env, ids),
      clientHash(request, 'love'),
    ])
    const lovedIds = await loadLoved(env, ip, ids)
    const ranked = catalog.wallpapers.filter((item) => !isSideShelf(item))
    const featured = pickFeatured(ranked.length ? ranked : catalog.wallpapers, counts)
    const pinnedItem = catalog.wallpapers.find((item) => item.featured)
    if (pinnedItem) featured.featuredId = pinnedItem.id
    return json({ ...featured, counts, lovedIds })
  } catch {
    return text('Board unavailable.', 500)
  }
}
