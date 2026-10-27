<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

interface PdfDocInfo {
  page_count: usize;
  file_name: string;
  file_size: number;
}

type usize = number;

interface PageItem {
  index: number;
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

function cleanupPages(pages: PageItem[]) {
  for (const page of pages) {
    if (page.blobUrl) {
      URL.revokeObjectURL(page.blobUrl);
      page.blobUrl = null;
    }
  }
}

export interface OpenPdfDoc {
  slot: "left" | "right";
  slotLabel: string;
  name: string;
  path: string;
  pageCount: number;
  currentPage: number;
}

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update-docs", docs: OpenPdfDoc[]): void;
}>();

// Sync Mode: 'percentage' | 'page' | 'off'
type SyncMode = "percentage" | "page" | "off";
const syncMode = ref<SyncMode>("percentage");

// View Layout Mode: 'single' (page flip) | 'continuous' (vertical scroll)
type ViewLayoutMode = "single" | "continuous";
const pageLayoutMode = ref<ViewLayoutMode>("single");

// Zoom scale in percentage (e.g. 100 = 100%)
const zoomLevel = ref<number>(100);
const fitWidthMode = ref<boolean>(true);

// Pane split ratio (in percentage for left pane, e.g. 50%)
const leftPaneWidthPercent = ref<number>(50);
const isResizingSplit = ref<boolean>(false);

// Active hovered pane for keyboard navigation focus
const hoveredPane = ref<"left" | "right">("left");

// Left Document State
const leftPdfPath = ref<string>("");
const leftPdfName = ref<string>("");
const leftPageCount = ref<number>(0);
const leftPages = ref<PageItem[]>([]);
const leftCurrentPage = ref<number>(1);
const leftLoading = ref<boolean>(false);
const leftError = ref<string | null>(null);

// Right Document State
const rightPdfPath = ref<string>("");
const rightPdfName = ref<string>("");
const rightPageCount = ref<number>(0);
const rightPages = ref<PageItem[]>([]);
const rightCurrentPage = ref<number>(1);
const rightLoading = ref<boolean>(false);
const rightError = ref<string | null>(null);

// DOM references
const leftScrollContainer = ref<HTMLDivElement | null>(null);
const rightScrollContainer = ref<HTMLDivElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// Sync guards
let activeScroller: "left" | "right" | null = null;
let activeScrollerTimer: ReturnType<typeof setTimeout> | null = null;
let syncRaf: number | null = null;
let leftLoadToken = 0;
let rightLoadToken = 0;

function setActiveScroller(scroller: "left" | "right") {
  activeScroller = scroller;
  if (syncRaf) {
    cancelAnimationFrame(syncRaf);
    syncRaf = null;
  }
  if (activeScrollerTimer) clearTimeout(activeScrollerTimer);
  activeScrollerTimer = setTimeout(() => {
    activeScroller = null;
  }, 200);
}

// Computed active single pages
const activeLeftPage = computed(() => {
  if (
    leftCurrentPage.value < 1 ||
    leftCurrentPage.value > leftPages.value.length
  ) {
    return null;
  }
  return leftPages.value[leftCurrentPage.value - 1];
});

const activeRightPage = computed(() => {
  if (
    rightCurrentPage.value < 1 ||
    rightCurrentPage.value > rightPages.value.length
  ) {
    return null;
  }
  return rightPages.value[rightCurrentPage.value - 1];
});

// Page width style based on zoomLevel and fitWidthMode
const pageWidthStyle = computed(() => {
  if (fitWidthMode.value) {
    return { width: "100%", maxWidth: "880px" };
  }
  return { width: `${zoomLevel.value}%`, maxWidth: "none" };
});

function emitDocsUpdate() {
  const list: OpenPdfDoc[] = [];
  if (leftPdfPath.value) {
    list.push({
      slot: "left",
      slotLabel: "[1] Ref",
      name: leftPdfName.value,
      path: leftPdfPath.value,
      pageCount: leftPageCount.value,
      currentPage: leftCurrentPage.value,
    });
  }
  if (rightPdfPath.value) {
    list.push({
      slot: "right",
      slotLabel: "[2] Comp",
      name: rightPdfName.value,
      path: rightPdfPath.value,
      pageCount: rightPageCount.value,
      currentPage: rightCurrentPage.value,
    });
  }
  emit("update-docs", list);
}

watch([leftCurrentPage, rightCurrentPage], () => {
  if (leftPdfPath.value || rightPdfPath.value) {
    emitDocsUpdate();
  }
});

function unloadPdf(target: "left" | "right") {
  if (target === "left") {
    leftLoadToken++;
    cleanupPages(leftPages.value);
    leftPdfPath.value = "";
    leftPdfName.value = "";
    leftPageCount.value = 0;
    leftPages.value = [];
    leftCurrentPage.value = 1;
    leftLoading.value = false;
    leftError.value = null;
  } else {
    rightLoadToken++;
    cleanupPages(rightPages.value);
    rightPdfPath.value = "";
    rightPdfName.value = "";
    rightPageCount.value = 0;
    rightPages.value = [];
    rightCurrentPage.value = 1;
    rightLoading.value = false;
    rightError.value = null;
  }
  emitDocsUpdate();
}

