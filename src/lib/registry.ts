/**
 * npm registry helpers. registry.npmjs.org sends `Access-Control-Allow-Origin: *`
 * for both metadata and tarballs, so everything here works directly from the
 * browser with no proxy.
 */

const REGISTRY = 'https://registry.npmjs.org'

function encodeName (name: string): string {
  // Scoped names (`@scope/pkg`) must keep their slash un-encoded in the path.
  return name.startsWith('@') ? name.replace('/', '%2f') : name
}

interface PackumentVersion {
  version: string
  dist: { tarball: string }
}

interface Packument {
  'dist-tags': Record<string, string>
  'versions': Record<string, PackumentVersion>
  'time'?: Record<string, string>
}

const packumentCache = new Map<string, Promise<Packument>>()

function fetchPackument (name: string): Promise<Packument> {
  const key = name.toLowerCase()
  let pending = packumentCache.get(key)
  if (!pending) {
    pending = fetch(`${REGISTRY}/${encodeName(name)}`, {
      headers: { Accept: 'application/json' },
    }).then(async res => {
      if (!res.ok) {
        throw new Error(`Registry returned ${res.status} for "${name}"`)
      }
      return res.json() as Promise<Packument>
    })
    packumentCache.set(key, pending)
  }
  return pending
}

export interface ResolvedVersion {
  name: string
  version: string
  tarball: string
}

/** Resolve a version or dist-tag (e.g. `latest`) to a concrete tarball URL. */
export async function resolveTarball (name: string, versionOrTag: string): Promise<ResolvedVersion> {
  const pack = await fetchPackument(name)
  const version = pack['dist-tags']?.[versionOrTag] ?? versionOrTag
  const entry = pack.versions[version]
  if (!entry) {
    throw new Error(`Version "${versionOrTag}" not found for "${name}"`)
  }
  return { name, version, tarball: entry.dist.tarball }
}

/** List published versions newest-first, plus available dist-tags. */
export async function listVersions (name: string): Promise<{ versions: string[], tags: Record<string, string> }> {
  const pack = await fetchPackument(name)
  const time = pack.time ?? {}
  const versions = Object.keys(pack.versions).toSorted((a, b) => {
    const ta = time[a] ? Date.parse(time[a]) : 0
    const tb = time[b] ? Date.parse(time[b]) : 0
    return tb - ta
  })
  return { versions, tags: pack['dist-tags'] ?? {} }
}
