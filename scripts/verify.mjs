/**
 * End-to-end verification of the diff pipeline against real npm packages,
 * using the actual library modules (registry + tar) plus the real WASM module.
 * This mirrors what the worker does, minus the Vue/structured-clone layer.
 */
import { readFileSync } from 'node:fs'
import { resolveTarball } from '../src/lib/registry.ts'
import { gunzip, untar } from '../src/lib/tar.ts'
import { fetchTarballNode } from './fetch-node.mjs'

const [nameA, verA, nameB, verB] = process.argv.slice(2)
const A = { name: nameA || 'vuetify', version: verA || 'latest' }
const B = { name: nameB || '@vuetify/nightly', version: verB || 'latest' }

// ---- WASM diff (same protocol as src/lib/wasm-diff.ts) -------------------
const wasmBytes = readFileSync(new URL('../public/diff.wasm', import.meta.url))
const { instance } = await WebAssembly.instantiate(wasmBytes, {})
const wasm = instance.exports
const enc = new TextEncoder(); const dec = new TextDecoder()
function diffText (a, b) {
  const ab = enc.encode(a); const bb = enc.encode(b)
  const ap = ab.length > 0 ? wasm.alloc(ab.length) : 0
  const bp = bb.length > 0 ? wasm.alloc(bb.length) : 0
  if (ap) {
    new Uint8Array(wasm.memory.buffer, ap, ab.length).set(ab)
  }
  if (bp) {
    new Uint8Array(wasm.memory.buffer, bp, bb.length).set(bb)
  }
  const rp = wasm.diff(ap, ab.length, bp, bb.length)
  const view = new DataView(wasm.memory.buffer)
  const len = view.getUint32(rp, true)
  const out = dec.decode(new Uint8Array(wasm.memory.buffer, rp + 4, len))
  if (ap) {
    wasm.dealloc(ap, ab.length)
  }
  if (bp) {
    wasm.dealloc(bp, bb.length)
  }
  wasm.dealloc(rp, 4 + len)
  return out
}

// ---- helpers -------------------------------------------------------------
const normalize = n => n.replace(/^\.?\//, '').replace(/^package\//, '')
function scopeOf (p) {
  const s = p.split('/')[0]; return s === 'lib' ? 'lib' : (s === 'dist' ? 'dist' : 'other')
}
function isBinary (b) {
  const n = Math.min(b.length, 8000); for (let i = 0; i < n; i++) {
    if (b[i] === 0) {
      return true
    }
  } return false
}
function eq (a, b) {
  if (a.length !== b.length) {
    return false
  } for (const [i, element] of a.entries()) {
    if (element !== b[i]) {
      return false
    }
  } return true
}

async function extract (pkg, label) {
  const t0 = performance.now()
  const r = await resolveTarball(pkg.name, pkg.version)
  const bytes = await fetchTarballNode(r.tarball)
  const tar = await gunzip(bytes)
  const entries = untar(tar)
  console.log(`  ${label}: ${pkg.name}@${r.version} → ${entries.length} files (${(bytes.length / 1024).toFixed(0)}KB tgz, ${(performance.now() - t0).toFixed(0)}ms)`)
  return { r, entries }
}

console.log('Comparing:')
const [ea, eb] = await Promise.all([extract(A, 'A'), extract(B, 'B')])

function map (es) {
  const m = new Map(); for (const e of es) {
    const p = normalize(e.name); if (p) {
      m.set(p, e.bytes)
    }
  } return m
}
const ma = map(ea.entries); const mb = map(eb.entries)
const exclude = [/^.*\.map$/, /^.*\.d\.m?ts$/]
const skip = p => exclude.some(re => re.test(p))

const paths = new Set()
for (const p of ma.keys()) {
  if (!skip(p)) {
    paths.add(p)
  }
}
for (const p of mb.keys()) {
  if (!skip(p)) {
    paths.add(p)
  }
}

let added = 0; let removed = 0; let modified = 0; let la = 0; let lr = 0; let binary = 0
const samples = []
for (const p of [...paths].sort()) {
  const av = ma.get(p); const bv = mb.get(p)
  if (av && bv) {
    if (eq(av, bv)) {
      continue
    }
    modified++
    if (isBinary(av) || isBinary(bv)) {
      binary++; continue
    }
    const patch = diffText(dec.decode(av), dec.decode(bv))
    for (const l of patch.split('\n')) {
      if (l.startsWith('+')) {
        la++
      } else if (l.startsWith('-')) {
        lr++
      }
    }
    if (samples.length < 3) {
      samples.push({ p, scope: scopeOf(p), head: patch.split('\n').slice(0, 4).join('\n') })
    }
  } else if (bv) {
    added++; la += dec.decode(bv).split('\n').length
  } else {
    removed++; lr += dec.decode(av).split('\n').length
  }
}

console.log(`\nResult: ${added} added, ${removed} removed, ${modified} modified (${binary} binary)`)
console.log(`Lines: +${la} -${lr}`)
console.log('\nSample patches:')
for (const s of samples) {
  console.log(`\n[${s.scope}] ${s.p}\n${s.head}`)
}
console.log('\n✓ pipeline OK')