async function loadPdfFromExternal(path: string, slot?: "left" | "right") {
  if (slot) {
    await loadPdf(slot, path);
    return;
  }
  if (!leftPdfPath.value) {
    await loadPdf("left", path);
  } else if (!rightPdfPath.value) {
    await loadPdf("right", path);
  } else {
    await loadPdf(hoveredPane.value || "right", path);
  }
}

async function revealInFinder(path: string) {
  if (!path) return;
  try {
    await invoke("reveal_in_explorer", { path });
  } catch (err) {
    console.error("Failed to reveal in Finder:", err);
  }
}

function getDirectoryName(path: string): string {
  if (!path) return "";
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  parts.pop(); // remove file name
  return parts.slice(-2).join("/"); // last 1-2 directories for compact display
}

async function pickPdf(target: "left" | "right") {
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });

    if (selected && typeof selected === "string") {
      await loadPdf(target, selected);
    }
  } catch (err) {
    console.error(`Failed to pick PDF for ${target}:`, err);
  }
}

async function loadPdf(target: "left" | "right", path: string) {
  if (target === "left") {
    leftLoadToken++;
    cleanupPages(leftPages.value);
    leftPdfPath.value = path;
    leftLoading.value = true;
    leftError.value = null;
    leftPages.value = [];
  } else {
    rightLoadToken++;
    cleanupPages(rightPages.value);
    rightPdfPath.value = path;
    rightLoading.value = true;
    rightError.value = null;
    rightPages.value = [];
  }

  try {
    const info = await invoke<PdfDocInfo>("get_pdf_info", { path });
    const count = info.page_count;

    if (target === "left") {
      leftPdfName.value = info.file_name;
      leftPageCount.value = count;
      leftCurrentPage.value = 1;
      leftPages.value = Array.from({ length: count }, (_, i) => ({
        index: i,
        blobUrl: null,
        loading: false,
        error: null,
      }));
      leftLoading.value = false;
      loadVisiblePages("left", 0);
    } else {
      rightPdfName.value = info.file_name;
      rightPageCount.value = count;
      rightCurrentPage.value = 1;
      rightPages.value = Array.from({ length: count }, (_, i) => ({
        index: i,
        blobUrl: null,
        loading: false,
        error: null,
      }));
      rightLoading.value = false;
      loadVisiblePages("right", 0);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (target === "left") {
      leftError.value = msg;
      leftLoading.value = false;
    } else {
      rightError.value = msg;
      rightLoading.value = false;
    }
  } finally {
    emitDocsUpdate();
  }
}

function loadVisiblePages(target: "left" | "right", centerIndex: number) {
  const path = target === "left" ? leftPdfPath.value : rightPdfPath.value;
  const pagesList = target === "left" ? leftPages.value : rightPages.value;
  const token = target === "left" ? leftLoadToken : rightLoadToken;

  if (!path || !pagesList.length) return;

  // Viewport window: active page +/- 2 buffer pages for smooth flipping
  const start = Math.max(0, centerIndex - 2);
  const end = Math.min(pagesList.length, centerIndex + 3);

  for (let i = start; i < end; i++) {
    const page = pagesList[i];
    if (!page || page.blobUrl !== null || page.loading) {
      continue;
    }
    page.loading = true;

    invoke<string>("render_pdf_page_svg", { path, pageIndex: i })
      .then((svg) => {
        const activeToken = target === "left" ? leftLoadToken : rightLoadToken;
        if (activeToken !== token) {
          return;
        }
        if (pagesList[i]) {
          if (pagesList[i].blobUrl) {
            URL.revokeObjectURL(pagesList[i].blobUrl!);
          }
          const blob = new Blob([svg], { type: "image/svg+xml" });
          pagesList[i].blobUrl = URL.createObjectURL(blob);
          pagesList[i].loading = false;
          pagesList[i].error = null;
        }
      })
      .catch((err) => {
        const activeToken = target === "left" ? leftLoadToken : rightLoadToken;
        if (activeToken !== token) return;
        if (pagesList[i]) {
          pagesList[i].loading = false;
          pagesList[i].error = String(err);
        }
      });
  }
}

function handleSwap() {
  leftLoadToken++;
  rightLoadToken++;

  const tmpPath = leftPdfPath.value;
  const tmpName = leftPdfName.value;
  const tmpCount = leftPageCount.value;
  const tmpPages = leftPages.value;
  const tmpPage = leftCurrentPage.value;
  const tmpError = leftError.value;

  leftPdfPath.value = rightPdfPath.value;
  leftPdfName.value = rightPdfName.value;
  leftPageCount.value = rightPageCount.value;
  leftPages.value = rightPages.value;
  leftCurrentPage.value = rightCurrentPage.value;
  leftError.value = rightError.value;

  rightPdfPath.value = tmpPath;
  rightPdfName.value = tmpName;
  rightPageCount.value = tmpCount;
  rightPages.value = tmpPages;
  rightCurrentPage.value = tmpPage;
  rightError.value = tmpError;

  loadVisiblePages("left", leftCurrentPage.value - 1);
  loadVisiblePages("right", rightCurrentPage.value - 1);
  emitDocsUpdate();
}

// Paging Navigation Methods
function goToPage(
  target: "left" | "right",
  pageNum: number,
  propagateSync = true,
) {
  const count = target === "left" ? leftPageCount.value : rightPageCount.value;
  if (count <= 0) return;
  const targetPage = Math.max(1, Math.min(pageNum, count));

  if (propagateSync) {
    setActiveScroller(target);
  }

  if (target === "left") {
    leftCurrentPage.value = targetPage;
    loadVisiblePages("left", targetPage - 1);
  } else {
    rightCurrentPage.value = targetPage;
    loadVisiblePages("right", targetPage - 1);
  }

  if (pageLayoutMode.value === "continuous") {
    scrollToPageCard(target, targetPage);
  }

  if (!propagateSync || syncMode.value === "off") return;

  const other = target === "left" ? "right" : "left";
  const otherCount =
    other === "left" ? leftPageCount.value : rightPageCount.value;
  if (otherCount <= 0) return;

  if (syncMode.value === "page") {
    const otherPage = Math.max(1, Math.min(targetPage, otherCount));
    goToPage(other, otherPage, false);
  } else if (syncMode.value === "percentage") {
    if (count > 1) {
      const ratio = (targetPage - 1) / (count - 1);
      const otherPage = Math.max(
        1,
        Math.min(Math.round(ratio * (otherCount - 1)) + 1, otherCount),
      );
      goToPage(other, otherPage, false);
    }
  }
}

function prevPage(target: "left" | "right") {
  const current =
    target === "left" ? leftCurrentPage.value : rightCurrentPage.value;
  goToPage(target, current - 1);
}

function nextPage(target: "left" | "right") {
  const current =
    target === "left" ? leftCurrentPage.value : rightCurrentPage.value;
  goToPage(target, current + 1);
}

function onPageInputChange(target: "left" | "right", e: Event) {
  const input = e.target as HTMLInputElement;
  const val = Number.parseInt(input.value, 10);
  if (!Number.isNaN(val)) {
    goToPage(target, val);
  }
}

function stepGlobalPage(delta: number) {
  const primaryTarget = hoveredPane.value;
  const current =
    primaryTarget === "left" ? leftCurrentPage.value : rightCurrentPage.value;
  goToPage(primaryTarget, current + delta);
}

function scrollToPageCard(target: "left" | "right", pageNum: number) {
  const container =
    target === "left" ? leftScrollContainer.value : rightScrollContainer.value;
  if (!container) return;
  const cards = container.querySelectorAll<HTMLElement>(".pdf-page-card");
  const targetIndex = pageNum - 1;
  const card = cards[targetIndex];
  if (card) {
    container.scrollTop = card.offsetTop - container.offsetTop;
  }
}

// Scroll Synchronization logic
function onLeftScroll() {
  updateCurrentPage("left");
  if (syncMode.value === "off" || activeScroller === "right") return;
  const leftEl = leftScrollContainer.value;
  const rightEl = rightScrollContainer.value;
  if (!leftEl || !rightEl) return;

  setActiveScroller("left");

  if (syncMode.value === "percentage") {
    const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
    if (leftMax <= 0) return;
    const ratio = leftEl.scrollTop / leftMax;

    if (syncRaf) cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      syncRaf = null;
      const rightMax = rightEl.scrollHeight - rightEl.clientHeight;
      if (rightMax > 0) {
        rightEl.scrollTop = ratio * rightMax;
        updateCurrentPage("right");
      }
    });
  } else if (syncMode.value === "page") {
    syncToPage("right", leftCurrentPage.value);
  }
}

