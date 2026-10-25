<script setup lang="ts">
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw } from "vue";
import rawReleaseNotes from "../../RELEASE_NOTES.md?raw";
import { renderMarkdown } from "../lib/markdown";
import { extractReleaseNotes } from "../lib/releaseNotesExtractor";
import {
  GITHUB_RELEASES_URL,
  checkForUpdates,
  installAppUpdate,
  openReleasePage,
} from "../lib/updater";

declare const __APP_VERSION__: string;

const isTauri =
  typeof window !== "undefined" &&
  (window as unknown as { __TAURI_INTERNALS__?: unknown })
    .__TAURI_INTERNALS__ !== undefined;

export type UpdateDialogState =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "error";

const isVisible = ref(false);
const status = ref<UpdateDialogState>("idle");
const currentVersion = ref(
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.5.0",
);
const updateVersion = ref("");
const updateBody = ref("");
const showNotes = ref(false);
const showCurrentNotes = ref(true);
const activeUpdate = shallowRef<Update | null>(null);
const isInstalling = ref(false);
const installProgress = ref(0);
const installStatus = ref("");
const errorMessage = ref("");

const DISMISS_KEY = "zentauri_dismissed_update_version";

let checkTimer: ReturnType<typeof setTimeout> | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;

// Rendered release notes for incoming update
const renderedUpdateNotes = computed(() => {
  if (!updateBody.value) return "";
  return renderMarkdown(updateBody.value, { markdownExtensionsEnabled: false });
});

// Rendered release notes for current version (from RELEASE_NOTES.md)
const currentVersionNotes = computed(() => {
  const notes = extractReleaseNotes(currentVersion.value, rawReleaseNotes);
  if (notes) return notes;
  return `### ZenTauri v${currentVersion.value}\n- Current version installed.\n- Detailed release information is available on GitHub Releases.`;
});

const renderedCurrentNotes = computed(() => {
  return renderMarkdown(currentVersionNotes.value, {
    markdownExtensionsEnabled: false,
  });
});

async function refreshCurrentVersion() {
  if (isTauri) {
    try {
      const ver = await getVersion();
      if (ver) currentVersion.value = ver;
    } catch {
      // fallback to __APP_VERSION__
    }
  }
}

async function runUpdateCheck(force = false) {
  await refreshCurrentVersion();

  if (force) {
    isVisible.value = true;
    status.value = "checking";
    errorMessage.value = "";
  }

  if (!isTauri) {
    if (force) {
      status.value = "up-to-date";
    }
    return;
  }

  try {
    const result = await checkForUpdates();

    if (result.error) {
      if (force) {
        status.value = "error";
        errorMessage.value = result.error;
      }
      return;
    }

    if (result.available && result.version) {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!force && dismissed === result.version) {
        return;
      }
      activeUpdate.value = result.update || null;
      updateVersion.value = result.version;
      updateBody.value = result.body || "";
      errorMessage.value = "";
      status.value = "available";
      showNotes.value = false;
      isVisible.value = true;
    } else {
      if (force) {
        status.value = "up-to-date";
        errorMessage.value = "";
      }
    }
  } catch (err) {
    if (force) {
      status.value = "error";
      errorMessage.value = err instanceof Error ? err.message : String(err);
    } else {
      console.warn("Silent background update check error:", err);
    }
  }
}

function openCheck(force = true) {
  return runUpdateCheck(force);
}

function handleManualDownload() {
  const url = updateVersion.value
    ? `https://github.com/birchville-org/zentauri/releases/tag/v${updateVersion.value}`
    : GITHUB_RELEASES_URL;
  openReleasePage(url);
}

function dismiss() {
  if (isInstalling.value) return;
  isVisible.value = false;
  if (status.value === "available" && updateVersion.value) {
    sessionStorage.setItem(DISMISS_KEY, updateVersion.value);
  }
}

function dismissIfAllowed() {
  if (!isInstalling.value) {
    dismiss();
  }
}

