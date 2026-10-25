<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { HELP_CHAPTERS } from "../lib/helpContent";
import Preview from "./Preview.vue";

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "open-url", url: string): void;
}>();

const activeChapterId = ref(HELP_CHAPTERS[0].id);

const activeChapterContent = computed(() => {
  const chapter = HELP_CHAPTERS.find((c) => c.id === activeChapterId.value);
  return chapter ? chapter.content : "";
});

function handleOpenUrl(url: string) {
  emit("open-url", url);
  emit("close");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.isOpen) {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
    <div class="flex bg-app-bg text-app-text w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl overflow-hidden border border-app-border flex-col md:flex-row">
      
      <!-- Sidebar Navigation -->
      <div class="w-full md:w-64 flex-none border-r border-app-border bg-app-bg-secondary overflow-y-auto flex flex-col">
        <div class="p-4 border-b border-app-border sticky top-0 bg-app-bg-secondary z-10 flex justify-between items-center">
          <h2 class="font-bold text-base text-app-text">Help &amp; Manual</h2>
          <button 
            @click="emit('close')" 
            class="md:hidden p-1 text-app-text-muted hover:text-app-text hover:bg-app-bg-hover rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav class="p-2 flex flex-col gap-1">
          <button 
            v-for="chapter in HELP_CHAPTERS" 
            :key="chapter.id"
            @click="activeChapterId = chapter.id"
            class="text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            :class="activeChapterId === chapter.id ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold shadow-xs' : 'hover:bg-app-bg-hover text-app-text-muted hover:text-app-text'"
          >
            {{ chapter.title }}
          </button>
        </nav>
      </div>
      
      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 bg-app-bg relative">
        <!-- Close Button (Desktop) -->
        <button 
          @click="emit('close')" 
          class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-app-bg-secondary hover:bg-app-bg-hover border border-app-border rounded-lg shadow-xs transition-colors hidden md:flex text-app-text-muted hover:text-app-text cursor-pointer" 
          title="Close"
          aria-label="Close"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <!-- Rendered Markdown Content using existing Preview component -->
        <div class="flex-1 overflow-hidden relative">
          <Preview :source="activeChapterContent" @open-url="handleOpenUrl" />
        </div>
      </div>

    </div>
  </div>
</template>
