<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { renderMarkdown } from "../lib/markdown";
import { computeCollationDiff, type CollationResult } from "../lib/diffCollation";
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

export type CompareDocKind = "pdf" | "markdown";

export interface OpenPdfDoc {
  slot: "left" | "right";
  slotLabel: string;
  kind?: CompareDocKind;
  name: string;
  path: string;
  pageCount: number;
  currentPage: number;
  content?: string;
}

export type AnnotationType =
  | "typo"
  | "diacritic"
  | "layout"
  | "ocr"
  | "omission"
  | "general";

export interface PdfAnnotation {
  id: string;
  slot: "left" | "right";
  pageIndex: number; // 0-based
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
  type: AnnotationType;
  note: string;
  createdAt: number;
}

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update-docs", docs: OpenPdfDoc[]): void;
}>();

// Annotation & Proofing State
const annotations = ref<PdfAnnotation[]>([]);
const isAnnotateMode = ref<boolean>(false);
const showProofingDrawer = ref<boolean>(false);
const selectedAnnotationId = ref<string | null>(null);
const drawerSlotFilter = ref<"all" | "left" | "right">("all");
const filteredDrawerAnnotations = computed(() => {
  if (drawerSlotFilter.value === "all") return annotations.value;
  return annotations.value.filter((a) => a.slot === drawerSlotFilter.value);
});
const toastMessage = ref<string | null>(null);
const noteInputRef = ref<HTMLTextAreaElement | null>(null);

// In-progress Drawing State
interface DrawingTarget {
  slot: "left" | "right";
  pageIndex: number;
  card: HTMLElement;
}
const activeDrawingTarget = ref<DrawingTarget | null>(null);
const drawStart = ref<{ x: number; y: number } | null>(null);
const drawCurrent = ref<{ x: number; y: number; width: number; height: number } | null>(null);

// Pending Annotation Popover
const pendingAnnotation = ref<{
  slot: "left" | "right";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);
const newAnnotationType = ref<AnnotationType>("typo");
const newAnnotationNote = ref<string>("");

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const leftBrowserPdfUrl = ref<string | null>(null);
const rightBrowserPdfUrl = ref<string | null>(null);

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
const leftDocKind = ref<CompareDocKind>("pdf");
const leftPdfPath = ref<string>("");
const leftPdfName = ref<string>("");
const leftMarkdownContent = ref<string>("");
const leftMarkdownHtml = ref<string>("");
const leftViewType = ref<"rendered" | "raw">("rendered");
const leftPageCount = ref<number>(0);
const leftPages = ref<PageItem[]>([]);
const leftCurrentPage = ref<number>(1);
const leftLoading = ref<boolean>(false);
const leftError = ref<string | null>(null);

// Right Document State
const rightDocKind = ref<CompareDocKind>("pdf");
const rightPdfPath = ref<string>("");
const rightPdfName = ref<string>("");
const rightMarkdownContent = ref<string>("");
const rightMarkdownHtml = ref<string>("");
const rightViewType = ref<"rendered" | "raw">("rendered");
const rightPageCount = ref<number>(0);
const rightPages = ref<PageItem[]>([]);
const rightCurrentPage = ref<number>(1);
const rightLoading = ref<boolean>(false);
const rightError = ref<string | null>(null);

// Philological Collation / Diff State
const isDiffActive = ref<boolean>(false);
const diffResult = ref<CollationResult | null>(null);

const canShowDiff = computed(() => {
  return (
    leftDocKind.value === "markdown" &&
    rightDocKind.value === "markdown" &&
    !!leftMarkdownContent.value &&
    !!rightMarkdownContent.value
  );
});

function updateCollationDiff() {
  if (canShowDiff.value && isDiffActive.value) {
    diffResult.value = computeCollationDiff(
      leftMarkdownContent.value,
      rightMarkdownContent.value,
    );
  } else {
    diffResult.value = null;
  }
}

watch(
  [isDiffActive, leftMarkdownContent, rightMarkdownContent, canShowDiff],
  () => {
    updateCollationDiff();
  },
);

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
      kind: leftDocKind.value,
      name: leftPdfName.value,
      path: leftPdfPath.value,
      pageCount: leftPageCount.value,
      currentPage: leftCurrentPage.value,
      content: leftMarkdownContent.value,
    });
  }
  if (rightPdfPath.value) {
    list.push({
      slot: "right",
      slotLabel: "[2] Comp",
      kind: rightDocKind.value,
      name: rightPdfName.value,
      path: rightPdfPath.value,
      pageCount: rightPageCount.value,
      currentPage: rightCurrentPage.value,
      content: rightMarkdownContent.value,
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
    if (leftBrowserPdfUrl.value) {
      URL.revokeObjectURL(leftBrowserPdfUrl.value);
      leftBrowserPdfUrl.value = null;
    }
    leftDocKind.value = "pdf";
    leftPdfPath.value = "";
    leftPdfName.value = "";
    leftMarkdownContent.value = "";
    leftMarkdownHtml.value = "";
    leftPageCount.value = 0;
    leftPages.value = [];
    leftCurrentPage.value = 1;
    leftLoading.value = false;
    leftError.value = null;
  } else {
    rightLoadToken++;
    cleanupPages(rightPages.value);
    if (rightBrowserPdfUrl.value) {
      URL.revokeObjectURL(rightBrowserPdfUrl.value);
      rightBrowserPdfUrl.value = null;
    }
    rightDocKind.value = "pdf";
    rightPdfPath.value = "";
    rightPdfName.value = "";
    rightMarkdownContent.value = "";
    rightMarkdownHtml.value = "";
    rightPageCount.value = 0;
    rightPages.value = [];
    rightCurrentPage.value = 1;
    rightLoading.value = false;
    rightError.value = null;
  }
  emitDocsUpdate();
}

async function loadMarkdown(
  target: "left" | "right",
  path: string,
  content?: string,
) {
  const name = path.split(/[/\\]/).pop() || "Document.md";
  let text = content;
  if (text === undefined) {
    try {
      if (isTauri) {
        text = await readTextFile(path);
      } else {
        text = "";
      }
    } catch (e) {
      console.error("Failed to read markdown file:", e);
      text = "";
    }
  }

  if (target === "left") {
    leftLoadToken++;
    cleanupPages(leftPages.value);
    if (leftBrowserPdfUrl.value) {
      URL.revokeObjectURL(leftBrowserPdfUrl.value);
      leftBrowserPdfUrl.value = null;
    }
    leftDocKind.value = "markdown";
    leftPdfPath.value = path;
    leftPdfName.value = name;
    leftMarkdownContent.value = text || "";
    leftMarkdownHtml.value = renderMarkdown(text || "", { sourceLines: true });
    leftPageCount.value = 1;
    leftCurrentPage.value = 1;
    leftLoading.value = false;
    leftError.value = null;
  } else {
    rightLoadToken++;
    cleanupPages(rightPages.value);
    if (rightBrowserPdfUrl.value) {
      URL.revokeObjectURL(rightBrowserPdfUrl.value);
      rightBrowserPdfUrl.value = null;
    }
    rightDocKind.value = "markdown";
    rightPdfPath.value = path;
    rightPdfName.value = name;
    rightMarkdownContent.value = text || "";
    rightMarkdownHtml.value = renderMarkdown(text || "", { sourceLines: true });
    rightPageCount.value = 1;
    rightCurrentPage.value = 1;
    rightLoading.value = false;
    rightError.value = null;
  }
  emitDocsUpdate();
}

async function loadDocumentFromExternal(
  path: string,
  slot?: "left" | "right",
  content?: string,
) {
  const isMd =
    path.toLowerCase().endsWith(".md") ||
    path.toLowerCase().endsWith(".markdown");
  const targetSlot =
    slot ||
    (!leftPdfPath.value
      ? "left"
      : !rightPdfPath.value
        ? "right"
        : hoveredPane.value || "right");

  if (isMd) {
    await loadMarkdown(targetSlot, path, content);
  } else {
    await loadPdf(targetSlot, path);
  }
}

async function loadPdfFromExternal(path: string, slot?: "left" | "right") {
  await loadDocumentFromExternal(path, slot);
}

async function loadDocumentPair(
  leftPath: string,
  rightPath?: string,
  leftContent?: string,
  rightContent?: string,
) {
  const promises: Promise<void>[] = [];
  const leftIsMd =
    leftPath.toLowerCase().endsWith(".md") ||
    leftPath.toLowerCase().endsWith(".markdown");

  if (leftPdfPath.value !== leftPath || leftError.value) {
    if (leftIsMd) {
      promises.push(loadMarkdown("left", leftPath, leftContent));
    } else {
      promises.push(loadPdf("left", leftPath));
    }
  }

  if (rightPath) {
    const rightIsMd =
      rightPath.toLowerCase().endsWith(".md") ||
      rightPath.toLowerCase().endsWith(".markdown");
    if (rightPdfPath.value !== rightPath || rightError.value) {
      if (rightIsMd) {
        promises.push(loadMarkdown("right", rightPath, rightContent));
      } else {
        promises.push(loadPdf("right", rightPath));
      }
    }
  } else if (rightPdfPath.value) {
    unloadPdf("right");
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

async function loadPdfPair(leftPath: string, rightPath?: string) {
  await loadDocumentPair(leftPath, rightPath);
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

async function pickDocument(target: "left" | "right") {
  if (!isTauri) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.md,.markdown";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const isMd =
        file.name.toLowerCase().endsWith(".md") ||
        file.name.toLowerCase().endsWith(".markdown");
      if (isMd) {
        const text = await file.text();
        await loadMarkdown(target, `browser://${file.name}`, text);
      } else {
        await loadBrowserPdfFile(target, file);
      }
    };
    input.click();
    return;
  }

  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Vergleichbare Dokumente (*.pdf, *.md)",
          extensions: ["pdf", "md", "markdown"],
        },
        { name: "PDF Dokumente (*.pdf)", extensions: ["pdf"] },
        { name: "Markdown Dokumente (*.md)", extensions: ["md", "markdown"] },
        { name: "Alle Dateien", extensions: ["*"] },
      ],
    });

    if (selected && typeof selected === "string") {
      const isMd =
        selected.toLowerCase().endsWith(".md") ||
        selected.toLowerCase().endsWith(".markdown");
      if (isMd) {
        await loadMarkdown(target, selected);
      } else {
        await loadPdf(target, selected);
      }
    }
  } catch (err) {
    console.error(`Failed to pick document for ${target}:`, err);
  }
}

