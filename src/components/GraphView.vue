<script setup lang="ts">
/**
 * GraphView Component (Backlog Status)
 * Temporary placeholder to keep bundle size minimal.
 * Full interactive force-directed graph will be reintroduced in a later milestone (see BACKLOG.md).
 */
defineProps<{
  folderPath: string;
}>();

defineEmits<(e: "select", path: string) => void>();
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-app-bg text-app-text-muted">
    <div class="max-w-md p-6 rounded-xl border border-dashed border-app-border bg-app-bg-secondary/40 flex flex-col items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold">
        KG
      </div>
      <div>
        <h3 class="text-sm font-semibold text-app-text">Knowledge-Graph (Backlog)</h3>
        <p class="text-xs text-app-text-muted mt-1 leading-relaxed">
          Dieses Feature wurde zur Optimierung der Bundle-Größe und des Kern-Editors vorübergehend entkoppelt.
          Die SQLite-Indizierung im Rust-Backend bleibt aktiv.
        </p>
      </div>
    </div>
  </div>
</template>
