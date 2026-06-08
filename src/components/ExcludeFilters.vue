<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue'
  import { storage } from '@/lib/storage'

  /**
   * Toggle chips for glob patterns to exclude from the diff. Built-in chips are
   * fixed but their on/off state persists; user-added chips persist too. The
   * active patterns are surfaced via `v-model` (a flat string[] consumed by the
   * diff worker).
   */

  defineProps<{ patterns?: string[] }>()
  const emit = defineEmits<{ 'update:patterns': [string[]] }>()

  const MAX_LEN = 20

  // Fixed built-ins with their default on/off state.
  const BUILTINS = [
    { label: '*.map', patterns: ['*.map'], default: true },
    { label: '*.d.ts', patterns: ['*.d.ts', '*.d.mts', '*.d.cts'], default: true },
    { label: '*.min.*', patterns: ['*.min.*'], default: false },
  ]

  // Persisted state (auto-saved via each storage ref's deep watch):
  // built-in on/off overrides keyed by label, and the user-added chips.
  const builtinState = storage.get<Record<string, boolean>>('exclude-builtins', {})
  const custom = storage.get<{ label: string, active: boolean }[]>('exclude-custom', [])

  const isBuiltinActive = (b: typeof BUILTINS[number]) => builtinState.value[b.label] ?? b.default
  function toggleBuiltin (b: typeof BUILTINS[number]) {
    builtinState.value[b.label] = !isBuiltinActive(b)
  }

  const activePatterns = computed(() => [
    ...BUILTINS.flatMap(b => (isBuiltinActive(b) ? b.patterns : [])),
    ...custom.value.flatMap(f => (f.active ? [f.label] : [])),
  ])
  watch(activePatterns, v => emit('update:patterns', v), { immediate: true })

  function removeCustom (index: number) {
    custom.value.splice(index, 1)
  }

  const editing = ref(false)
  const draftEl = ref<HTMLElement | null>(null)

  function startAdd () {
    editing.value = true
    nextTick(() => draftEl.value?.focus())
  }

  function placeCaretEnd (el: HTMLElement) {
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = globalThis.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  function onInput () {
    const el = draftEl.value
    if (el && (el.textContent?.length ?? 0) > MAX_LEN) {
      el.textContent = el.textContent!.slice(0, MAX_LEN)
      placeCaretEnd(el)
    }
  }

  function commitDraft () {
    if (!editing.value) return
    const label = (draftEl.value?.textContent ?? '').trim().slice(0, MAX_LEN)
    editing.value = false
    if (!label) return
    const exists = BUILTINS.some(b => b.label === label) || custom.value.some(f => f.label === label)
    if (exists) return
    custom.value.push({ label, active: true })
  }

  function cancelDraft () {
    editing.value = false
  }
</script>

<template>
  <button
    v-for="builtin in BUILTINS"
    :key="builtin.label"
    :aria-pressed="isBuiltinActive(builtin)"
    class="inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
    :class="isBuiltinActive(builtin)
      ? 'bg-primary text-on-primary border-primary'
      : 'bg-surface-tint hover:bg-surface-variant border-subtle text-on-surface opacity-60'"
    type="button"
    @click="toggleBuiltin(builtin)"
  >
    <code class="text-xs">{{ builtin.label }}</code>
  </button>

  <span
    v-for="(filter, index) in custom"
    :key="`custom-${filter.label}`"
    :aria-pressed="filter.active"
    class="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
    :class="filter.active
      ? 'bg-primary text-on-primary border-primary'
      : 'bg-surface-tint hover:bg-surface-variant border-subtle text-on-surface opacity-60'"
    role="button"
    tabindex="0"
    @click="filter.active = !filter.active"
    @keydown.enter.prevent="filter.active = !filter.active"
  >
    <code class="text-xs">{{ filter.label }}</code>

    <button
      :aria-label="`Remove ${filter.label}`"
      class="inline-flex items-center justify-center w-4 h-4 rounded opacity-50 hover:opacity-100 transition-opacity"
      type="button"
      @click.stop="removeCustom(index)"
    >
      <span aria-hidden="true" class="text-xs leading-none">✕</span>
    </button>
  </span>

  <span
    v-if="editing"
    ref="draftEl"
    aria-label="New exclude pattern"
    class="inline-flex items-center min-w-[3rem] px-3 py-1.5 rounded-lg border border-primary text-sm font-medium bg-surface text-on-surface outline-none ring-2 ring-primary/40"
    contenteditable="plaintext-only"
    role="textbox"
    @blur="commitDraft"
    @input="onInput"
    @keydown.enter.prevent="commitDraft"
    @keydown.esc.prevent="cancelDraft"
  />

  <button
    v-else
    aria-label="Add exclude pattern"
    class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-subtle text-on-surface hover:bg-surface-tint hover:border-primary transition-colors"
    type="button"
    @click="startAdd"
  >
    <span aria-hidden="true" class="text-base leading-none">+</span>
  </button>
</template>
