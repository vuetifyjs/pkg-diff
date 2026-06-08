/**
 * Tracks recently compared package names in localStorage to power the package
 * name autocomplete. Module-level state so every field shares one list.
 */

import { storage } from '@/lib/storage'

const MAX = 12

// Auto-persists on mutation via the storage ref's deep watch.
const recent = storage.get<string[]>('recent-packages', [])

function remember (name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return
  }
  recent.value = [trimmed, ...recent.value.filter(n => n !== trimmed)].slice(0, MAX)
}

export function useRecentPackages () {
  return { recent, remember }
}