async function pickPdf(target: "left" | "right") {
  await pickDocument(target);
}

async function loadBrowserPdfFile(target: "left" | "right", file: File) {
  const blobUrl = URL.createObjectURL(file);
  if (target === "left") {
    if (leftBrowserPdfUrl.value) URL.revokeObjectURL(leftBrowserPdfUrl.value);
    leftDocKind.value = "pdf";
    leftMarkdownContent.value = "";
    leftMarkdownHtml.value = "";
    leftBrowserPdfUrl.value = blobUrl;
    leftPdfName.value = file.name;
    leftPdfPath.value = `browser://${file.name}`;
    leftPageCount.value = 1;
    leftCurrentPage.value = 1;
    leftLoading.value = false;
    leftError.value = null;
  } else {
    if (rightBrowserPdfUrl.value) URL.revokeObjectURL(rightBrowserPdfUrl.value);
    rightDocKind.value = "pdf";
    rightMarkdownContent.value = "";
    rightMarkdownHtml.value = "";
    rightBrowserPdfUrl.value = blobUrl;
    rightPdfName.value = file.name;
    rightPdfPath.value = `browser://${file.name}`;
    rightPageCount.value = 1;
    rightCurrentPage.value = 1;
    rightLoading.value = false;
    rightError.value = null;
  }
  emitDocsUpdate();
  showToast(`${file.name} im Browser geladen.`);
}

async function loadPdf(target: "left" | "right", path: string) {
  if (target === "left") {
    leftLoadToken++;
    cleanupPages(leftPages.value);
    if (leftBrowserPdfUrl.value) {
      URL.revokeObjectURL(leftBrowserPdfUrl.value);
      leftBrowserPdfUrl.value = null;
    }
    leftDocKind.value = "pdf";
    leftMarkdownContent.value = "";
    leftMarkdownHtml.value = "";
    leftPdfPath.value = path;
    leftLoading.value = true;
    leftError.value = null;
    leftPages.value = [];
  } else {
    rightLoadToken++;
    cleanupPages(rightPages.value);
    if (rightBrowserPdfUrl.value) {
      URL.revokeObjectURL(rightBrowserPdfUrl.value);
      rightBrowserPdfUrl.value = null;
    }
    rightDocKind.value = "pdf";
    rightMarkdownContent.value = "";
    rightMarkdownHtml.value = "";
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
  const tmpDocKind = leftDocKind.value;
  const tmpMdContent = leftMarkdownContent.value;
  const tmpMdHtml = leftMarkdownHtml.value;
  const tmpViewType = leftViewType.value;
  const tmpBrowserPdfUrl = leftBrowserPdfUrl.value;

  leftPdfPath.value = rightPdfPath.value;
  leftPdfName.value = rightPdfName.value;
  leftPageCount.value = rightPageCount.value;
  leftPages.value = rightPages.value;
  leftCurrentPage.value = rightCurrentPage.value;
  leftError.value = rightError.value;
  leftDocKind.value = rightDocKind.value;
  leftMarkdownContent.value = rightMarkdownContent.value;
  leftMarkdownHtml.value = rightMarkdownHtml.value;
  leftViewType.value = rightViewType.value;
  leftBrowserPdfUrl.value = rightBrowserPdfUrl.value;

  rightPdfPath.value = tmpPath;
  rightPdfName.value = tmpName;
  rightPageCount.value = tmpCount;
  rightPages.value = tmpPages;
  rightCurrentPage.value = tmpPage;
  rightError.value = tmpError;
  rightDocKind.value = tmpDocKind;
  rightMarkdownContent.value = tmpMdContent;
  rightMarkdownHtml.value = tmpMdHtml;
  rightViewType.value = tmpViewType;
  rightBrowserPdfUrl.value = tmpBrowserPdfUrl;

  if (leftDocKind.value === "pdf" && leftPdfPath.value && !leftBrowserPdfUrl.value) {
    loadVisiblePages("left", leftCurrentPage.value - 1);
  }
  if (rightDocKind.value === "pdf" && rightPdfPath.value && !rightBrowserPdfUrl.value) {
    loadVisiblePages("right", rightCurrentPage.value - 1);
  }
  emitDocsUpdate();
}

function handleMarkdownClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a");
  if (!anchor) return;

  const href = anchor.getAttribute("href");
  if (!href) return;

  if (href.startsWith("#")) return;

  event.preventDefault();
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
    if (isTauri) {
      openUrl(href).catch((err) => console.error("Fehler beim Öffnen des Links:", err));
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }
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

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string) {
  toastMessage.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = null;
  }, 3500);
}

function toggleAnnotateMode() {
  isAnnotateMode.value = !isAnnotateMode.value;
  if (isAnnotateMode.value) {
    showToast("Annotation-Modus aktiviert: Ziehe eine Bounding-Box über Auffälligkeiten.");
  }
}

function getAnnotationsForPage(slot: "left" | "right", pageIndex: number) {
  return annotations.value.filter(
    (a) => a.slot === slot && a.pageIndex === pageIndex,
  );
}

function selectAnnotation(anno: PdfAnnotation) {
  selectedAnnotationId.value = anno.id;
}

function deleteAnnotation(id: string) {
  annotations.value = annotations.value.filter((a) => a.id !== id);
  if (selectedAnnotationId.value === id) {
    selectedAnnotationId.value = null;
  }
  showToast("Annotation gelöscht.");
}

