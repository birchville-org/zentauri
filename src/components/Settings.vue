<script setup lang="ts">
import { getVersion } from "@tauri-apps/api/app";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { THEME_OPTIONS, applyTheme } from "../lib/theme";
import { GITHUB_RELEASES_URL, openReleasePage } from "../lib/updater";

declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: string;

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update", settings: Record<string, unknown>): void;
  (e: "check-updates"): void;
}>();

const currentTheme = ref("system");
const fontSize = ref(16);
const autoSave = ref(true);
const vimMode = ref(false);
const syncScroll = ref(true);
const pdfPaper = ref<"a4" | "us-letter">("a4");

const appVersion = ref(
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.5.0",
);
const buildNumber = ref(
  typeof __BUILD_NUMBER__ !== "undefined" ? __BUILD_NUMBER__ : "dev",
);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.isOpen) {
    emit("close");
  }
}

onMounted(async () => {
  window.addEventListener("keydown", handleKeydown);
  const settingsStr = localStorage.getItem("zentauri-settings");
  if (settingsStr) {
    try {
      const s = JSON.parse(settingsStr);
      if (s.theme) currentTheme.value = s.theme;
      if (s.fontSize) fontSize.value = s.fontSize;
      if (s.autoSave !== undefined) autoSave.value = s.autoSave;
      if (s.vimMode !== undefined) vimMode.value = s.vimMode;
      if (s.syncScroll !== undefined) syncScroll.value = s.syncScroll;
      if (s.pdfPaper) pdfPaper.value = s.pdfPaper;
    } catch (e) {}
  }
  applySettings();

  try {
    const v = await getVersion();
    if (v) appVersion.value = v;
  } catch (e) {}
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

watch([currentTheme, fontSize, autoSave, vimMode, syncScroll, pdfPaper], () => {
  const s = {
    theme: currentTheme.value,
    fontSize: fontSize.value,
    autoSave: autoSave.value,
    vimMode: vimMode.value,
    syncScroll: syncScroll.value,
    pdfPaper: pdfPaper.value,
  };
  localStorage.setItem("zentauri-settings", JSON.stringify(s));
  applySettings();
});

function applySettings() {
  applyTheme(currentTheme.value, fontSize.value);

  const s = {
    theme: currentTheme.value,
    fontSize: fontSize.value,
    autoSave: autoSave.value,
    vimMode: vimMode.value,
    syncScroll: syncScroll.value,
    pdfPaper: pdfPaper.value,
  };
  emit("update", s);
}

function handleManualDownload() {
  openReleasePage(GITHUB_RELEASES_URL);
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="$emit('close')">
    <div class="bg-app-bg border border-app-border rounded-xl shadow-2xl w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col text-app-text">
      <!-- Modal Header -->
      <div class="px-5 py-3.5 border-b border-app-border flex justify-between items-center bg-app-bg-secondary/70">
        <h2 class="font-semibold text-sm text-app-text">Settings</h2>
        <button 
          @click="$emit('close')" 
          class="text-app-text-muted hover:text-app-text p-1 rounded-md transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Modal Body -->
      <div class="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
        <!-- Theme -->
        <div class="flex flex-col gap-2">
          <label for="theme" class="text-sm font-medium text-app-text">Theme</label>
          <select 
            id="theme" 
            v-model="currentTheme"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-app-border bg-app-bg text-app-text focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 rounded-md shadow-xs cursor-pointer"
          >
            <option v-for="t in THEME_OPTIONS" :key="t.id" :value="t.id">
              {{ t.label }}
            </option>
          </select>
        </div>
        
        <!-- Font Size -->
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <label class="text-sm font-medium text-app-text">Editor Font Size</label>
            <span class="text-sm text-app-text-muted font-mono font-semibold">{{ fontSize }}px</span>
          </div>
          <input 
            type="range" 
            v-model.number="fontSize" 
            min="12" 
            max="32" 
            step="1"
            class="w-full accent-amber-600 dark:accent-amber-500 bg-app-bg-secondary cursor-pointer"
          />
        </div>

        <!-- Auto Save -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-app-text block">Auto Save</label>
            <span class="text-xs text-app-text-muted">Automatically save changes while typing</span>
          </div>
          <input 
            type="checkbox" 
            v-model="autoSave"
            class="h-4 w-4 rounded border-app-border text-amber-600 focus:ring-amber-500 bg-app-bg cursor-pointer"
          />
        </div>

        <!-- PDF Export Paper Size -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-app-text block">PDF Paper Format</label>
            <span class="text-xs text-app-text-muted">Standard format for Typst PDF export</span>
          </div>
          <select 
            id="pdfPaper" 
            v-model="pdfPaper"
            class="pl-2 pr-7 py-1 text-sm border-app-border bg-app-bg text-app-text rounded focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
          >
            <option value="a4">A4 (ISO 216)</option>
            <option value="us-letter">US-Letter</option>
          </select>
        </div>

        <!-- Sync Scroll -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-app-text block">Sync Scroll</label>
            <span class="text-xs text-app-text-muted">Synchronize scroll position between editor and preview</span>
          </div>
          <input 
            type="checkbox" 
            v-model="syncScroll"
            class="h-4 w-4 rounded border-app-border text-amber-600 focus:ring-amber-500 bg-app-bg cursor-pointer"
          />
        </div>

        <!-- Vim Mode -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-app-text block">Vim Keybindings</label>
            <span class="text-xs text-app-text-muted">Enable Vim modal editing in the editor</span>
          </div>
          <input 
            type="checkbox" 
            v-model="vimMode"
            class="h-4 w-4 rounded border-app-border text-amber-600 focus:ring-amber-500 bg-app-bg cursor-pointer"
          />
        </div>

        <!-- About & Update Action -->
        <div class="flex flex-col gap-3 pt-4 border-t border-app-border">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold text-app-text-muted uppercase tracking-wider">About</h3>
            <span class="text-xs font-mono text-app-text-muted font-medium">v{{ appVersion }} (Build {{ buildNumber }})</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-app-text">ZenTauri Markdown &amp; Philological Editor</span>
            <button
              @click="$emit('check-updates')" 
              class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ml-3 shadow-xs"
            >
              Check for Updates...
            </button>
          </div>

          <div class="flex items-center justify-between text-[11px] text-app-text-muted leading-relaxed">
            <span>Fast, extensible Markdown editor powered by Tauri and Vue 3.</span>
            <button
              type="button"
              @click="handleManualDownload"
              class="text-amber-700 dark:text-amber-400 hover:underline shrink-0 ml-2 cursor-pointer font-medium"
              title="GitHub Releases"
            >
              Downloads ↗
            </button>
          </div>
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-app-border bg-app-bg-secondary/70 text-right">
        <button 
          @click="$emit('close')" 
          class="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
