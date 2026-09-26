import { validId } from './http.js'

export const PACK_NAME_RE = /^wallpapers-\d{2}\.zip$/
export const SAVE_NONCE_RE = /^[A-Za-z0-9_-]{8,64}$/

export function validSaveNonce(value) {
  return SAVE_NONCE_RE.test(String(value || ''))
}

export function packLinks(packs) {
  if (!Array.isArray(packs)) return []
  const links = []
  for (const pack of packs) {
    const filename = String(pack?.filename || '')
    const file = String(pack?.file || '')
    if (!PACK_NAME_RE.test(filename)) continue
    if (file !== `/packs/${filename}`) continue
    links.push({ href: file, filename })
  }
  return links
}

export function packItems(pack) {
  if (!pack || !Array.isArray(pack.items)) return []
  const items = []
  for (const item of pack.items) {
    const id = String(item?.id || '')
    if (!validId(id)) continue
    items.push({ id, variant: item?.variant === 'phone' ? 'phone' : 'desktop' })
  }
  return items
}

export async function loadPacks(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL('/packs.json', request.url))
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.packs) ? data.packs : []
  } catch {
    return []
  }
}
