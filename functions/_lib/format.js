export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function countLabel(n, one, many) {
  const v = Number(n) || 0
  return `${new Intl.NumberFormat('en-US').format(v)} ${v === 1 ? one : many}`
}

export function totalDownloads(counts) {
  let total = 0
  for (const stats of Object.values(counts || {})) {
    total += Number(stats?.downloads) || 0
  }
  return total
}
