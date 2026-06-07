<script setup lang="ts">
  import type { FileEntry } from '@/lib/types'
  import { Collapsible } from '@vuetify/v0'
  import UnifiedDiff from './UnifiedDiff.vue'

  defineProps<{ file: FileEntry }>()

  const statusLabel: Record<FileEntry['status'], string> = {
    added: 'A',
    removed: 'D',
    modified: 'M',
  }
</script>

<template>
  <Collapsible.Root v-slot="{ isOpen }" class="border-b border-subtle last:border-b-0">
    <Collapsible.Activator
      class="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-surface-tint transition-colors"
    >
      <span
        class="inline-flex w-5 h-5 shrink-0 items-center justify-center rounded text-xs font-bold"
        :class="{
          'bg-success text-on-success': file.status === 'added',
          'bg-error text-on-error': file.status === 'removed',
          'bg-info text-on-info': file.status === 'modified',
        }"
        :title="file.status"
      >{{ statusLabel[file.status] }}</span>

      <span class="flex-1 truncate font-mono text-sm text-on-surface">{{ file.path }}</span>

      <span v-if="file.binary" class="text-xs text-on-surface-variant italic">binary</span>

      <template v-else>
        <span v-if="file.added" class="text-xs font-mono text-success">+{{ file.added }}</span>
        <span v-if="file.removed" class="text-xs font-mono text-error">-{{ file.removed }}</span>
      </template>

      <span
        aria-hidden="true"
        class="text-on-surface-variant transition-transform text-xs"
        :class="{ 'rotate-90': isOpen }"
      >▶</span>
    </Collapsible.Activator>

    <Collapsible.Content>
      <div class="border-t border-subtle bg-background">
        <p v-if="file.binary" class="px-4 py-3 text-sm text-on-surface-variant italic">
          Binary file — content diff not shown.
        </p>

        <p v-else-if="!file.patch" class="px-4 py-3 text-sm text-on-surface-variant italic">
          No textual changes.
        </p>

        <UnifiedDiff v-else :patch="file.patch" :truncated="file.truncated" />
      </div>
    </Collapsible.Content>
  </Collapsible.Root>
</template>