function clearAllAnnotations() {
  if (annotations.value.length === 0) return;
  annotations.value = [];
  selectedAnnotationId.value = null;
  showToast("Alle Annotationen gelöscht.");
}

function jumpToAnnotation(anno: PdfAnnotation) {
  selectedAnnotationId.value = anno.id;
  goToPage(anno.slot, anno.pageIndex + 1);
}

function onPageMouseDown(
  slot: "left" | "right",
  pageIndex: number,
  e: MouseEvent,
) {
  if (!isAnnotateMode.value) return;
  const target = e.target as HTMLElement | null;
  if (
    target?.closest(".annotation-box") ||
    target?.closest(".annotation-popover")
  ) {
    return;
  }

  const card =
    ((e.currentTarget as HTMLElement) ||
      target?.closest(".pdf-page-card")) as HTMLElement | null;
  if (!card) return;
  const rect = card.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const startX = ((e.clientX - rect.left) / rect.width) * 100;
  const startY = ((e.clientY - rect.top) / rect.height) * 100;

  activeDrawingTarget.value = { slot, pageIndex, card };
  drawStart.value = { x: startX, y: startY };
  drawCurrent.value = { x: startX, y: startY, width: 0, height: 0 };

  window.addEventListener("mousemove", onDrawMouseMove);
  window.addEventListener("mouseup", onDrawMouseUp);
}

function onDrawMouseMove(e: MouseEvent) {
  if (!activeDrawingTarget.value || !drawStart.value) return;
  const rect = activeDrawingTarget.value.card.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const clientX = Math.max(rect.left, Math.min(rect.right, e.clientX));
  const clientY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));

  const currentX = ((clientX - rect.left) / rect.width) * 100;
  const currentY = ((clientY - rect.top) / rect.height) * 100;

  const x = Math.min(drawStart.value.x, currentX);
  const y = Math.min(drawStart.value.y, currentY);
  const width = Math.abs(currentX - drawStart.value.x);
  const height = Math.abs(currentY - drawStart.value.y);

  drawCurrent.value = { x, y, width, height };
}

function onDrawMouseUp() {
  window.removeEventListener("mousemove", onDrawMouseMove);
  window.removeEventListener("mouseup", onDrawMouseUp);

  if (!activeDrawingTarget.value || !drawCurrent.value) {
    activeDrawingTarget.value = null;
    drawStart.value = null;
    drawCurrent.value = null;
    return;
  }

  const { slot, pageIndex } = activeDrawingTarget.value;
  const { x, y, width, height } = drawCurrent.value;

  activeDrawingTarget.value = null;
  drawStart.value = null;
  drawCurrent.value = null;

  // Minimum threshold: 1.5% in width and height
  if (width >= 1.5 && height >= 1.5) {
    pendingAnnotation.value = {
      slot,
      pageIndex,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
    };
    newAnnotationType.value = "typo";
    newAnnotationNote.value = "";
    nextTick(() => {
      noteInputRef.value?.focus();
    });
  }
}

function savePendingAnnotation() {
  if (!pendingAnnotation.value) return;
  const newAnno: PdfAnnotation = {
    id: `anno_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    slot: pendingAnnotation.value.slot,
    pageIndex: pendingAnnotation.value.pageIndex,
    x: pendingAnnotation.value.x,
    y: pendingAnnotation.value.y,
    width: pendingAnnotation.value.width,
    height: pendingAnnotation.value.height,
    type: newAnnotationType.value,
    note: newAnnotationNote.value.trim(),
    createdAt: Date.now(),
  };
  annotations.value.push(newAnno);
  selectedAnnotationId.value = newAnno.id;
  pendingAnnotation.value = null;
  newAnnotationNote.value = "";
  showToast(`Annotation #${annotations.value.length} gespeichert.`);
}

function cancelPendingAnnotation() {
  pendingAnnotation.value = null;
  newAnnotationNote.value = "";
}

function getAnnotationTypeLabel(type: AnnotationType): string {
  switch (type) {
    case "typo":
      return "Typo (Druckfehler)";
    case "diacritic":
      return "Diakritikum (Makron/Akzent)";
    case "layout":
      return "Layout & Umbruch";
    case "ocr":
      return "OCR-Artefakt";
    case "omission":
      return "Auslassung / Text fehlt";
    case "general":
    default:
      return "Allgemeiner Hinweis";
  }
}

async function copyAiReviewPrompt() {
  const hasDiffs = diffResult.value && diffResult.value.stats.totalDiffs > 0;
  if (annotations.value.length === 0 && !hasDiffs) {
    showToast("Keine Annotationen oder Textabweichungen zum Generieren eines Prompts vorhanden.");
    return;
  }

  const leftKind = leftDocKind.value === "markdown" ? "Markdown" : "PDF";
  const rightKind = rightDocKind.value === "markdown" ? "Markdown" : "PDF";
  const leftDoc = leftPdfName.value
    ? `${leftPdfName.value} (${leftKind})`
    : "Dokument 1 (Referenz)";
  const rightDoc = rightPdfName.value
    ? `${rightPdfName.value} (${rightKind})`
    : "Dokument 2 (Vergleich)";

  const lines = [
    `# Dual Document QA & Proofing Review Report (${leftKind} ⇄ ${rightKind})`,
    ``,
    `## Dokument-Metadaten`,
    `- Referenz (Links, ${leftKind}): ${leftDoc}`,
    `- Vergleich (Rechts, ${rightKind}): ${rightDoc}`,
    `- Gesamtzahl erfasster Korrekturbereiche: ${annotations.value.length}`,
  ];

  if (diffResult.value) {
    lines.push(
      `- Erfasste Kollations-Abweichungen (Wort- & Zeichen-Diff): ${diffResult.value.stats.totalDiffs} (Modifikationen: ${diffResult.value.stats.modifications}, Ergänzungen: ${diffResult.value.stats.additions}, Streichungen: ${diffResult.value.stats.deletions})`,
    );
  }

  lines.push(``, `## Erfasste Abweichungen & Fehlerstellen`);

  if (annotations.value.length > 0) {
    annotations.value.forEach((a, idx) => {
      const slotLabel =
        a.slot === "left" ? "Links (Referenz)" : "Rechts (Vergleich)";
      const typeLabel = getAnnotationTypeLabel(a.type);
      lines.push(
        `${idx + 1}. **[Seite ${a.pageIndex + 1} | ${slotLabel}] ${typeLabel}**`,
        `   - Bounding-Box: x=${a.x}%, y=${a.y}%, breite=${a.width}%, höhe=${a.height}%`,
        `   - Befund / Notiz: ${a.note ? a.note : "(Keine Detailnotiz)"}`,
      );
    });
  } else if (diffResult.value) {
    lines.push(
      `1. **[Philologische Kollation] Wort- und Zeichenabweichungen**`,
      `   - Erfasste Modifikationen: ${diffResult.value.stats.modifications}`,
      `   - Ergänzungen: ${diffResult.value.stats.additions}`,
      `   - Streichungen: ${diffResult.value.stats.deletions}`,
    );
  }

  lines.push(
    ``,
    `## Korrektur-Anweisung für die KI`,
    `Bitte führe anhand dieser QA-Befunde eine gezielte Korrektur des Quelltexts (Markdown / Typst / Master-JSON) durch:`,
    `1. Behebe alle typografischen Fehler und OCR-Artefakte exakt an den angegebenen Positionen.`,
    `2. Achte auf die strikte Einhaltung aller wissenschaftlichen Transliterationsstandards (IAST-Makrons und Devanāgarī-Diakritika).`,
    `3. Bewahre die bestehende Text- und Vers-Gliederung unversehrt.`,
  );

  const fullPrompt = lines.join("\n");
  try {
    await navigator.clipboard.writeText(fullPrompt);
    const countMsg = annotations.value.length > 0
      ? `${annotations.value.length} Annotationen`
      : `${diffResult.value?.stats.totalDiffs || 0} Textabweichungen`;
    showToast(`AI Review Prompt mit ${countMsg} kopiert!`);
  } catch (err) {
    console.error("Clipboard write failed:", err);
    showToast("Fehler beim Kopieren in die Zwischenablage.");
  }
}

function exportAnnotationsJson() {
  const data = JSON.stringify(
    {
      version: "1.0",
      date: new Date().toISOString(),
      leftDocument: {
        name: leftPdfName.value,
        path: leftPdfPath.value,
        kind: leftDocKind.value,
      },
      rightDocument: {
        name: rightPdfName.value,
        path: rightPdfPath.value,
        kind: rightDocKind.value,
      },
      annotations: annotations.value,
    },
    null,
    2,
  );

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qa-annotations-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Annotationen als JSON exportiert.");
}

function handleKeydown(e: KeyboardEvent) {
  if (
    !containerRef.value ||
    containerRef.value.style.display === "none" ||
    (containerRef.value.offsetParent === null &&
      !window.navigator.userAgent.includes("jsdom") &&
      containerRef.value.isConnected)
  ) {
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

  if (e.key === "a" || e.key === "A") {
    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggleAnnotateMode();
      return;
    }
  } else if (e.key === "Escape") {
    if (pendingAnnotation.value) {
      cancelPendingAnnotation();
      return;
    }
    if (isAnnotateMode.value) {
      isAnnotateMode.value = false;
      return;
    }
    if (selectedAnnotationId.value) {
      selectedAnnotationId.value = null;
      return;
    }
  } else if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedAnnotationId.value) {
      deleteAnnotation(selectedAnnotationId.value);
      return;
    }
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
  if (toastTimer) clearTimeout(toastTimer);
  window.removeEventListener("mousemove", onSplitMouseMove);
  window.removeEventListener("mouseup", onSplitMouseUp);
  window.removeEventListener("mousemove", onDrawMouseMove);
  window.removeEventListener("mouseup", onDrawMouseUp);
  cleanupPages(leftPages.value);
  cleanupPages(rightPages.value);
  if (leftBrowserPdfUrl.value) URL.revokeObjectURL(leftBrowserPdfUrl.value);
  if (rightBrowserPdfUrl.value) URL.revokeObjectURL(rightBrowserPdfUrl.value);
});