function onRightScroll() {
  updateCurrentPage("right");
  if (syncMode.value === "off" || activeScroller === "left") return;
  const leftEl = leftScrollContainer.value;
  const rightEl = rightScrollContainer.value;
  if (!leftEl || !rightEl) return;

  setActiveScroller("right");

  if (syncMode.value === "percentage") {
    const rightMax = rightEl.scrollHeight - rightEl.clientHeight;
    if (rightMax <= 0) return;
    const ratio = rightEl.scrollTop / rightMax;

    if (syncRaf) cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      syncRaf = null;
      const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
      if (leftMax > 0) {
        leftEl.scrollTop = ratio * leftMax;
        updateCurrentPage("left");
      }
    });
  } else if (syncMode.value === "page") {
    syncToPage("left", rightCurrentPage.value);
  }
}

function updateCurrentPage(target: "left" | "right") {
  const container =
    target === "left" ? leftScrollContainer.value : rightScrollContainer.value;
  if (!container) return;

  const pageCards = container.querySelectorAll(".pdf-page-card");
  if (!pageCards.length) return;

  const containerTop = container.scrollTop;
  let activePage = 1;

  for (let i = 0; i < pageCards.length; i++) {
    const el = pageCards[i] as HTMLElement;
    if (el.offsetTop - container.offsetTop <= containerTop + 120) {
      activePage = i + 1;
    } else {
      break;
    }
  }

  if (target === "left") {
    leftCurrentPage.value = activePage;
  } else {
    rightCurrentPage.value = activePage;
  }

  loadVisiblePages(target, activePage - 1);
}

