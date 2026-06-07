<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{
    patch: string
    truncated?: boolean
  }>()

  type Kind = 'hunk' | 'add' | 'del' | 'context'

  const lines = computed<{ kind: Kind, text: string }[]>(() => {
    if (!props.patch) return []
    return props.patch.split('\n').map(text => {
      let kind: Kind = 'context'
      if (text.startsWith('@@')) kind = 'hunk'
      else if (text.startsWith('+')) kind = 'add'
      else if (text.startsWith('-')) kind = 'del'
      return { kind, text }
    })
  })
</script>

<template>
  <div class="diff overflow-x-auto text-xs font-mono leading-relaxed">
    <div
      v-for="(line, i) in lines"
      :key="i"
      class="diff-line whitespace-pre px-3"
      :class="{
        'diff-add': line.kind === 'add',
        'diff-del': line.kind === 'del',
        'diff-hunk': line.kind === 'hunk',
        'opacity-70': line.kind === 'context',
      }"
    >{{ line.text || ' ' }}</div>

    <div v-if="truncated" class="px-3 py-1 text-xs text-warning italic">
      … diff truncated for display
    </div>
  </div>
</template>

<style scoped>
  .diff-line {
    border-left: 3px solid transparent;
  }
  .diff-add {
    background: color-mix(in srgb, var(--v0-success) 16%, transparent);
    border-left-color: var(--v0-success);
  }
  .diff-del {
    background: color-mix(in srgb, var(--v0-error) 16%, transparent);
    border-left-color: var(--v0-error);
  }
  .diff-hunk {
    color: var(--v0-info);
    background: color-mix(in srgb, var(--v0-info) 8%, transparent);
  }
</style>
