// Node lacks the Cache Storage API used by src/lib/fetch-tarball.ts, so the
// verify script fetches directly.
export async function fetchTarballNode (url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Tarball fetch failed: ${res.status}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}
