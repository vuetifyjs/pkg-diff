/**
 * Diff worker — keeps fetch/gunzip/untar/diff off the main thread.
 *
 * Protocol: receives `WorkerRequest`, streams `progress` messages, then a
 * single `result` (or `error`). See `src/lib/types.ts`.
 */

import type { WorkerRequest, WorkerResponse } from '@/lib/types'
import { buildDiff, type ExtractedPkg } from '@/lib/diff-engine'
import { fetchTarball } from '@/lib/fetch-tarball'
import { resolveTarball } from '@/lib/registry'
import { gunzip, untar } from '@/lib/tar'

function post (msg: WorkerResponse) {
  ;(self as unknown as Worker).postMessage(msg)
}

async function extract (
  id: number,
  input: { name: string, version: string },
  label: string,
): Promise<ExtractedPkg> {
  post({ type: 'progress', id, stage: 'resolve', detail: `${input.name}@${input.version}` })
  const resolved = await resolveTarball(input.name, input.version)

  post({ type: 'progress', id, stage: 'download', detail: label })
  const { bytes, fromCache } = await fetchTarball(resolved.tarball)

  post({
    type: 'progress',
    id,
    stage: 'extract',
    detail: `${label}${fromCache ? ' (cached)' : ''}`,
  })
  const tar = await gunzip(bytes)
  const entries = untar(tar)

  return {
    ref: { name: resolved.name, version: resolved.version, tarball: resolved.tarball },
    entries,
  }
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  if (msg.type !== 'compare') {
    return
  }
  const { id } = msg

  try {
    // Extract both packages in parallel — independent network + CPU work.
    const [a, b] = await Promise.all([
      extract(id, msg.a, 'A'),
      extract(id, msg.b, 'B'),
    ])

    post({ type: 'progress', id, stage: 'diff', detail: `${a.entries.length}↔${b.entries.length} files` })
    const result = await buildDiff(a, b, msg.options.exclude)

    post({ type: 'result', id, result })
  } catch (error) {
    post({ type: 'error', id, message: error instanceof Error ? error.message : String(error) })
  }
})
