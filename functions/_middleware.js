import { canonicalRedirect } from './_lib/http.js'

export async function onRequest(context) {
  const redirect = canonicalRedirect(context.request)
  if (redirect) return redirect
  return context.next()
}
