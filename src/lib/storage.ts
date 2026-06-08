/**
 * Shared reactive storage instance. `createStorage` returns refs that sync to
 * localStorage (deep-watched, auto-persisted) with built-in error handling and
 * an in-memory fallback when storage is unavailable. The `pkg-diff:` prefix
 * keeps keys byte-compatible with the previously hand-rolled persistence.
 */

import { createStorage } from '@vuetify/v0'

export const storage = createStorage({ prefix: 'pkg-diff:' })