defineExpose({
  loadPdf,
  loadMarkdown,
  loadDocumentFromExternal,
  loadPdfFromExternal,
  loadDocumentPair,
  loadPdfPair,
  unloadPdf,
  pickDocument,
  pickPdf,
  revealInFinder,
  leftPdfPath,
  rightPdfPath,
  leftDocKind,
  rightDocKind,
  leftMarkdownContent,
  rightMarkdownContent,
  leftMarkdownHtml,
  rightMarkdownHtml,
  leftViewType,
  rightViewType,
  annotations,
  isAnnotateMode,
  showProofingDrawer,
  copyAiReviewPrompt,
  isDiffActive,
  canShowDiff,
  diffResult,
  addAnnotation: (anno: PdfAnnotation) => annotations.value.push(anno),
  deleteAnnotation,
  clearAllAnnotations,
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
          VERGLEICH & QA
        </span>
        <span class="text-app-text-muted text-[11px] truncate hidden md:inline">
          Dual Document Viewer (PDF & Markdown lesend)
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

      <!-- Proofing & AI QA Toolbar Controls -->
      <div class="flex items-center gap-1.5">
        <!-- Philological Diff / Collation Toggle (when both sides have Markdown) -->
        <button
          v-if="canShowDiff"
          type="button"
          @click="isDiffActive = !isDiffActive"
          class="flex items-center gap-1.5 h-6 px-2 rounded transition-colors text-[11px] font-mono font-semibold cursor-pointer border shadow-2xs"
          :class="[
            isDiffActive
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-app-bg text-app-text-secondary hover:text-app-text hover:bg-app-bg-hover border-app-border'
          ]"
          title="Philologische Kollation (Wort- & Zeichen-Diff hervorheben)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 3h5v5"/>
            <path d="M8 21H3v-5"/>
            <path d="M21 3l-7.5 7.5"/>
            <path d="M3 21l7.5-7.5"/>
          </svg>
          <span>Diff</span>
          <span
            v-if="diffResult && diffResult.stats.totalDiffs > 0"
            class="px-1 py-0.2 rounded text-[10px] font-mono font-bold"
            :class="isDiffActive ? 'bg-black/20 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'"
          >
            {{ diffResult.stats.totalDiffs }}
          </span>
          <span
            v-else-if="diffResult && diffResult.stats.totalDiffs === 0"
            class="px-1 py-0.2 rounded text-[10px] font-mono font-bold"
            :class="isDiffActive ? 'bg-black/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'"
          >
            0
          </span>
        </button>

        <!-- Annotate Mode Toggle -->
        <button
          type="button"
          @click="toggleAnnotateMode"
          class="flex items-center gap-1 h-6 px-2 rounded transition-colors text-[11px] font-mono font-semibold cursor-pointer border shadow-2xs"
          :class="[
            isAnnotateMode
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-app-bg text-app-text-secondary hover:text-app-text hover:bg-app-bg-hover border-app-border'
          ]"
          :title="isAnnotateMode ? 'Annotation-Modus aktiv: Box auf PDF-Seite aufziehen (Taste A)' : 'Annotation-Modus aktivieren (Taste A)'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>{{ isAnnotateMode ? 'Annotieren: An' : 'Annotieren' }}</span>
        </button>

        <!-- Proofing Drawer Toggle -->
        <button
          type="button"
          @click="showProofingDrawer = !showProofingDrawer"
          class="flex items-center gap-1 h-6 px-2 rounded transition-colors text-[11px] font-mono cursor-pointer border shadow-2xs"
          :class="[
            showProofingDrawer
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold'
              : 'bg-app-bg text-app-text-secondary hover:text-app-text hover:bg-app-bg-hover border-app-border font-medium'
          ]"
          title="Proofing-Seitenleiste ein-/ausblenden"
        >
          <span>📋 {{ annotations.length }}</span>
          <span class="hidden lg:inline">Befunde</span>
        </button>

        <!-- Copy AI Review Prompt -->
        <button
          type="button"
          @click="copyAiReviewPrompt"
          class="flex items-center gap-1 h-6 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-mono font-semibold transition-colors cursor-pointer active:scale-95 shadow-2xs"
          title="Kopiert alle erfassten Bounding-Box-Korrekturen als strukturierter LLM-Review-Prompt in die Zwischenablage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span class="hidden sm:inline">Copy AI Prompt</span>
        </button>

        <div class="w-px h-3.5 bg-app-border mx-0.5"></div>

        <!-- Close / Back to Editor -->
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
        <!-- Left Header Bar with Paging Stepper / ViewType -->
        <div
          class="flex-none flex items-center justify-between px-3 py-1.5 bg-app-bg border-b border-app-border text-xs gap-2"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">
              [1] Reference
            </span>
            <template v-if="leftPdfName">
              <span
                class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0"
                :class="leftDocKind === 'markdown' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'"
              >
                {{ leftDocKind === 'markdown' ? 'MD' : 'PDF' }}
              </span>
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
            <!-- Left Markdown ViewType Toggle (Read-Only Rendered vs Raw) -->
            <div v-if="leftDocKind === 'markdown' && leftPdfPath" class="flex items-center bg-app-bg-secondary p-0.5 rounded border border-app-border text-[10px]">
              <button
                type="button"
                @click="leftViewType = 'rendered'"
                class="px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                :class="leftViewType === 'rendered' ? 'bg-app-bg text-app-text font-bold shadow-2xs' : 'text-app-text-muted hover:text-app-text'"
                title="Typografisch gerenderte Leseansicht"
              >
                Rendered
              </button>
              <button
                type="button"
                @click="leftViewType = 'raw'"
                class="px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                :class="leftViewType === 'raw' ? 'bg-app-bg text-app-text font-bold shadow-2xs' : 'text-app-text-muted hover:text-app-text'"
                title="Schreibgeschützter Quelltext"
              >
                Raw
              </button>
            </div>

            <!-- Left PDF Pager Controls -->
            <div v-else-if="leftDocKind === 'pdf' && leftPageCount > 0" class="flex items-center gap-1 font-mono text-xs">
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
              @click="pickDocument('left')"
              class="h-6 px-2 rounded bg-app-bg-secondary hover:bg-app-bg-hover border border-app-border text-[11px] font-medium transition-colors cursor-pointer text-app-text shadow-2xs active:scale-95"
            >
              {{ leftPdfPath ? 'Change...' : 'Load Document...' }}
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
            <div class="font-semibold text-sm text-app-text mb-1">Referenz-Dokument laden</div>
            <p class="text-xs max-w-[280px] mb-3">
              Wählen Sie ein Dokument (PDF oder Markdown) zum Vergleichen und Gegenlesen.
            </p>
            <button
              type="button"
              @click="pickDocument('left')"
              class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              Dokument auswählen...
            </button>
          </div>

          <!-- Loading Spinner -->
          <div v-else-if="leftLoading" class="p-8 text-center text-app-text-muted text-xs">
            <div class="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2 text-amber-500"></div>
            <div>Loading and rendering document...</div>
          </div>

          <!-- Error Alert -->
          <div v-else-if="leftError" class="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            Failed to load: {{ leftError }}
          </div>

          <!-- MARKDOWN VIEW (Read-Only) -->
          <template v-else-if="leftDocKind === 'markdown'">
            <div class="w-full flex justify-center py-4 px-2 select-text">
              <!-- Rendered Scholarly Preview -->
              <div
                v-if="leftViewType === 'rendered'"
                class="w-full max-w-[850px] bg-app-bg rounded-lg border border-app-border p-8 sm:p-12 shadow-sm font-serif leading-relaxed text-app-text prose dark:prose-invert max-w-none"
                @click="handleMarkdownClick"
                v-html="isDiffActive && diffResult ? diffResult.leftRenderedHtml : leftMarkdownHtml"
              ></div>

              <!-- Raw Read-Only Markdown Text -->
              <div v-else class="w-full max-w-[900px]">
                <pre
                  v-if="isDiffActive && diffResult"
                  class="w-full bg-app-bg rounded-lg border border-app-border p-6 shadow-sm overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono text-xs text-app-text select-text"
                  v-html="diffResult.leftRawHtml"
                ></pre>
                <pre
                  v-else
                  class="w-full bg-app-bg rounded-lg border border-app-border p-6 shadow-sm overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono text-xs text-app-text select-text"
                >{{ leftMarkdownContent }}</pre>
              </div>
            </div>
          </template>

          <!-- BROWSER MODE EMBED (When running in browser without Tauri IPC) -->
          <template v-if="!isTauri && leftBrowserPdfUrl">
            <div
              class="pdf-page-card w-full h-full min-h-[500px] flex flex-col relative rounded overflow-hidden shadow-lg border border-slate-300 dark:border-slate-700 bg-white"
              :class="{ 'cursor-crosshair': isAnnotateMode }"
              @mousedown="onPageMouseDown('left', leftCurrentPage - 1, $event)"
            >
              <iframe
                :src="leftBrowserPdfUrl"
                class="w-full h-full min-h-[500px] flex-1 border-none"
                :class="{ 'pointer-events-none': isAnnotateMode || activeDrawingTarget !== null }"
                title="Left PDF Reference"
              ></iframe>

              <!-- Transparent Interaction Layer when Annotating -->
              <div
                v-if="isAnnotateMode || activeDrawingTarget"
                class="absolute inset-0 z-10 cursor-crosshair"
              ></div>

              <!-- Annotations Overlay -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                <div
                  v-for="anno in getAnnotationsForPage('left', leftCurrentPage - 1)"
                  :key="anno.id"
                  class="annotation-box absolute border-2 rounded transition-all cursor-pointer pointer-events-auto group"
                  :class="[
                    selectedAnnotationId === anno.id
                      ? 'border-amber-600 bg-amber-500/30 ring-2 ring-amber-400/50 shadow-md z-30'
                      : 'border-amber-500/90 bg-amber-500/15 hover:bg-amber-500/30 z-20'
                  ]"
                  :style="{
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    width: `${anno.width}%`,
                    height: `${anno.height}%`,
                  }"
                  @click.stop="selectAnnotation(anno)"
                  :title="`${getAnnotationTypeLabel(anno.type)}: ${anno.note || '(Keine Notiz)'}`"
                >
                  <div class="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white flex items-center gap-1 shadow-xs whitespace-nowrap select-none">
                    <span>{{ getAnnotationTypeLabel(anno.type).split(' ')[0] }}</span>
                    <span v-if="anno.note" class="font-normal opacity-90 truncate max-w-[120px]">{{ anno.note }}</span>
                  </div>
                  <button
                    type="button"
                    @click.stop="deleteAnnotation(anno.id)"
                    class="opacity-0 group-hover:opacity-100 absolute -top-5 right-0 w-4 h-4 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-[10px] leading-none transition-opacity shadow-xs"
                    title="Annotation löschen"
                  >
                    ×
                  </button>
                </div>

                <!-- Active In-Progress Box -->
                <div
                  v-if="activeDrawingTarget && activeDrawingTarget.slot === 'left' && activeDrawingTarget.pageIndex === (leftCurrentPage - 1) && drawCurrent"
                  class="absolute border-2 border-dashed border-amber-600 bg-amber-500/25 pointer-events-none z-30 shadow-sm"
                  :style="{
                    left: `${drawCurrent.x}%`,
                    top: `${drawCurrent.y}%`,
                    width: `${drawCurrent.width}%`,
                    height: `${drawCurrent.height}%`,
                  }"
                />
              </div>
            </div>
          </template>

          <!-- SINGLE PAGE MODE -->
          <template v-else-if="pageLayoutMode === 'single'">
            <div
              v-if="activeLeftPage"
              class="pdf-page-card bg-white text-black shadow-xl mx-auto rounded overflow-hidden border border-slate-300 dark:border-slate-700 relative"
              :class="{ 'cursor-crosshair': isAnnotateMode }"
              :style="pageWidthStyle"
              @mousedown="onPageMouseDown('left', leftCurrentPage - 1, $event)"
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

              <!-- Annotations Overlay -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                <div
                  v-for="anno in getAnnotationsForPage('left', leftCurrentPage - 1)"
                  :key="anno.id"
                  class="annotation-box absolute border-2 rounded transition-all cursor-pointer pointer-events-auto group"
                  :class="[
                    selectedAnnotationId === anno.id
                      ? 'border-amber-600 bg-amber-500/30 ring-2 ring-amber-400/50 shadow-md z-30'
                      : 'border-amber-500/90 bg-amber-500/15 hover:bg-amber-500/30 z-20'
                  ]"
                  :style="{
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    width: `${anno.width}%`,
                    height: `${anno.height}%`,
                  }"
                  @click.stop="selectAnnotation(anno)"
                  :title="`${getAnnotationTypeLabel(anno.type)}: ${anno.note || '(Keine Notiz)'}`"
                >
                  <div class="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white flex items-center gap-1 shadow-xs whitespace-nowrap select-none">
                    <span>{{ getAnnotationTypeLabel(anno.type).split(' ')[0] }}</span>
                    <span v-if="anno.note" class="font-normal opacity-90 truncate max-w-[120px]">{{ anno.note }}</span>
                  </div>
                  <button
                    type="button"
                    @click.stop="deleteAnnotation(anno.id)"
                    class="opacity-0 group-hover:opacity-100 absolute -top-5 right-0 w-4 h-4 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-[10px] leading-none transition-opacity shadow-xs"
                    title="Annotation löschen"
                  >
                    ×
                  </button>
                </div>

                <div
                  v-if="activeDrawingTarget && activeDrawingTarget.slot === 'left' && activeDrawingTarget.pageIndex === (leftCurrentPage - 1) && drawCurrent"
                  class="absolute border-2 border-dashed border-amber-600 bg-amber-500/25 pointer-events-none z-30 shadow-sm"
                  :style="{
                    left: `${drawCurrent.x}%`,
                    top: `${drawCurrent.y}%`,
                    width: `${drawCurrent.width}%`,
                    height: `${drawCurrent.height}%`,
                  }"
                />
              </div>
            </div>
          </template>

          <!-- CONTINUOUS SCROLL MODE -->
          <template v-else>
            <div
              v-for="page in leftPages"
              :key="`left-page-${page.index}`"
              class="pdf-page-card bg-white text-black shadow-lg mx-auto rounded overflow-hidden transition-all duration-150 border border-slate-300 dark:border-slate-700 relative"
              :class="{ 'cursor-crosshair': isAnnotateMode }"
              :style="pageWidthStyle"
              @mousedown="onPageMouseDown('left', page.index, $event)"
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

              <!-- Annotations Overlay -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                <div
                  v-for="anno in getAnnotationsForPage('left', page.index)"
                  :key="anno.id"
                  class="annotation-box absolute border-2 rounded transition-all cursor-pointer pointer-events-auto group"
                  :class="[
                    selectedAnnotationId === anno.id
                      ? 'border-amber-600 bg-amber-500/30 ring-2 ring-amber-400/50 shadow-md z-30'
                      : 'border-amber-500/90 bg-amber-500/15 hover:bg-amber-500/30 z-20'
                  ]"
                  :style="{
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    width: `${anno.width}%`,
                    height: `${anno.height}%`,
                  }"
                  @click.stop="selectAnnotation(anno)"
                  :title="`${getAnnotationTypeLabel(anno.type)}: ${anno.note || '(Keine Notiz)'}`"
                >
                  <div class="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white flex items-center gap-1 shadow-xs whitespace-nowrap select-none">
                    <span>{{ getAnnotationTypeLabel(anno.type).split(' ')[0] }}</span>
                    <span v-if="anno.note" class="font-normal opacity-90 truncate max-w-[120px]">{{ anno.note }}</span>
                  </div>
                  <button
                    type="button"
                    @click.stop="deleteAnnotation(anno.id)"
                    class="opacity-0 group-hover:opacity-100 absolute -top-5 right-0 w-4 h-4 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-[10px] leading-none transition-opacity shadow-xs"
                    title="Annotation löschen"
                  >
                    ×
                  </button>
                </div>

                <div
                  v-if="activeDrawingTarget && activeDrawingTarget.slot === 'left' && activeDrawingTarget.pageIndex === page.index && drawCurrent"
                  class="absolute border-2 border-dashed border-amber-600 bg-amber-500/25 pointer-events-none z-30 shadow-sm"
                  :style="{
                    left: `${drawCurrent.x}%`,
                    top: `${drawCurrent.y}%`,
                    width: `${drawCurrent.width}%`,
                    height: `${drawCurrent.height}%`,
                  }"
                />
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
        <!-- Right Header Bar with Paging Stepper / ViewType -->
        <div
          class="flex-none flex items-center justify-between px-3 py-1.5 bg-app-bg border-b border-app-border text-xs gap-2"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">
              [2] Comparison
            </span>
            <template v-if="rightPdfName">
              <span
                class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0"
                :class="rightDocKind === 'markdown' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'"
              >
                {{ rightDocKind === 'markdown' ? 'MD' : 'PDF' }}
              </span>
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
            <!-- Right Markdown ViewType Toggle (Read-Only Rendered vs Raw) -->
            <div v-if="rightDocKind === 'markdown' && rightPdfPath" class="flex items-center bg-app-bg-secondary p-0.5 rounded border border-app-border text-[10px]">
              <button
                type="button"
                @click="rightViewType = 'rendered'"
                class="px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                :class="rightViewType === 'rendered' ? 'bg-app-bg text-app-text font-bold shadow-2xs' : 'text-app-text-muted hover:text-app-text'"
                title="Typografisch gerenderte Leseansicht"
              >
                Rendered
              </button>
              <button
                type="button"
                @click="rightViewType = 'raw'"
                class="px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                :class="rightViewType === 'raw' ? 'bg-app-bg text-app-text font-bold shadow-2xs' : 'text-app-text-muted hover:text-app-text'"
                title="Schreibgeschützter Quelltext"
              >
                Raw
              </button>
            </div>

            <!-- Right PDF Pager Controls -->
            <div v-else-if="rightDocKind === 'pdf' && rightPageCount > 0" class="flex items-center gap-1 font-mono text-xs">
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
              @click="pickDocument('right')"
              class="h-6 px-2 rounded bg-app-bg-secondary hover:bg-app-bg-hover border border-app-border text-[11px] font-medium transition-colors cursor-pointer text-app-text shadow-2xs active:scale-95"
            >
              {{ rightPdfPath ? 'Change...' : 'Load Document...' }}
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
            <div class="font-semibold text-sm text-app-text mb-1">Vergleichs-Dokument laden</div>
            <p class="text-xs max-w-[280px] mb-3">
              Wählen Sie das zweite Dokument (PDF oder Markdown) zum Vergleichen und Gegenlesen.
            </p>
            <button
              type="button"
              @click="pickDocument('right')"
              class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              Dokument auswählen...
            </button>
          </div>

          <!-- Loading Spinner -->
          <div v-else-if="rightLoading" class="p-8 text-center text-app-text-muted text-xs">
            <div class="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2 text-amber-500"></div>
            <div>Loading and rendering document...</div>
          </div>

          <!-- Error Alert -->
          <div v-else-if="rightError" class="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            Failed to load: {{ rightError }}
          </div>

          <!-- MARKDOWN VIEW (Read-Only) -->
          <template v-else-if="rightDocKind === 'markdown'">
            <div class="w-full flex justify-center py-4 px-2 select-text">
              <!-- Rendered Scholarly Preview -->
              <div
                v-if="rightViewType === 'rendered'"
                class="w-full max-w-[850px] bg-app-bg rounded-lg border border-app-border p-8 sm:p-12 shadow-sm font-serif leading-relaxed text-app-text prose dark:prose-invert max-w-none"
                @click="handleMarkdownClick"
                v-html="isDiffActive && diffResult ? diffResult.rightRenderedHtml : rightMarkdownHtml"
              ></div>

              <!-- Raw Read-Only Markdown Text -->
              <div v-else class="w-full max-w-[900px]">
                <pre
                  v-if="isDiffActive && diffResult"
                  class="w-full bg-app-bg rounded-lg border border-app-border p-6 shadow-sm overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono text-xs text-app-text select-text"
                  v-html="diffResult.rightRawHtml"
                ></pre>
                <pre
                  v-else
                  class="w-full bg-app-bg rounded-lg border border-app-border p-6 shadow-sm overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono text-xs text-app-text select-text"
                >{{ rightMarkdownContent }}</pre>
              </div>
            </div>
          </template>

          <!-- BROWSER MODE EMBED (When running in browser without Tauri IPC) -->
          <template v-if="!isTauri && rightBrowserPdfUrl">
            <div
              class="pdf-page-card w-full h-full min-h-[500px] flex flex-col relative rounded overflow-hidden shadow-lg border border-slate-300 dark:border-slate-700 bg-white"
              :class="{ 'cursor-crosshair': isAnnotateMode }"
              @mousedown="onPageMouseDown('right', rightCurrentPage - 1, $event)"
            >
              <iframe
                :src="rightBrowserPdfUrl"
                class="w-full h-full min-h-[500px] flex-1 border-none"
                :class="{ 'pointer-events-none': isAnnotateMode || activeDrawingTarget !== null }"
                title="Right PDF Comparison"
              ></iframe>

              <!-- Transparent Interaction Layer when Annotating -->
              <div
                v-if="isAnnotateMode || activeDrawingTarget"
                class="absolute inset-0 z-10 cursor-crosshair"
              ></div>

              <!-- Annotations Overlay -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                <div
                  v-for="anno in getAnnotationsForPage('right', rightCurrentPage - 1)"
                  :key="anno.id"
                  class="annotation-box absolute border-2 rounded transition-all cursor-pointer pointer-events-auto group"
                  :class="[
                    selectedAnnotationId === anno.id
                      ? 'border-amber-600 bg-amber-500/30 ring-2 ring-amber-400/50 shadow-md z-30'
                      : 'border-amber-500/90 bg-amber-500/15 hover:bg-amber-500/30 z-20'
                  ]"
                  :style="{
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    width: `${anno.width}%`,
                    height: `${anno.height}%`,
                  }"
                  @click.stop="selectAnnotation(anno)"
                  :title="`${getAnnotationTypeLabel(anno.type)}: ${anno.note || '(Keine Notiz)'}`"
                >
                  <div class="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white flex items-center gap-1 shadow-xs whitespace-nowrap select-none">
                    <span>{{ getAnnotationTypeLabel(anno.type).split(' ')[0] }}</span>
                    <span v-if="anno.note" class="font-normal opacity-90 truncate max-w-[120px]">{{ anno.note }}</span>
                  </div>
                  <button
                    type="button"
                    @click.stop="deleteAnnotation(anno.id)"
                    class="opacity-0 group-hover:opacity-100 absolute -top-5 right-0 w-4 h-4 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-[10px] leading-none transition-opacity shadow-xs"
                    title="Annotation löschen"
                  >
                    ×
                  </button>
                </div>

                <!-- Active In-Progress Box -->
                <div
                  v-if="activeDrawingTarget && activeDrawingTarget.slot === 'right' && activeDrawingTarget.pageIndex === (rightCurrentPage - 1) && drawCurrent"
                  class="absolute border-2 border-dashed border-amber-600 bg-amber-500/25 pointer-events-none z-30 shadow-sm"
                  :style="{
                    left: `${drawCurrent.x}%`,
                    top: `${drawCurrent.y}%`,
                    width: `${drawCurrent.width}%`,
                    height: `${drawCurrent.height}%`,
                  }"
                />
              </div>
            </div>
          </template>

          <!-- SINGLE PAGE MODE -->
          <template v-else-if="pageLayoutMode === 'single'">
            <div
              v-if="activeRightPage"
              class="pdf-page-card bg-white text-black shadow-xl mx-auto rounded overflow-hidden border border-slate-300 dark:border-slate-700 relative"
              :class="{ 'cursor-crosshair': isAnnotateMode }"
              :style="pageWidthStyle"
              @mousedown="onPageMouseDown('right', rightCurrentPage - 1, $event)"
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

              <!-- Annotations Overlay -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                <div
                  v-for="anno in getAnnotationsForPage('right', rightCurrentPage - 1)"
                  :key="anno.id"
                  class="annotation-box absolute border-2 rounded transition-all cursor-pointer pointer-events-auto group"
                  :class="[
                    selectedAnnotationId === anno.id
                      ? 'border-amber-600 bg-amber-500/30 ring-2 ring-amber-400/50 shadow-md z-30'
                      : 'border-amber-500/90 bg-amber-500/15 hover:bg-amber-500/30 z-20'
                  ]"
                  :style="{
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    width: `${anno.width}%`,
                    height: `${anno.height}%`,
                  }"
                  @click.stop="selectAnnotation(anno)"
                  :title="`${getAnnotationTypeLabel(anno.type)}: ${anno.note || '(Keine Notiz)'}`"
                >
                  <div class="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white flex items-center gap-1 shadow-xs whitespace-nowrap select-none">
                    <span>{{ getAnnotationTypeLabel(anno.type).split(' ')[0] }}</span>
                    <span v-if="anno.note" class="font-normal opacity-90 truncate max-w-[120px]">{{ anno.note }}</span>
                  </div>
                  <button
                    type="button"
                    @click.stop="deleteAnnotation(anno.id)"
                    class="opacity-0 group-hover:opacity-100 absolute -top-5 right-0 w-4 h-4 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-[10px] leading-none transition-opacity shadow-xs"
                    title="Annotation löschen"
                  >
                    ×
                  </button>
                </div>

                <div
                  v-if="activeDrawingTarget && activeDrawingTarget.slot === 'right' && activeDrawingTarget.pageIndex === (rightCurrentPage - 1) && drawCurrent"
                  class="absolute border-2 border-dashed border-amber-600 bg-amber-500/25 pointer-events-none z-30 shadow-sm"
                  :style="{
                    left: `${drawCurrent.x}%`,
                    top: `${drawCurrent.y}%`,
                    width: `${drawCurrent.width}%`,
                    height: `${drawCurrent.height}%`,
                  }"
                />
              </div>
            </div>
          </template>

          <!-- CONTINUOUS SCROLL MODE -->
          <template v-else>
            <div
              v-for="page in rightPages"
              :key="`right-page-${page.index}`"
              class="pdf-page-card bg-white text-black shadow-lg mx-auto rounded overflow-hidden transition-all duration-150 border border-slate-300 dark:border-slate-700 relative"
              :class="{ 'cursor-crosshair': isAnnotateMode }"
              :style="pageWidthStyle"
              @mousedown="onPageMouseDown('right', page.index, $event)"
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

              <!-- Annotations Overlay -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                <div
                  v-for="anno in getAnnotationsForPage('right', page.index)"
                  :key="anno.id"
                  class="annotation-box absolute border-2 rounded transition-all cursor-pointer pointer-events-auto group"
                  :class="[
                    selectedAnnotationId === anno.id
                      ? 'border-amber-600 bg-amber-500/30 ring-2 ring-amber-400/50 shadow-md z-30'
                      : 'border-amber-500/90 bg-amber-500/15 hover:bg-amber-500/30 z-20'
                  ]"
                  :style="{
                    left: `${anno.x}%`,
                    top: `${anno.y}%`,
                    width: `${anno.width}%`,
                    height: `${anno.height}%`,
                  }"
                  @click.stop="selectAnnotation(anno)"
                  :title="`${getAnnotationTypeLabel(anno.type)}: ${anno.note || '(Keine Notiz)'}`"
                >
                  <div class="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white flex items-center gap-1 shadow-xs whitespace-nowrap select-none">
                    <span>{{ getAnnotationTypeLabel(anno.type).split(' ')[0] }}</span>
                    <span v-if="anno.note" class="font-normal opacity-90 truncate max-w-[120px]">{{ anno.note }}</span>
                  </div>
                  <button
                    type="button"
                    @click.stop="deleteAnnotation(anno.id)"
                    class="opacity-0 group-hover:opacity-100 absolute -top-5 right-0 w-4 h-4 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-[10px] leading-none transition-opacity shadow-xs"
                    title="Annotation löschen"
                  >
                    ×
                  </button>
                </div>

                <div
                  v-if="activeDrawingTarget && activeDrawingTarget.slot === 'right' && activeDrawingTarget.pageIndex === page.index && drawCurrent"
                  class="absolute border-2 border-dashed border-amber-600 bg-amber-500/25 pointer-events-none z-30 shadow-sm"
                  :style="{
                    left: `${drawCurrent.x}%`,
                    top: `${drawCurrent.y}%`,
                    width: `${drawCurrent.width}%`,
                    height: `${drawCurrent.height}%`,
                  }"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- PROOFING & ANNOTATIONS DRAWER -->
      <aside
        v-if="showProofingDrawer"
        class="w-80 flex-none border-l border-app-border bg-app-bg flex flex-col h-full shadow-xl z-20 transition-all select-text"
      >
        <!-- Drawer Header -->
        <div class="flex-none flex items-center justify-between px-3 py-2 border-b border-app-border bg-app-bg-secondary text-xs">
          <div class="flex items-center gap-1.5 font-bold text-app-text">
            <span>📋 Proofing & QA</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {{ annotations.length }}
            </span>
          </div>
          <button
            type="button"
            @click="showProofingDrawer = false"
            class="w-5 h-5 flex items-center justify-center rounded hover:bg-app-bg-hover text-app-text-muted hover:text-app-text text-sm transition-colors cursor-pointer"
            title="Schließen"
          >
            ×
          </button>
        </div>

        <!-- Drawer Quick Actions -->
        <div class="flex-none p-2 border-b border-app-border bg-app-bg flex flex-col gap-1.5">
          <button
            type="button"
            @click="copyAiReviewPrompt"
            class="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer active:scale-98"
            title="Kopiere strukturierten AI-Prompt für automatische Korrektur"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy AI Review Prompt</span>
          </button>

          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="exportAnnotationsJson"
              class="flex-1 py-1 px-2 rounded bg-app-bg-secondary hover:bg-app-bg-hover border border-app-border text-[11px] font-medium text-app-text transition-colors cursor-pointer"
              title="Als JSON sichern"
            >
              Export JSON
            </button>
            <button
              type="button"
              @click="clearAllAnnotations"
              :disabled="annotations.length === 0"
              class="py-1 px-2 rounded bg-app-bg-secondary hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 border border-app-border disabled:opacity-30 disabled:pointer-events-none text-[11px] font-medium text-app-text-muted transition-colors cursor-pointer"
              title="Alle Annotationen löschen"
            >
              Leeren
            </button>
          </div>

          <!-- Slot Filter Pills -->
          <div class="flex items-center gap-1 pt-1 text-[11px]">
            <button
              type="button"
              @click="drawerSlotFilter = 'all'"
              class="flex-1 py-0.5 rounded text-center font-mono cursor-pointer transition-colors"
              :class="[
                drawerSlotFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                  : 'text-app-text-muted hover:text-app-text hover:bg-app-bg-hover'
              ]"
            >
              Alle ({{ annotations.length }})
            </button>
            <button
              type="button"
              @click="drawerSlotFilter = 'left'"
              class="flex-1 py-0.5 rounded text-center font-mono cursor-pointer transition-colors"
              :class="[
                drawerSlotFilter === 'left'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                  : 'text-app-text-muted hover:text-app-text hover:bg-app-bg-hover'
              ]"
            >
              Ref ({{ annotations.filter(a => a.slot === 'left').length }})
            </button>
            <button
              type="button"
              @click="drawerSlotFilter = 'right'"
              class="flex-1 py-0.5 rounded text-center font-mono cursor-pointer transition-colors"
              :class="[
                drawerSlotFilter === 'right'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                  : 'text-app-text-muted hover:text-app-text hover:bg-app-bg-hover'
              ]"
            >
              Neusatz ({{ annotations.filter(a => a.slot === 'right').length }})
            </button>
          </div>
        </div>

        <!-- Annotations List -->
        <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
          <div
            v-if="filteredDrawerAnnotations.length === 0"
            class="p-4 text-center text-app-text-muted text-xs flex flex-col items-center gap-1.5"
          >
            <span class="text-xl">✏️</span>
            <span class="font-medium">Keine Annotationen</span>
            <p class="text-[11px] leading-relaxed opacity-80">
              Aktiviere 'Annotieren' in der Toolbar und ziehe ein Rechteck über typografische Abweichungen.
            </p>
          </div>

          <div
            v-for="anno in filteredDrawerAnnotations"
            :key="anno.id"
            @click="jumpToAnnotation(anno)"
            class="p-2.5 rounded-md border text-xs cursor-pointer transition-all flex flex-col gap-1.5"
            :class="[
              selectedAnnotationId === anno.id
                ? 'bg-amber-500/10 border-amber-500 shadow-xs ring-1 ring-amber-500/40'
                : 'bg-app-bg-secondary hover:bg-app-bg border-app-border'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-black/10 dark:bg-white/10 text-app-text">
                  S. {{ anno.pageIndex + 1 }}
                </span>
                <span class="text-[10px] font-mono uppercase font-semibold text-amber-600 dark:text-amber-400">
                  {{ anno.slot === 'left' ? '[Ref]' : '[Neusatz]' }}
                </span>
              </div>
              <button
                type="button"
                @click.stop="deleteAnnotation(anno.id)"
                class="w-4 h-4 flex items-center justify-center rounded text-app-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Löschen"
              >
                ×
              </button>
            </div>

            <div class="flex items-center gap-1">
              <span class="font-semibold text-[11px] text-app-text">
                {{ getAnnotationTypeLabel(anno.type) }}
              </span>
            </div>

            <p v-if="anno.note" class="text-[11px] text-app-text-secondary leading-snug break-words">
              {{ anno.note }}
            </p>
            <span v-else class="text-[10px] text-app-text-muted italic">
              Keine Detailnotiz
            </span>

            <div class="text-[9px] font-mono text-app-text-muted opacity-60">
              Box: {{ anno.x.toFixed(0) }}%, {{ anno.y.toFixed(0) }}% ({{ anno.width.toFixed(0) }}% × {{ anno.height.toFixed(0) }}%)
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Creation Popover for New Annotation -->
    <div
      v-if="pendingAnnotation"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs"
      @click.self="cancelPendingAnnotation"
    >
      <div
        class="bg-app-bg border border-app-border rounded-lg shadow-2xl p-4 w-[360px] max-w-[90vw] flex flex-col gap-3 text-xs animate-in fade-in zoom-in-95 duration-150"
      >
        <div class="flex items-center justify-between pb-2 border-b border-app-border">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span class="font-bold text-sm text-app-text">Neue Annotation erfassen</span>
          </div>
          <button
            type="button"
            @click="cancelPendingAnnotation"
            class="text-app-text-muted hover:text-app-text text-base leading-none p-1 rounded hover:bg-app-bg-hover cursor-pointer"
          >
            ×
          </button>
        </div>

        <div class="text-[11px] text-app-text-secondary flex items-center justify-between font-mono bg-app-bg-secondary p-2 rounded border border-app-border">
          <span>{{ pendingAnnotation.slot === 'left' ? '[Links] Referenz' : '[Rechts] Neusatz' }}</span>
          <span>Seite {{ pendingAnnotation.pageIndex + 1 }}</span>
          <span>Box: {{ pendingAnnotation.width.toFixed(0) }}% × {{ pendingAnnotation.height.toFixed(0) }}%</span>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-app-text text-[11px]">Fehlertyp / Kategorie:</label>
          <select
            v-model="newAnnotationType"
            class="bg-app-bg-secondary border border-app-border rounded px-2.5 py-1.5 text-xs text-app-text focus:outline-none focus:border-amber-500"
          >
            <option value="typo">Typo (Druck- / Setzfehler)</option>
            <option value="diacritic">Diakritikum (Makron, Akzent, Devanāgarī)</option>
            <option value="layout">Layout / Zeilenumbruch / Spationierung</option>
            <option value="ocr">OCR-Artefakt / Zeichenerkennung</option>
            <option value="omission">Auslassung (Fehlender Text)</option>
            <option value="general">Allgemeine Bemerkung</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-app-text text-[11px]">Korrektur-Notiz / Befund:</label>
          <textarea
            ref="noteInputRef"
            v-model="newAnnotationNote"
            rows="3"
            placeholder="z.B. ā fehlt in mahābhārata, Zeilenabstand nach Śloka zu groß..."
            @keydown.enter.prevent="savePendingAnnotation"
            @keydown.esc="cancelPendingAnnotation"
            class="bg-app-bg-secondary border border-app-border rounded p-2 text-xs text-app-text focus:outline-none focus:border-amber-500 resize-none font-sans"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
          <button
            type="button"
            @click="cancelPendingAnnotation"
            class="px-3 py-1.5 rounded hover:bg-app-bg-hover text-app-text-secondary hover:text-app-text border border-transparent font-medium cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            @click="savePendingAnnotation"
            class="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            Annotation speichern
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-medium text-xs shadow-2xl flex items-center gap-2 border border-slate-700/50 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