async function handleInstall() {
  if (!activeUpdate.value) return;
  isInstalling.value = true;
  installProgress.value = 0;
  installStatus.value = "Downloading...";
  errorMessage.value = "";

  try {
    const rawUpdate = toRaw(activeUpdate.value);
    await installAppUpdate(rawUpdate, (downloaded, total) => {
      if (total && total > 0) {
        installProgress.value = Math.min(
          100,
          Math.round((downloaded / total) * 100),
        );
        installStatus.value = `Downloading... ${installProgress.value}%`;
      }
    });
    installStatus.value = "Update installed! Restarting app...";
    await relaunch();
  } catch (err: unknown) {
    isInstalling.value = false;
    errorMessage.value = err instanceof Error ? err.message : String(err);
    installStatus.value = "Installation failed.";
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isVisible.value && !isInstalling.value) {
    dismiss();
  }
}

onMounted(async () => {
  await refreshCurrentVersion();
  window.addEventListener("keydown", handleKeydown);
  if (!isTauri) return;

  // Startup check after 4 seconds to ensure smooth and instant editor boot
  checkTimer = setTimeout(() => runUpdateCheck(false), 4000);
  // Periodic check every 4 hours while running
  intervalTimer = setInterval(() => runUpdateCheck(false), 4 * 60 * 60 * 1000);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (checkTimer) clearTimeout(checkTimer);
  if (intervalTimer) clearInterval(intervalTimer);
});