function syncToPage(target: "left" | "right", pageNum: number) {
  const container =
    target === "left" ? leftScrollContainer.value : rightScrollContainer.value;
  if (!container) return;

  const pageCards = container.querySelectorAll(".pdf-page-card");
  const targetIndex = Math.max(0, Math.min(pageNum - 1, pageCards.length - 1));
  const card = pageCards[targetIndex] as HTMLElement;

  if (card) {
    if (syncRaf) cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      syncRaf = null;
      container.scrollTop = card.offsetTop - container.offsetTop;
      if (target === "left") {
        leftCurrentPage.value = pageNum;
      } else {
        rightCurrentPage.value = pageNum;
      }
      loadVisiblePages(target, pageNum - 1);
    });
  }
}

function cycleSyncMode() {
  if (syncMode.value === "percentage") {
    syncMode.value = "page";
  } else if (syncMode.value === "page") {
    syncMode.value = "off";
  } else {
    syncMode.value = "percentage";
  }
}

function toggleLayoutMode() {
  pageLayoutMode.value =
    pageLayoutMode.value === "single" ? "continuous" : "single";
  nextTick(() => {
    if (pageLayoutMode.value === "continuous") {
      scrollToPageCard("left", leftCurrentPage.value);
      scrollToPageCard("right", rightCurrentPage.value);
    }
  });
}

function zoomIn() {
  fitWidthMode.value = false;
  zoomLevel.value = Math.min(250, zoomLevel.value + 15);
}

function zoomOut() {
  fitWidthMode.value = false;
  zoomLevel.value = Math.max(40, zoomLevel.value - 15);
}

function resetZoom() {
  fitWidthMode.value = false;
  zoomLevel.value = 100;
}

function toggleFitWidth() {
  fitWidthMode.value = !fitWidthMode.value;
  if (fitWidthMode.value) {
    zoomLevel.value = 100;
  }
}

// Split resizing
function startSplitResize(e: MouseEvent) {
  e.preventDefault();
  isResizingSplit.value = true;
  window.addEventListener("mousemove", onSplitMouseMove);
  window.addEventListener("mouseup", onSplitMouseUp);
}

function onSplitMouseMove(e: MouseEvent) {
  if (!isResizingSplit.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const percent = (offsetX / rect.width) * 100;
  leftPaneWidthPercent.value = Math.max(20, Math.min(80, percent));
}

function onSplitMouseUp() {
  isResizingSplit.value = false;
  window.removeEventListener("mousemove", onSplitMouseMove);
  window.removeEventListener("mouseup", onSplitMouseUp);
}

function handleKeydown(e: KeyboardEvent) {
  if (!containerRef.value || containerRef.value.offsetParent === null) {
    return;
  }

  const targetEl = e.target as HTMLElement | null;
  const tag = targetEl?.tagName?.toLowerCase();
  if (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    targetEl?.isContentEditable
  ) {
    return;
  }

  if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    stepGlobalPage(-1);
  } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
    e.preventDefault();
    stepGlobalPage(1);
  } else if (e.key === "Home") {
    e.preventDefault();
    goToPage(hoveredPane.value, 1);
  } else if (e.key === "End") {
    e.preventDefault();
    const count =
      hoveredPane.value === "left" ? leftPageCount.value : rightPageCount.value;
    goToPage(hoveredPane.value, count);
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (syncRaf) cancelAnimationFrame(syncRaf);
  if (activeScrollerTimer) clearTimeout(activeScrollerTimer);
  window.removeEventListener("mousemove", onSplitMouseMove);
  window.removeEventListener("mouseup", onSplitMouseUp);
  cleanupPages(leftPages.value);
  cleanupPages(rightPages.value);
});

defineExpose({
  loadPdf,
  loadPdfFromExternal,
  unloadPdf,
  revealInFinder,
  leftPdfPath,
  rightPdfPath,
});
</script>

