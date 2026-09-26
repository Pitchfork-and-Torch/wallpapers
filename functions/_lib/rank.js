const SIDE_SHELVES = new Set(['halloween', 'mace-windu', 'veil-vane'])

export function isSideShelf(item) {
  return SIDE_SHELVES.has(item?.edition)
}

export function byNewest(wallpapers) {
  return [...wallpapers].sort((a, b) => {
    if (a.added !== b.added) return a.added < b.added ? 1 : -1
    if (a.id !== b.id) return a.id < b.id ? -1 : 1
    return 0
  })
}

export function pickFeatured(wallpapers, counts) {
  if (!wallpapers.length) return { newestId: null, belovedId: null }
  const newest = byNewest(wallpapers)[0]
  const beloved = [...wallpapers].sort((a, b) => {
    const la = Number(counts[a.id]?.loves) || 0
    const lb = Number(counts[b.id]?.loves) || 0
    if (la !== lb) return lb - la
    const da = Number(counts[a.id]?.downloads) || 0
    const db = Number(counts[b.id]?.downloads) || 0
    if (da !== db) return db - da
    if (a.added !== b.added) return a.added < b.added ? 1 : -1
    if (a.id !== b.id) return a.id < b.id ? -1 : 1
    return 0
  })[0]
  const pinned = wallpapers.find((item) => item.featured)
  return {
    newestId: newest.id,
    belovedId: beloved.id,
    featuredId: pinned ? pinned.id : null,
  }
}

export function flagsFor(id, featured) {
  const flags = []
  if (id && id === featured.featuredId) flags.push('Featured')
  if (id && id === featured.belovedId) flags.push('Most loved')
  if (id && id === featured.newestId) flags.push('Newest')
  return flags
}