defineExpose({
  openCheck,
  runUpdateCheck,
  handleManualDownload,
  dismiss,
  close: dismiss,
  isVisible,
  status,
  showNotes,
  updateBody,
  updateVersion,
  currentVersion,
  errorMessage,
  isInstalling,
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none print:hidden"
      role="alert"
      aria-live="polite"
      @click.self="dismissIfAllowed"
    >
      <div
        class="bg-app-bg border border-app-border rounded-xl shadow-2xl w-[540px] max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col text-app-text transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
      >
        <!-- Modal Header -->
        <div class="px-5 py-3.5 border-b border-app-border flex justify-between items-center bg-app-bg-secondary/70">
          <div class="flex items-center gap-2.5">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 id="update-dialog-title" class="font-semibold text-sm text-app-text leading-tight">
                Software Update
              </h3>
              <p class="text-[11px] text-app-text-muted leading-none mt-0.5">
                ZenTauri v{{ currentVersion }}
              </p>
            </div>
          </div>
          <button
            v-if="!isInstalling"
            @click="dismiss"
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
        <div class="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <!-- STATE: CHECKING -->
          <div v-if="status === 'checking'" class="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div class="relative w-10 h-10">
              <div class="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-600 dark:border-t-amber-400 animate-spin"></div>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-app-text">Checking for updates...</h4>
              <p class="text-xs text-app-text-muted mt-1">
                Connecting to GitHub Releases...
              </p>
            </div>
          </div>

          <!-- STATE: UP-TO-DATE -->
          <div v-else-if="status === 'up-to-date'" class="flex flex-col gap-4">
            <div class="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <div class="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  ZenTauri is up to date
                </h4>
                <p class="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Version <strong>v{{ currentVersion }}</strong> is currently the latest version.
                </p>
              </div>
            </div>

            <!-- Current Version Release Notes -->
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                  Release Notes (Installed version v{{ currentVersion }})
                </span>
                <button
                  type="button"
                  @click="showCurrentNotes = !showCurrentNotes"
                  class="text-[11px] text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {{ showCurrentNotes ? 'Hide' : 'Show' }}
                </button>
              </div>

              <div
                v-if="showCurrentNotes"
                class="max-h-56 overflow-y-auto rounded-lg border border-app-border bg-app-bg-secondary/60 p-3.5 text-xs text-app-text select-text release-notes-content leading-relaxed"
                v-html="renderedCurrentNotes"
              ></div>
            </div>
          </div>

          <!-- STATE: AVAILABLE -->
          <div v-else-if="status === 'available'" class="flex flex-col gap-4">
            <div class="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <div class="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 text-amber-600 dark:text-amber-400">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5 flex-wrap">
                  <span>New update available:</span>
                  <span class="inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                    v{{ updateVersion }}
                  </span>
                </h4>
                <p class="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  A newer version of ZenTauri is available (Installed: v{{ currentVersion }}).
                </p>
              </div>
            </div>

            <!-- Incoming Version Release Notes -->
            <div v-if="updateBody && updateBody.trim()" class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <button
                  type="button"
                  @click="showNotes = !showNotes"
                  class="text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{{ showNotes ? 'Hide release notes' : 'What\'s new in v' + updateVersion + '?' }}</span>
                </button>
              </div>

              <div
                v-if="showNotes"
                class="max-h-56 overflow-y-auto rounded-lg border border-app-border bg-app-bg-secondary/60 p-3.5 text-xs text-app-text select-text release-notes-content leading-relaxed"
                v-html="renderedUpdateNotes"
              ></div>
            </div>

            <!-- Installation Progress Bar -->
            <div v-if="isInstalling" class="mt-1">
              <div class="flex justify-between text-xs text-app-text-muted mb-1 font-medium">
                <span>{{ installStatus }}</span>
                <span class="font-mono">{{ installProgress }}%</span>
              </div>
              <div class="w-full bg-app-bg-secondary h-2.5 rounded-full overflow-hidden border border-app-border">
                <div
                  class="bg-amber-600 dark:bg-amber-500 h-full transition-all duration-200"
                  :style="{ width: `${installProgress}%` }"
                ></div>
              </div>
            </div>

            <!-- Error banner during install -->
            <div v-else-if="errorMessage" class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-rose-500 flex flex-col gap-1.5">
              <span>{{ errorMessage }}</span>
              <button
                type="button"
                @click="handleManualDownload"
                class="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline font-medium text-[11px] cursor-pointer"
              >
                <span>Download manually in browser (GitHub Releases)</span>
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>

          <!-- STATE: ERROR -->
          <div v-else-if="status === 'error'" class="flex flex-col gap-3">
            <div class="flex items-start gap-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
              <div class="h-6 w-6 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5 text-rose-600 dark:text-rose-400">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Update check failed
                </h4>
                <p class="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1">
                  {{ errorMessage || 'Could not connect to GitHub Releases servers.' }}
                </p>
              </div>
            </div>

            <div class="text-xs text-app-text-muted">
              You can check and download the latest release anytime from your browser.
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-3.5 border-t border-app-border bg-app-bg-secondary/60 flex items-center justify-between gap-3">
          <!-- Left side: External link -->
          <button
            type="button"
            @click="handleManualDownload"
            class="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            title="Open GitHub Releases in Browser"
          >
            <span>Browser-Download (GitHub) ↗</span>
          </button>

          <!-- Right side: Actions -->
          <div class="flex items-center gap-2">
            <template v-if="status === 'checking'">
              <button
                @click="dismiss"
                class="px-3.5 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text rounded-lg hover:bg-app-bg-hover transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </template>

            <template v-else-if="status === 'up-to-date'">
              <button
                @click="dismiss"
                class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            </template>

            <template v-else-if="status === 'available'">
              <button
                v-if="!isInstalling"
                @click="dismiss"
                class="px-3.5 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text rounded-lg hover:bg-app-bg-hover transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                v-if="!isInstalling"
                @click="handleInstall"
                class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Update &amp; Restart
              </button>
            </template>

            <template v-else-if="status === 'error'">
              <button
                @click="() => runUpdateCheck(true)"
                class="px-3.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-app-bg-hover rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                @click="dismiss"
                class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.release-notes-content :deep(h1),
.release-notes-content :deep(h2),
.release-notes-content :deep(h3),
.release-notes-content :deep(h4) {
  font-weight: 600;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  color: var(--app-text, inherit);
}
.release-notes-content :deep(h1) { font-size: 0.95rem; }
.release-notes-content :deep(h2) { font-size: 0.875rem; }
.release-notes-content :deep(h3) { font-size: 0.8rem; }
.release-notes-content :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.release-notes-content :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.release-notes-content :deep(li) {
  margin: 0.125rem 0;
}
.release-notes-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  padding: 0.1rem 0.25rem;
  border-radius: 0.25rem;
  background-color: rgba(125, 125, 125, 0.15);
}
.release-notes-content :deep(p) {
  margin: 0.25rem 0;
}
.release-notes-content :deep(a) {
  color: #b45309;
  text-decoration: underline;
}
:root.dark .release-notes-content :deep(a),
.dark .release-notes-content :deep(a) {
  color: #eab308;
}
</style>