<template>
  <div
    ref="containerRef"
    class="flex-1 flex flex-col h-full w-full bg-app-bg text-app-text select-none overflow-hidden"
  >
    <!-- Top Synchronized Toolbar -->
    <header
      class="flex-none flex items-center justify-between px-3 py-1.5 bg-app-bg-secondary border-b border-app-border text-xs z-20 gap-2"
    >
      <!-- Title & Curation Badge -->
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          DUAL PDF QA
        </span>
        <span class="text-app-text-muted text-[11px] truncate hidden md:inline">
          Vector Synchronous PDF Viewer
        </span>
      </div>

      <!-- Center Controls: Sync Mode, Global Pager, View Mode, Zoom, SWAP -->
      <div class="flex items-center gap-1 bg-app-bg p-0.5 rounded border border-app-border/80 shadow-2xs">
        <!-- Global Pager Stepper (Both Viewers) -->
        <button
          type="button"
          @click="stepGlobalPage(-1)"
          :disabled="leftCurrentPage <= 1 && rightCurrentPage <= 1"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-app-bg-hover text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Previous Page (ArrowLeft / PageUp)"
        >
          ◀
        </button>
        <button
          type="button"
          @click="stepGlobalPage(1)"
          :disabled="leftCurrentPage >= leftPageCount && rightCurrentPage >= rightPageCount"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-app-bg-hover text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Next Page (ArrowRight / PageDown / Space)"
        >
          ▶
        </button>

        <div class="w-px h-3.5 bg-app-border mx-0.5"></div>

        <!-- Sync Mode Toggle -->
        <button
          type="button"
          @click="cycleSyncMode"
          class="flex items-center gap-1 h-6 px-2 rounded transition-colors text-[11px] font-mono font-semibold cursor-pointer"
          :class="[
            syncMode !== 'off'
              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
              : 'text-app-text-muted hover:text-app-text hover:bg-app-bg-hover'
          ]"
          :title="`Scroll-Sync: ${syncMode === 'percentage' ? 'Percentage (%)' : syncMode === 'page' ? 'Page Lockstep (P)' : 'Off'}`"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span>Sync: {{ syncMode === 'percentage' ? '%' : syncMode === 'page' ? 'Page' : 'Off' }}</span>
        </button>

        <div class="w-px h-3.5 bg-app-border mx-0.5"></div>

        <!-- Layout Mode Toggle (Single Page vs Continuous Scroll) -->
        <button
          type="button"
          @click="toggleLayoutMode"
          class="flex items-center gap-1 h-6 px-2 rounded hover:bg-app-bg-hover text-app-text text-[11px] font-mono transition-colors cursor-pointer"
          :title="pageLayoutMode === 'single' ? 'Switch to Continuous Scroll View' : 'Switch to Single Page View'"
        >
          <span>{{ pageLayoutMode === 'single' ? '📄 Single' : '📜 Scroll' }}</span>
        </button>

        <div class="w-px h-3.5 bg-app-border mx-0.5"></div>

        <!-- SWAP Button -->
        <button
          type="button"
          @click="handleSwap"
          class="flex items-center gap-1 h-6 px-2 rounded hover:bg-app-bg-hover text-app-text text-[11px] font-mono transition-colors active:scale-95 cursor-pointer"
          title="Swap Documents: Left ⇄ Right (SWAP)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-amber-500"
          >
            <polyline points="16 3 21 8 16 13"/>
            <line x1="21" y1="8" x2="9" y2="8"/>
            <polyline points="8 21 3 16 8 11"/>
            <line x1="3" y1="16" x2="15" y2="16"/>
          </svg>
          <span class="hidden sm:inline">SWAP</span>
        </button>

        <div class="w-px h-3.5 bg-app-border mx-0.5"></div>

        <!-- Zoom Controls -->
        <button
          type="button"
          @click="zoomOut"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-app-bg-hover text-app-text-muted hover:text-app-text transition-colors font-bold text-xs cursor-pointer"
          title="Zoom Out (-)"
        >
          -
        </button>
        <button
          type="button"
          @click="resetZoom"
          class="px-1.5 h-6 flex items-center justify-center rounded hover:bg-app-bg-hover text-[11px] font-mono text-app-text transition-colors cursor-pointer"
          title="100% Zoom"
        >
          {{ fitWidthMode ? 'Fit' : `${zoomLevel}%` }}
        </button>
        <button
          type="button"
          @click="zoomIn"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-app-bg-hover text-app-text-muted hover:text-app-text transition-colors font-bold text-xs cursor-pointer"
          title="Zoom In (+)"
        >
          +
        </button>
        <button
          type="button"
          @click="toggleFitWidth"
          class="h-6 px-2 rounded transition-colors text-[11px] font-mono cursor-pointer"
          :class="[
            fitWidthMode
              ? 'text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10'
              : 'text-app-text-muted hover:text-app-text hover:bg-app-bg-hover'
          ]"
          title="Fit to Width"
        >
          Fit Width
        </button>
      </div>

      <!-- Close / Back to Editor -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="$emit('close')"
          class="flex items-center gap-1.5 h-6 px-2.5 rounded bg-app-bg hover:bg-app-bg-hover border border-app-border text-[11px] font-medium transition-colors text-app-text shadow-2xs active:scale-95 cursor-pointer"
          title="Close PDF Viewer (Return to Editor)"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span class="hidden sm:inline">Close</span>
        </button>
      </div>
    </header>

    <!-- Dual Split View Content -->
    <div class="flex-1 flex min-h-0 relative overflow-hidden bg-app-bg-secondary/40">
      <!-- LEFT PANE: Reference Document -->
      <div
        class="flex flex-col min-w-[200px] h-full border-r border-app-border overflow-hidden"
        :style="{ width: `${leftPaneWidthPercent}%` }"
        @mouseenter="hoveredPane = 'left'"
      >
        <!-- Left Header Bar with Paging Stepper -->
        <div
          class="flex-none flex items-center justify-between px-3 py-1.5 bg-app-bg border-b border-app-border text-xs gap-2"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">
              [1] Reference
            </span>
            <template v-if="leftPdfName">
              <span
                class="font-mono text-[11px] font-semibold text-app-text truncate"
                :title="leftPdfPath"
              >
                {{ leftPdfName }}
              </span>
              <span
                v-if="getDirectoryName(leftPdfPath)"
                class="text-[10px] text-app-text-muted font-mono truncate hidden sm:inline opacity-70 shrink-0"
                :title="leftPdfPath"
              >
                📁 {{ getDirectoryName(leftPdfPath) }}/
              </span>
              <button
                type="button"
                @click="revealInFinder(leftPdfPath)"
                class="p-0.5 rounded hover:bg-app-bg-hover text-app-text-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                title="Reveal in System Finder"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
              <button
                type="button"
                @click="unloadPdf('left')"
                class="p-0.5 rounded hover:bg-app-bg-hover text-app-text-muted hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                title="Unload Document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </template>
            <span v-else class="text-app-text-muted italic text-[11px]">
              No document selected
            </span>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Left Pager Controls -->
            <div v-if="leftPageCount > 0" class="flex items-center gap-1 font-mono text-xs">
              <button
                type="button"
                @click="prevPage('left')"
                :disabled="leftCurrentPage <= 1"
                class="w-5 h-5 flex items-center justify-center rounded hover:bg-app-bg-hover disabled:opacity-30 disabled:pointer-events-none border border-app-border text-app-text transition-colors cursor-pointer text-[10px]"
                title="Previous Page (◀)"
              >
                ◀
              </button>
              <div class="flex items-center gap-0.5 px-1 py-0.5 rounded bg-app-bg-secondary border border-app-border text-[11px]">
                <input
                  type="number"
                  min="1"
                  :max="leftPageCount"
                  :value="leftCurrentPage"
                  @change="onPageInputChange('left', $event)"
                  @keydown.enter="($event.target as HTMLInputElement).blur()"
                  class="w-7 text-center bg-transparent text-app-text font-bold font-mono focus:outline-none"
                  title="Jump to Page"
                />
                <span class="text-app-text-muted">/ {{ leftPageCount }}</span>
              </div>
              <button
                type="button"
                @click="nextPage('left')"
                :disabled="leftCurrentPage >= leftPageCount"
                class="w-5 h-5 flex items-center justify-center rounded hover:bg-app-bg-hover disabled:opacity-30 disabled:pointer-events-none border border-app-border text-app-text transition-colors cursor-pointer text-[10px]"
                title="Next Page (▶)"
              >
                ▶
              </button>
            </div>

            <button
              type="button"
              @click="pickPdf('left')"
              class="h-6 px-2 rounded bg-app-bg-secondary hover:bg-app-bg-hover border border-app-border text-[11px] font-medium transition-colors cursor-pointer text-app-text shadow-2xs active:scale-95"
            >
              {{ leftPdfPath ? 'Change...' : 'Load PDF...' }}
            </button>
          </div>
        </div>

        <!-- Left Content Area -->
        <div
          ref="leftScrollContainer"
          @scroll="onLeftScroll"
          @wheel="setActiveScroller('left')"
          @pointerdown="setActiveScroller('left')"
          @touchstart="setActiveScroller('left')"
          class="flex-1 overflow-y-auto px-4 py-4 relative"
          :class="pageLayoutMode === 'continuous' ? 'space-y-4' : 'flex items-center justify-center'"
        >
          <!-- Empty State -->
          <div
            v-if="!leftPdfPath"
            class="h-full flex flex-col items-center justify-center text-center p-6 text-app-text-muted"
          >
            <div class="w-12 h-12 rounded-full bg-app-bg flex items-center justify-center mb-3 border border-app-border shadow-xs text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="font-semibold text-sm text-app-text mb-1">Load Reference PDF</div>
            <p class="text-xs max-w-[280px] mb-3">
              Select a reference PDF document to compare and proofread.
            </p>
            <button
              type="button"
              @click="pickPdf('left')"
              class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              Select PDF
            </button>
          </div>

          <!-- Loading Spinner -->
          <div v-else-if="leftLoading" class="p-8 text-center text-app-text-muted text-xs">
            <div class="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2 text-amber-500"></div>
            <div>Loading and rendering PDF...</div>
          </div>

          <!-- Error Alert -->
          <div v-else-if="leftError" class="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            Failed to load: {{ leftError }}
          </div>

          <!-- SINGLE PAGE MODE -->
          <template v-else-if="pageLayoutMode === 'single'">
            <div
              v-if="activeLeftPage"
              class="pdf-page-card bg-white text-black shadow-xl mx-auto rounded overflow-hidden border border-slate-300 dark:border-slate-700 relative"
              :style="pageWidthStyle"
            >
              <div class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] select-none pointer-events-none">
                #{{ leftCurrentPage }} / {{ leftPageCount }}
              </div>
              <img
                v-if="activeLeftPage.blobUrl"
                :src="activeLeftPage.blobUrl"
                :alt="`Page ${leftCurrentPage}`"
                class="pdf-page-image w-full h-auto block select-none pointer-events-none"
              />
              <div
                v-else
                class="w-full aspect-[1/1.414] bg-slate-100 flex flex-col items-center justify-center text-slate-400 animate-pulse"
              >
                <div class="text-xs font-mono">Loading page #{{ leftCurrentPage }}...</div>
              </div>
            </div>
          </template>

          <!-- CONTINUOUS SCROLL MODE -->
          <template v-else>
            <div
              v-for="page in leftPages"
              :key="`left-page-${page.index}`"
              class="pdf-page-card bg-white text-black shadow-lg mx-auto rounded overflow-hidden transition-all duration-150 border border-slate-300 dark:border-slate-700 relative"
              :style="pageWidthStyle"
            >
              <div class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] select-none pointer-events-none">
                #{{ page.index + 1 }}
              </div>
              <img
                v-if="page.blobUrl"
                :src="page.blobUrl"
                :alt="`Page ${page.index + 1}`"
                class="pdf-page-image w-full h-auto block select-none pointer-events-none"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="w-full aspect-[1/1.414] bg-slate-100 flex flex-col items-center justify-center text-slate-400 animate-pulse"
              >
                <div class="text-xs font-mono">Loading page #{{ page.index + 1 }}...</div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Resizable Center Splitter -->
      <div
        @mousedown="startSplitResize"
        @dblclick="leftPaneWidthPercent = 50"
        class="w-1.5 -ml-0.5 -mr-0.5 bg-transparent hover:bg-amber-500 active:bg-amber-600 cursor-col-resize select-none transition-colors h-full z-30"
        title="Drag to resize split (Double-click for 50/50)"
      />

      <!-- RIGHT PANE: Comparison Document -->
      <div
        class="flex flex-col min-w-[200px] h-full overflow-hidden"
        :style="{ width: `${100 - leftPaneWidthPercent}%` }"
        @mouseenter="hoveredPane = 'right'"
      >
        <!-- Right Header Bar with Paging Stepper -->
        <div
          class="flex-none flex items-center justify-between px-3 py-1.5 bg-app-bg border-b border-app-border text-xs gap-2"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">
              [2] Comparison
            </span>
            <template v-if="rightPdfName">
              <span
                class="font-mono text-[11px] font-semibold text-app-text truncate"
                :title="rightPdfPath"
              >
                {{ rightPdfName }}
              </span>
              <span
                v-if="getDirectoryName(rightPdfPath)"
                class="text-[10px] text-app-text-muted font-mono truncate hidden sm:inline opacity-70 shrink-0"
                :title="rightPdfPath"
              >
                📁 {{ getDirectoryName(rightPdfPath) }}/
              </span>
              <button
                type="button"
                @click="revealInFinder(rightPdfPath)"
                class="p-0.5 rounded hover:bg-app-bg-hover text-app-text-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                title="Reveal in System Finder"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
              <button
                type="button"
                @click="unloadPdf('right')"
                class="p-0.5 rounded hover:bg-app-bg-hover text-app-text-muted hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                title="Unload Document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </template>
            <span v-else class="text-app-text-muted italic text-[11px]">
              No document selected
            </span>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Right Pager Controls -->
            <div v-if="rightPageCount > 0" class="flex items-center gap-1 font-mono text-xs">
              <button
                type="button"
                @click="prevPage('right')"
                :disabled="rightCurrentPage <= 1"
                class="w-5 h-5 flex items-center justify-center rounded hover:bg-app-bg-hover disabled:opacity-30 disabled:pointer-events-none border border-app-border text-app-text transition-colors cursor-pointer text-[10px]"
                title="Previous Page (◀)"
              >
                ◀
              </button>
              <div class="flex items-center gap-0.5 px-1 py-0.5 rounded bg-app-bg-secondary border border-app-border text-[11px]">
                <input
                  type="number"
                  min="1"
                  :max="rightPageCount"
                  :value="rightCurrentPage"
                  @change="onPageInputChange('right', $event)"
                  @keydown.enter="($event.target as HTMLInputElement).blur()"
                  class="w-7 text-center bg-transparent text-app-text font-bold font-mono focus:outline-none"
                  title="Jump to Page"
                />
                <span class="text-app-text-muted">/ {{ rightPageCount }}</span>
              </div>
              <button
                type="button"
                @click="nextPage('right')"
                :disabled="rightCurrentPage >= rightPageCount"
                class="w-5 h-5 flex items-center justify-center rounded hover:bg-app-bg-hover disabled:opacity-30 disabled:pointer-events-none border border-app-border text-app-text transition-colors cursor-pointer text-[10px]"
                title="Next Page (▶)"
              >
                ▶
              </button>
            </div>

            <button
              type="button"
              @click="pickPdf('right')"
              class="h-6 px-2 rounded bg-app-bg-secondary hover:bg-app-bg-hover border border-app-border text-[11px] font-medium transition-colors cursor-pointer text-app-text shadow-2xs active:scale-95"
            >
              {{ rightPdfPath ? 'Change...' : 'Load PDF...' }}
            </button>
          </div>
        </div>

        <!-- Right Content Area -->
        <div
          ref="rightScrollContainer"
          @scroll="onRightScroll"
          @wheel="setActiveScroller('right')"
          @pointerdown="setActiveScroller('right')"
          @touchstart="setActiveScroller('right')"
          class="flex-1 overflow-y-auto px-4 py-4 relative"
          :class="pageLayoutMode === 'continuous' ? 'space-y-4' : 'flex items-center justify-center'"
        >
          <!-- Empty State -->
          <div
            v-if="!rightPdfPath"
            class="h-full flex flex-col items-center justify-center text-center p-6 text-app-text-muted"
          >
            <div class="w-12 h-12 rounded-full bg-app-bg flex items-center justify-center mb-3 border border-app-border shadow-xs text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="font-semibold text-sm text-app-text mb-1">Load Comparison PDF</div>
            <p class="text-xs max-w-[280px] mb-3">
              Select the second PDF to compare and proofread side by side.
            </p>
            <button
              type="button"
              @click="pickPdf('right')"
              class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              Select PDF
            </button>
          </div>

          <!-- Loading Spinner -->
          <div v-else-if="rightLoading" class="p-8 text-center text-app-text-muted text-xs">
            <div class="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2 text-amber-500"></div>
            <div>Loading and rendering PDF...</div>
          </div>

          <!-- Error Alert -->
          <div v-else-if="rightError" class="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            Failed to load: {{ rightError }}
          </div>

          <!-- SINGLE PAGE MODE -->
          <template v-else-if="pageLayoutMode === 'single'">
            <div
              v-if="activeRightPage"
              class="pdf-page-card bg-white text-black shadow-xl mx-auto rounded overflow-hidden border border-slate-300 dark:border-slate-700 relative"
              :style="pageWidthStyle"
            >
              <div class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] select-none pointer-events-none">
                #{{ rightCurrentPage }} / {{ rightPageCount }}
              </div>
              <img
                v-if="activeRightPage.blobUrl"
                :src="activeRightPage.blobUrl"
                :alt="`Page ${rightCurrentPage}`"
                class="pdf-page-image w-full h-auto block select-none pointer-events-none"
              />
              <div
                v-else
                class="w-full aspect-[1/1.414] bg-slate-100 flex flex-col items-center justify-center text-slate-400 animate-pulse"
              >
                <div class="text-xs font-mono">Loading page #{{ rightCurrentPage }}...</div>
              </div>
            </div>
          </template>

          <!-- CONTINUOUS SCROLL MODE -->
          <template v-else>
            <div
              v-for="page in rightPages"
              :key="`right-page-${page.index}`"
              class="pdf-page-card bg-white text-black shadow-lg mx-auto rounded overflow-hidden transition-all duration-150 border border-slate-300 dark:border-slate-700 relative"
              :style="pageWidthStyle"
            >
              <div class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[10px] select-none pointer-events-none">
                #{{ page.index + 1 }}
              </div>
              <img
                v-if="page.blobUrl"
                :src="page.blobUrl"
                :alt="`Page ${page.index + 1}`"
                class="pdf-page-image w-full h-auto block select-none pointer-events-none"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="w-full aspect-[1/1.414] bg-slate-100 flex flex-col items-center justify-center text-slate-400 animate-pulse"
              >
                <div class="text-xs font-mono">Loading page #{{ page.index + 1 }}...</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
