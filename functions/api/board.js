import { isHeroEligible, isSideShelf, pickFeatured } from '../_lib/rank.js'
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
    const mainSet = catalog.wallpapers.filter((item) => !isSideShelf(item))
    const heroPool = catalog.wallpapers.filter((item) => isHeroEligible(item))
    const featured = pickFeatured(heroPool.length ? heroPool : catalog.wallpapers, counts)
    const lovedPick = pickFeatured(mainSet.length ? mainSet : catalog.wallpapers, counts)
    if (mainSet.length) featured.belovedId = lovedPick.belovedId
    return json({ ...featured, counts, lovedIds })
  } catch {
    return text('Board unavailable.', 500)
  }
}
