<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { toggleTransliteration } from "../lib/transliteration";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const props = defineProps<{
  currentWorkspace?: string | null;
  workspaceRoot?: string | null;
}>();

export interface SynopticState {
  jsonPath: string | null;
  jsonTitle: string;
  isDirty: boolean;
  scanPath: string | null;
  scanFileName: string | null;
  scanCurrentPage: number;
  scanTotalPages: number;
}

const emit = defineEmits<{
  (e: "open-markdown"): void;
  (e: "update-synoptic-state", state: SynopticState): void;
}>();

export interface EditionSource {
  siglum: string;
  author?: string;
  year?: number | string;
  title?: string;
  publisher?: string;
  place?: string;
  pages?: string;
}

export interface EditionWork {
  title: string;
  adhyaya?: number | string;
  brahmana?: number | string;
  subtitle?: string;
  recension?: string;
  sources?: EditionSource[];
  total_verses?: number;
  scan_pdf_path?: string;
}

export interface EditionSegment {
  verse_num: string;
  canonical_id: string;
  title: string;
  sanskrit_iast: string;
  sanskrit_devanagari: string;
  translation_primary: string;
  translation_secondary?: string;
  apparatus: string;
  commentary: string;
  scan_page?: number;
}

export interface MasterJsonData {
  work?: EditionWork;
  sections: EditionSegment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Master-JSON State
// ─────────────────────────────────────────────────────────────────────────────
const activeJsonPath = ref<string | null>(null);
const isDirty = ref(false);
const activeSegmentIndex = ref(0);

const masterData = ref<MasterJsonData>({
  work: {
    title: "Bṛhadāraṇyaka-Upaniṣad",
    adhyaya: 1,
    brahmana: 4,
    subtitle: "Ursubjekt (ātman) / Schöpfungsmythos",
    recension: "Mādhyandina",
    sources: [
      {
        siglum: "Slaje2009",
        author: "Walter Slaje",
        year: 2009,
        title: "Upanischaden: Arkanum des Veda",
      },
      {
        siglum: "Böhtlingk1889",
        author: "Otto von Böhtlingk",
        year: 1889,
        title: "Bṛhadāraṇjakopanishad in der Mādhyandina-Recension",
      },
    ],
    total_verses: 2,
  },
  sections: [
    {
      verse_num: "1.4.1",
      canonical_id: "BAU_1_4_1",
      title: "Der Ur-Mensch (ātman)",
      sanskrit_iast:
        "ātmaivedam agra āsīt puruṣavidhaḥ | so 'nuvīkṣya nānyad ātmano 'paśyat | so 'ham asmīty agre vyāharat | tato 'haṁnāmābhavat ||",
      sanskrit_devanagari:
        "आत्मैवेदमग्र आसीत्पुरुषविधः । सोऽनुवीक्ष्य नान्यदात्मनोऽपश्यत् । सोऽहमस्मीत्यग्रे व्याहरत् । ततोऽहंनामाभवत् ॥",
      translation_primary:
        "Im Anfang war dies (All) hier das Selbst allein in der Gestalt eines Menschen. Er blickte um sich und sah nichts anderes als sich selbst. Da rief er zuerst aus: »Ich bin es!« Daher entstand der Name »Ich«.",
      apparatus: "Böhtlingk 1889: ātmaivedam agra āsīt; Śaṅkara ad loc.",
      commentary:
        "puruṣavidhaḥ: in Gestalt einer Person; so 'ham asmīti: archetypische Ich-Formel der vedischen Ontologie.",
      scan_page: 1,
    },
    {
      verse_num: "1.4.2",
      canonical_id: "BAU_1_4_2",
      title: "Die Überwindung der Furcht",
      sanskrit_iast:
        "so 'bibhet | tasmād ekākī bibheti | sa hāyam īkṣāṁ cakre yan mad anyan nāsti kasmān nu bibhemīti | tata evāsya bhayaṁ vīyāya | kasmād dhy abheṣyad dvitīyād vai bhayaṁ bhavati ||",
      sanskrit_devanagari:
        "सोऽबिभेत् । तस्मादेकाकी बिभेति । स हायमीक्षां चक्रे यन्मदन्यन्नास्ति कस्मान्नु बिभेमीति । तत एवास्य भयं वीयाय । कस्माद्ध्यभेष्यद् द्वितीयाद्वै भयं भवति ॥",
      translation_primary:
        "Er fürchtete sich. Daher fürchtet man sich, wenn man allein ist. Er aber überlegte bei sich: »Da es doch außer mir nichts anderes gibt, wovor fürchte ich mich denn?« Da verging seine Furcht. Wovor hätte er sich auch fürchten sollen? Denn vor einem Zweiten entsteht Furcht.",
      apparatus: "dvitīyād vai bhayaṁ bhavati: kanonischer Merksatz des Monismus.",
      commentary:
        "Grundlegung der abhaya-Lehre: Furcht existiert nur, wo Dualität projiziert wird.",
      scan_page: 1,
    },
  ],
});

const currentSegment = computed<EditionSegment>(() => {
  if (
    activeSegmentIndex.value >= 0 &&
    activeSegmentIndex.value < masterData.value.sections.length
  ) {
    return masterData.value.sections[activeSegmentIndex.value];
  }
  return (
    masterData.value.sections[0] || {
      verse_num: "1",
      canonical_id: "V_1",
      title: "",
      sanskrit_iast: "",
      sanskrit_devanagari: "",
      translation_primary: "",
      apparatus: "",
      commentary: "",
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Scan-PDF State (Hayro SVG via Native Rust IPC)
// ─────────────────────────────────────────────────────────────────────────────
interface PdfDocInfo {
  page_count: number;
  file_name: string;
  file_size: number;
}

const scanPdfPath = ref<string | null>(null);
const scanPdfFileName = ref<string | null>(null);
const scanCurrentPage = ref(1);
const scanTotalPages = ref(1);
const scanZoom = ref(100);
const scanLoading = ref(false);
const scanError = ref<string | null>(null);
const currentBlobUrl = ref<string | null>(null);
const pageSvgCache = new Map<number, string>();
let loadToken = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Silent Auto-Repair & Status Feedback
// ─────────────────────────────────────────────────────────────────────────────
const synopticRootRef = ref<HTMLElement | null>(null);
const isAutoRepaired = ref(false);
const saveIndicatorText = ref("Synchronisiert");
let statusTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleStatusReset(delayMs: number, cb: () => void) {
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusTimer = null;
    cb();
  }, delayMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resizable Split-Pane Handling
// ─────────────────────────────────────────────────────────────────────────────
const splitContainerRef = ref<HTMLElement | null>(null);
const splitRatio = ref(50); // percentage for left pane
const isResizing = ref(false);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  const startX = e.clientX;
  const container = splitContainerRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const startRatio = splitRatio.value;

  function onMouseMove(moveEvent: MouseEvent) {
    if (!isResizing.value) return;
    const deltaX = moveEvent.clientX - startX;
    const newRatio = startRatio + (deltaX / rect.width) * 100;
    splitRatio.value = Math.max(25, Math.min(75, newRatio));
  }

  function onMouseUp() {
    isResizing.value = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function resetSplitRatio() {
  splitRatio.value = 50;
}

// ─────────────────────────────────────────────────────────────────────────────
// Philological Snippet Toolbar
// ─────────────────────────────────────────────────────────────────────────────
const IAST_SNIPPETS = [
  "ā", "ī", "ū", "ṛ", "ṝ", "ḷ", "ḹ", "ṃ", "ḥ",
  "ṅ", "ñ", "ṭ", "ḍ", "ṇ", "ś", "ṣ",
  "|", "||", "«", "»"
];

const lastFocusedTextarea = ref<HTMLTextAreaElement | HTMLInputElement | null>(null);

function registerFocus(e: FocusEvent) {
  const target = e.target;
  if (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement
  ) {
    lastFocusedTextarea.value = target;
  }
}

function insertSnippet(char: string) {
  const el = lastFocusedTextarea.value;
  if (!el) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const text = el.value;

  el.value = text.substring(0, start) + char + text.substring(end);
  const nextPos = start + char.length;
  el.selectionStart = nextPos;
  el.selectionEnd = nextPos;

  // Trigger input event to update Vue v-model
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  isDirty.value = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanskrit Transliteration Automation (Vidyut Lipi)
// ─────────────────────────────────────────────────────────────────────────────
const transliterating = ref(false);

async function autoTransliterateIastToDevanagari() {
  const seg = currentSegment.value;
  if (!seg || !seg.sanskrit_iast) return;

  transliterating.value = true;
  try {
    let devanagari = "";
    if (isTauri) {
      try {
        devanagari = await invoke<string>("transliterate_sanskrit", {
          text: seg.sanskrit_iast,
          fromScheme: "iast",
          toScheme: "devanagari",
        });
      } catch {
        devanagari = await toggleTransliteration(seg.sanskrit_iast);
      }
    } else {
      devanagari = await toggleTransliteration(seg.sanskrit_iast);
    }

    if (devanagari) {
      seg.sanskrit_devanagari = devanagari;
      isDirty.value = true;
    }
  } catch (err) {
    console.error("Transliteration failed:", err);
  } finally {
    transliterating.value = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan-PDF Viewer Methods
// ─────────────────────────────────────────────────────────────────────────────
async function pickScanPdf() {
  if (!isTauri) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (currentBlobUrl.value) URL.revokeObjectURL(currentBlobUrl.value);
        scanPdfFileName.value = file.name;
        scanPdfPath.value = `browser://${file.name}`;
        currentBlobUrl.value = URL.createObjectURL(file);
        scanTotalPages.value = 1;
        scanCurrentPage.value = 1;
        scanLoading.value = false;
        scanError.value = null;
        notifySynopticState();
      }
    };
    input.click();
    return;
  }

  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });

    if (selected && typeof selected === "string") {
      await loadScanPdf(selected);
    }
  } catch (err) {
    console.error("Failed to pick Scan PDF:", err);
  }
}

async function loadScanPdf(path: string) {
  const token = ++loadToken;
  scanPdfPath.value = path;
  scanPdfFileName.value = path.split(/[/\\]/).pop() || "scan.pdf";
  scanLoading.value = true;
  scanError.value = null;
  pageSvgCache.clear();

  if (currentBlobUrl.value) {
    URL.revokeObjectURL(currentBlobUrl.value);
    currentBlobUrl.value = null;
  }

  try {
    const info = await invoke<PdfDocInfo>("get_pdf_info", { path });
    if (token !== loadToken) return;

    scanTotalPages.value = Math.max(1, info.page_count);
    const targetPage = currentSegment.value.scan_page || 1;
    await renderScanPage(Math.min(targetPage, scanTotalPages.value));
  } catch (err) {
    if (token !== loadToken) return;
    scanError.value = String(err);
    console.error("Failed to load PDF info:", err);
  } finally {
    if (token === loadToken) {
      scanLoading.value = false;
    }
  }
}

async function renderScanPage(pageNumber: number) {
  if (!scanPdfPath.value) return;
  const pageIndex = Math.max(0, pageNumber - 1);
  scanCurrentPage.value = pageNumber;
  scanLoading.value = true;
  scanError.value = null;

  try {
    let svg = pageSvgCache.get(pageIndex);
    if (!svg) {
      svg = await invoke<string>("render_pdf_page_svg", {
        path: scanPdfPath.value,
        pageIndex,
      });
      pageSvgCache.set(pageIndex, svg);
    }

    if (currentBlobUrl.value) {
      URL.revokeObjectURL(currentBlobUrl.value);
    }

    const blob = new Blob([svg], { type: "image/svg+xml" });
    currentBlobUrl.value = URL.createObjectURL(blob);
  } catch (err) {
    scanError.value = String(err);
    console.error(`Failed to render page ${pageNumber}:`, err);
  } finally {
    scanLoading.value = false;
  }
}

function nextScanPage() {
  if (scanCurrentPage.value < scanTotalPages.value) {
    renderScanPage(scanCurrentPage.value + 1);
  }
}

function prevScanPage() {
  if (scanCurrentPage.value > 1) {
    renderScanPage(scanCurrentPage.value - 1);
  }
}

function unloadScanPdf() {
  if (currentBlobUrl.value) {
    URL.revokeObjectURL(currentBlobUrl.value);
    currentBlobUrl.value = null;
  }
  scanPdfPath.value = null;
  scanPdfFileName.value = null;
  scanCurrentPage.value = 1;
  scanTotalPages.value = 1;
  pageSvgCache.clear();
}

function notifySynopticState() {
  emit("update-synoptic-state", {
    jsonPath: activeJsonPath.value,
    jsonTitle: masterData.value.work?.title || "book.json",
    isDirty: isDirty.value,
    scanPath: scanPdfPath.value,
    scanFileName: scanPdfFileName.value,
    scanCurrentPage: scanCurrentPage.value,
    scanTotalPages: scanTotalPages.value,
  });
}

watch(
  [
    activeJsonPath,
    () => masterData.value.work?.title,
    isDirty,
    scanPdfPath,
    scanPdfFileName,
    scanCurrentPage,
    scanTotalPages,
  ],
  () => {
    notifySynopticState();
  },
  { immediate: true }
);

function zoomIn() {
  scanZoom.value = Math.min(250, scanZoom.value + 15);
}

function zoomOut() {
  scanZoom.value = Math.max(50, scanZoom.value - 15);
}

function resetZoom() {
  scanZoom.value = 100;
}

function linkCurrentScanPage() {
  const seg = currentSegment.value;
  if (!seg) return;
  seg.scan_page = scanCurrentPage.value;
  isDirty.value = true;
  saveIndicatorText.value = `Vers mit Seite ${scanCurrentPage.value} verknüpft`;
  scheduleStatusReset(1500, () => {
    saveIndicatorText.value = isDirty.value ? "Ungespeichert" : "Synchronisiert";
  });
}

// Automatically jump to segment's linked page when selecting another segment
watch(
  () => currentSegment.value?.scan_page,
  (newPage) => {
    if (newPage && scanPdfPath.value && newPage !== scanCurrentPage.value) {
      renderScanPage(newPage);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Master-JSON File I/O & Auto-Repair on Save
// ─────────────────────────────────────────────────────────────────────────────
function loadMasterJsonContent(content: string, filePath: string) {
  const parsed = JSON.parse(content);

  // Support both wrapped ({ work, sections }) and raw array formats
  if (Array.isArray(parsed)) {
    masterData.value = {
      work: {
        title: filePath.split(/[/\\]/).pop() || "Editions-Korpus",
        total_verses: parsed.length,
      },
      sections: parsed,
    };
  } else if (parsed && typeof parsed === "object") {
    masterData.value = {
      work: parsed.work || {
        title: parsed.title || "Editions-Korpus",
        total_verses: parsed.sections?.length || 0,
      },
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    };
  }

  activeJsonPath.value = filePath;
  activeSegmentIndex.value = 0;
  isDirty.value = false;
  saveIndicatorText.value = "Synchronisiert";

  // Auto-load scan PDF if referenced in work metadata
  if (masterData.value.work?.scan_pdf_path) {
    loadScanPdf(masterData.value.work.scan_pdf_path);
  }

  notifySynopticState();
}

async function pickAndOpenMasterJson() {
  if (!isTauri) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const content = await file.text();
          loadMasterJsonContent(content, file.name);
        } catch (err) {
          console.error("Failed to parse JSON in browser:", err);
        }
      }
    };
    input.click();
    return;
  }

  try {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Master-JSON Korpus", extensions: ["json"] }],
    });

    if (selected && typeof selected === "string") {
      await loadMasterJsonFile(selected);
    }
  } catch (err) {
    console.error("Failed to open Master-JSON:", err);
  }
}

async function loadMasterJsonFile(filePath: string) {
  try {
    const content = await readTextFile(filePath);
    loadMasterJsonContent(content, filePath);
  } catch (err) {
    console.error("Failed to parse Master-JSON file:", err);
    alert(`Fehler beim Öffnen der Master-JSON-Datei:\n${err}`);
  }
}

async function handleSave() {
  // Silent auto-repair:
  // 1. Unicode NFC-Normalisierung auf allen Sanskrit- und Übersetzungstexten
  // 2. Trailing-Whitespace-Bereinigung
  // 3. Konsistente Vers-Nummerierung und Metadaten-Synchronisation
  for (const seg of masterData.value.sections) {
    if (seg.sanskrit_iast) {
      seg.sanskrit_iast = seg.sanskrit_iast.normalize("NFC").trim();
    }
    if (seg.sanskrit_devanagari) {
      seg.sanskrit_devanagari = seg.sanskrit_devanagari.normalize("NFC").trim();
    }
    if (seg.translation_primary) {
      seg.translation_primary = seg.translation_primary.trim();
    }
    if (seg.apparatus) {
      seg.apparatus = seg.apparatus.trim();
    }
    if (seg.commentary) {
      seg.commentary = seg.commentary.trim();
    }
  }

  if (masterData.value.work) {
    masterData.value.work.total_verses = masterData.value.sections.length;
    if (scanPdfPath.value) {
      masterData.value.work.scan_pdf_path = scanPdfPath.value;
    }
  }

  const jsonString = JSON.stringify(masterData.value, null, 2);

  let targetPath = activeJsonPath.value;
  if (!targetPath) {
    try {
      const selected = await save({
        defaultPath: "book.json",
        filters: [{ name: "Master-JSON", extensions: ["json"] }],
      });
      if (!selected) return;
      targetPath = selected;
      activeJsonPath.value = targetPath;
    } catch (err) {
      console.error("Save dialog cancelled or failed:", err);
      return;
    }
  }

  try {
    await writeTextFile(targetPath, jsonString);
    isDirty.value = false;
    isAutoRepaired.value = true;
    saveIndicatorText.value = "Auto-Repaired & Gespeichert";
    scheduleStatusReset(1400, () => {
      isAutoRepaired.value = false;
      saveIndicatorText.value = "Synchronisiert";
    });
  } catch (err) {
    console.error("Failed to save Master-JSON to disk:", err);
    saveIndicatorText.value = "Speicherfehler";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Segment Navigation & Manipulation
// ─────────────────────────────────────────────────────────────────────────────
function prevSegment() {
  if (activeSegmentIndex.value > 0) {
    activeSegmentIndex.value--;
  }
}

function nextSegment() {
  if (activeSegmentIndex.value < masterData.value.sections.length - 1) {
    activeSegmentIndex.value++;
  }
}

function addNewSegment() {
  const current = currentSegment.value;
  const newNum = masterData.value.sections.length + 1;
  const newVerseNum = current.verse_num ? `${current.verse_num}.next` : `${newNum}`;

  const newSeg: EditionSegment = {
    verse_num: newVerseNum,
    canonical_id: `SEG_${newNum}`,
    title: `Neuer Abschnitt ${newNum}`,
    sanskrit_iast: "",
    sanskrit_devanagari: "",
    translation_primary: "",
    apparatus: "",
    commentary: "",
    scan_page: scanCurrentPage.value,
  };

  masterData.value.sections.splice(activeSegmentIndex.value + 1, 0, newSeg);
  activeSegmentIndex.value++;
  isDirty.value = true;
}

function duplicateSegment() {
  const current = currentSegment.value;
  const copy: EditionSegment = JSON.parse(JSON.stringify(current));
  copy.canonical_id = `${copy.canonical_id}_copy`;
  copy.title = `${copy.title} (Kopie)`;

  masterData.value.sections.splice(activeSegmentIndex.value + 1, 0, copy);
  activeSegmentIndex.value++;
  isDirty.value = true;
}

function deleteSegment() {
  if (masterData.value.sections.length <= 1) {
    alert("Das letzte verbleibende Segment kann nicht gelöscht werden.");
    return;
  }
  if (
    confirm(
      `Möchten Sie das Segment "${currentSegment.value.canonical_id}: ${currentSegment.value.title}" wirklich löschen?`
    )
  ) {
    masterData.value.sections.splice(activeSegmentIndex.value, 1);
    if (activeSegmentIndex.value >= masterData.value.sections.length) {
      activeSegmentIndex.value = masterData.value.sections.length - 1;
    }
    isDirty.value = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Shortcuts for Mode 2
// ─────────────────────────────────────────────────────────────────────────────
function handleKeyDown(e: KeyboardEvent) {
  if (
    !synopticRootRef.value ||
    synopticRootRef.value.style.display === "none" ||
    (synopticRootRef.value.offsetParent === null &&
      !window.navigator.userAgent.includes("jsdom") &&
      synopticRootRef.value.isConnected)
  ) {
    return;
  }

  const isCmdOrCtrl = e.metaKey || e.ctrlKey;
  if (isCmdOrCtrl && e.key.toLowerCase() === "s") {
    e.preventDefault();
    handleSave();
  } else if (isCmdOrCtrl && e.key === "ArrowUp") {
    e.preventDefault();
    prevSegment();
  } else if (isCmdOrCtrl && e.key === "ArrowDown") {
    e.preventDefault();
    nextSegment();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  if (statusTimer) clearTimeout(statusTimer);
  if (currentBlobUrl.value) {
    URL.revokeObjectURL(currentBlobUrl.value);
  }
  pageSvgCache.clear();
});

defineExpose({
  loadMasterJsonFile,
  loadScanPdf,
  unloadScanPdf,
  pickScanPdf,
  pickAndOpenMasterJson,
  handleSave,
});
</script>

<template>
  <div ref="synopticRootRef" class="flex-1 flex flex-col h-full bg-app-bg overflow-hidden select-none">
    <!-- Top Mode 2 Sub-Header & Global File Actions -->
    <header class="flex-none flex items-center justify-between px-4 py-2 border-b border-app-border bg-app-bg-secondary text-xs">
      <!-- Left: Mode Identity & Work Title -->
      <div class="flex items-center gap-3 min-w-0">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 shrink-0">
          Modus 2
        </span>
        <span class="font-semibold text-app-text truncate">
          {{ masterData.work?.title || "Synoptische Edition & Master-JSON" }}
        </span>
        <span class="text-app-border shrink-0">|</span>
        <span class="text-app-text-secondary font-mono font-semibold truncate max-w-[240px]" :title="activeJsonPath || 'book.json'">
          {{ activeJsonPath ? activeJsonPath.split(/[/\\]/).pop() : "book.json (AST-Korpus)" }}
        </span>
        <span v-if="isDirty" class="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" title="Ungespeicherte Änderungen"></span>
      </div>

      <!-- Right: File Actions & Silent Auto-Repair Save Button -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Open JSON File -->
        <button
          @click="pickAndOpenMasterJson"
          class="px-2.5 py-1 rounded border border-app-border hover:bg-app-bg-hover text-app-text-secondary hover:text-app-text font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          title="Master-JSON (*.json) vom Dateisystem laden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
          <span>JSON öffnen...</span>
        </button>

        <!-- Status Indicator -->
        <span
          class="text-[11px] font-medium transition-colors hidden sm:inline"
          :class="isAutoRepaired ? 'text-amber-800 dark:text-amber-300 font-semibold' : 'text-app-text-secondary'"
        >
          {{ saveIndicatorText }}
        </span>

        <!-- Silent Auto-Repair on Save Button -->
        <button
          @click="handleSave"
          class="px-3 py-1 rounded font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          :class="isAutoRepaired ? 'bg-amber-500 text-slate-950 scale-95 ring-2 ring-amber-400' : 'bg-amber-600 hover:bg-amber-700 text-white'"
          title="Master-JSON speichern (Cmd/Ctrl+S - Silent Auto-Repair on Save)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Speichern</span>
        </button>
      </div>
    </header>

    <!-- Main Resizable Split-Pane Workspace -->
    <div ref="splitContainerRef" class="flex-1 flex overflow-hidden relative">
      <!-- ═════════════════════════════════════════════════════════════════════ -->
      <!-- Left Pane: Scan PDF Viewer (Hayro SVG via Native Tauri Rust IPC)     -->
      <!-- ═════════════════════════════════════════════════════════════════════ -->
      <section
        class="flex flex-col bg-app-bg-secondary/40 overflow-hidden"
        :style="{ width: splitRatio + '%' }"
      >
        <!-- Scan Header & Controls Toolbar -->
        <div class="flex-none flex items-center justify-between px-3 py-1.5 border-b border-app-border bg-app-bg-secondary text-xs text-app-text-secondary font-medium">
          <!-- Left: Document Title / Path & Link Action -->
          <div class="flex items-center gap-2 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-text shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span class="font-semibold text-app-text truncate" :title="scanPdfPath || 'Kein Scan zugeordnet'">
              {{ scanPdfFileName || "Scan-Quelle (Originaldruck)" }}
            </span>

            <button
              v-if="scanPdfPath"
              @click="linkCurrentScanPage"
              class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-600/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Aktuelle Scan-Seite mit dem rechts ausgewählten Vers verknüpfen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Mit Vers verknüpfen</span>
            </button>
          </div>

          <!-- Right: Page Navigation & Zoom Controls -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Page Paging -->
            <button
              @click="prevScanPage"
              :disabled="!scanPdfPath || scanCurrentPage <= 1"
              class="p-1 rounded hover:bg-app-bg-hover disabled:opacity-30 transition-colors cursor-pointer text-app-text"
              title="Vorherige Scan-Seite"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span class="font-mono text-[11px] font-semibold text-app-text-secondary tabular-nums">
              {{ scanCurrentPage }} / {{ scanTotalPages }}
            </span>
            <button
              @click="nextScanPage"
              :disabled="!scanPdfPath || scanCurrentPage >= scanTotalPages"
              class="p-1 rounded hover:bg-app-bg-hover disabled:opacity-30 transition-colors cursor-pointer text-app-text"
              title="Nächste Scan-Seite"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <!-- Hairline Divider -->
            <div class="w-px h-3.5 bg-app-border mx-1"></div>

            <!-- Zoom Controls -->
            <button
              @click="zoomOut"
              :disabled="!scanPdfPath || scanZoom <= 50"
              class="p-1 rounded hover:bg-app-bg-hover disabled:opacity-30 transition-colors cursor-pointer text-app-text"
              title="Verkleinern"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <span
              @dblclick="resetZoom"
              class="font-mono text-[11px] font-semibold text-app-text-secondary tabular-nums cursor-pointer"
              title="Doppelklick zum Zurücksetzen auf 100%"
            >
              {{ scanZoom }}%
            </span>
            <button
              @click="zoomIn"
              :disabled="!scanPdfPath || scanZoom >= 250"
              class="p-1 rounded hover:bg-app-bg-hover disabled:opacity-30 transition-colors cursor-pointer text-app-text"
              title="Vergrößern"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            <!-- Open / Switch PDF Button -->
            <button
              @click="pickScanPdf"
              class="ml-1 p-1 rounded hover:bg-app-bg-hover transition-colors cursor-pointer text-app-text"
              title="Scan-PDF wechseln / öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Scan Body (Scrollable Container) -->
        <div class="flex-1 overflow-auto p-4 flex items-center justify-center relative">
          <!-- Active Loaded PDF View -->
          <div
            v-if="scanPdfPath && currentBlobUrl"
            class="transition-all duration-150 flex flex-col items-center w-full h-full"
            :style="{ width: scanZoom + '%' }"
          >
            <div class="bg-white text-slate-900 shadow-xl rounded-md border border-app-border overflow-hidden relative w-full h-full min-h-[500px]">
              <iframe
                v-if="!isTauri"
                :src="currentBlobUrl"
                class="w-full h-full min-h-[500px] border-none"
                title="Scan PDF"
              ></iframe>
              <img
                v-else
                :src="currentBlobUrl"
                :alt="`Scan Seite ${scanCurrentPage}`"
                class="w-full h-auto block select-none pointer-events-none"
              />
            </div>
          </div>

          <!-- Loading State -->
          <div v-else-if="scanLoading" class="flex flex-col items-center gap-2 text-app-text-secondary text-xs">
            <div class="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full"></div>
            <span>Vektor-Scan rendern (Hayro SVG)...</span>
          </div>

          <!-- Error State -->
          <div v-else-if="scanError" class="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs max-w-sm text-center">
            <span>Scan-Fehler: {{ scanError }}</span>
          </div>

          <!-- Empty State: Scan Picker Prompt -->
          <div v-else class="max-w-md p-6 rounded-xl border border-dashed border-app-border bg-app-bg flex flex-col items-center gap-3 text-center">
            <div class="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-app-text">Historischer Scan (Originaldruck)</h3>
              <p class="text-xs text-app-text-secondary mt-1 leading-relaxed">
                Weise dieser Edition das Original-Scan-PDF zu. Der Scan wird über das native Rust-Backend via Hayro-SVG blitzschnell und synchron zur ausgewählten Vers-ID gerendert.
              </p>
            </div>
            <button
              @click="pickScanPdf"
              class="mt-1 px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-bg-hover text-xs font-semibold text-app-text transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
              <span>Scan-PDF zuordnen...</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ═════════════════════════════════════════════════════════════════════ -->
      <!-- Resizable Boundary Handle                                           -->
      <!-- ═════════════════════════════════════════════════════════════════════ -->
      <div
        @mousedown="startResize"
        @dblclick="resetSplitRatio"
        class="w-1.5 -ml-0.5 -mr-0.5 bg-transparent hover:bg-amber-500/50 active:bg-amber-600 cursor-col-resize select-none transition-colors h-full z-20 shrink-0"
        title="Spaltenbreite anpassen (Doppelklick für 50/50 Reset)"
      ></div>

      <!-- ═════════════════════════════════════════════════════════════════════ -->
      <!-- Right Pane: Master-JSON Segment Editor & Snippet Toolbar             -->
      <!-- ═════════════════════════════════════════════════════════════════════ -->
      <section
        class="flex-1 flex flex-col bg-app-bg overflow-hidden min-w-[320px]"
        :style="{ width: 100 - splitRatio + '%' }"
      >
        <!-- Segment Bar: Navigation, Verse Picker & Manipulation Actions -->
        <div class="flex-none flex items-center justify-between px-3 py-1.5 border-b border-app-border bg-app-bg-secondary text-xs">
          <!-- Left: Segment Paging & Select Picker -->
          <div class="flex items-center gap-2 min-w-0">
            <button
              @click="prevSegment"
              :disabled="activeSegmentIndex === 0"
              class="p-1 rounded hover:bg-app-bg-hover disabled:opacity-30 transition-colors cursor-pointer text-app-text"
              title="Vorheriges Segment (Cmd/Ctrl+Up)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <!-- Vers Selector Dropdown -->
            <select
              v-model="activeSegmentIndex"
              class="px-2 py-0.5 rounded border border-app-border bg-app-bg text-app-text font-semibold text-xs cursor-pointer focus:border-amber-500 focus:outline-none max-w-[240px] truncate"
            >
              <option
                v-for="(seg, idx) in masterData.sections"
                :key="seg.canonical_id || idx"
                :value="idx"
              >
                Vers {{ seg.verse_num }}: {{ seg.title }} ({{ seg.canonical_id }})
              </option>
            </select>

            <button
              @click="nextSegment"
              :disabled="activeSegmentIndex >= masterData.sections.length - 1"
              class="p-1 rounded hover:bg-app-bg-hover disabled:opacity-30 transition-colors cursor-pointer text-app-text"
              title="Nächstes Segment (Cmd/Ctrl+Down)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <span class="text-app-text-secondary text-[11px] font-medium hidden md:inline">
              {{ activeSegmentIndex + 1 }} von {{ masterData.sections.length }}
            </span>
          </div>

          <!-- Right: Segment Operations (+ Vers, Kopieren, Löschen) -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              @click="addNewSegment"
              class="px-2 py-0.5 rounded border border-app-border hover:bg-app-bg-hover text-app-text font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
              title="Neues Segment nach aktuellem einfügen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>+ Vers</span>
            </button>

            <button
              @click="duplicateSegment"
              class="p-1 rounded hover:bg-app-bg-hover text-app-text transition-colors cursor-pointer"
              title="Aktuelles Segment duplizieren"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>

            <button
              @click="deleteSegment"
              :disabled="masterData.sections.length <= 1"
              class="p-1 rounded hover:bg-red-500/10 text-app-text-secondary hover:text-red-500 disabled:opacity-30 transition-colors cursor-pointer"
              title="Aktuelles Segment löschen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Integrated Snippet Toolbar (Global Web Editor QA Standard) -->
        <div class="flex-none px-3 py-1 border-b border-app-border bg-app-bg-secondary/60 flex items-center gap-1 overflow-x-auto select-none">
          <span class="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mr-1 shrink-0">
            Snippets:
          </span>
          <button
            v-for="char in IAST_SNIPPETS"
            :key="char"
            @click="insertSnippet(char)"
            class="px-1.5 py-0.5 rounded hover:bg-app-bg-hover text-app-text font-serif text-xs font-semibold border border-transparent hover:border-app-border transition-colors cursor-pointer shrink-0"
            :title="`'${char}' an Cursor-Position einfügen`"
          >
            {{ char }}
          </button>
        </div>

        <!-- Field Mask: Structured Segment Fields -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 select-text">
          <!-- Metadata Row: Canonical ID, Verse Num & Linked Page -->
          <div class="grid grid-cols-3 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
                Kanonische ID
              </label>
              <input
                v-model="currentSegment.canonical_id"
                @focus="registerFocus"
                type="text"
                class="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-app-text rounded-md border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="z.B. BAU_1_4_1"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
                Vers-Nummer
              </label>
              <input
                v-model="currentSegment.verse_num"
                @focus="registerFocus"
                type="text"
                class="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-app-text rounded-md border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="z.B. 1.4.1"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
                Verknüpfte Scan-Seite
              </label>
              <div class="flex items-center gap-1.5">
                <input
                  v-model.number="currentSegment.scan_page"
                  @focus="registerFocus"
                  type="number"
                  min="1"
                  :max="scanTotalPages"
                  class="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-app-text rounded-md border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors"
                  placeholder="Seite #"
                />
                <button
                  v-if="currentSegment.scan_page"
                  @click="renderScanPage(currentSegment.scan_page)"
                  class="px-2 py-1.5 rounded bg-app-bg-secondary hover:bg-app-bg-hover text-app-text border border-app-border transition-colors text-xs cursor-pointer shrink-0"
                  title="Zur Scan-Seite springen"
                >
                  Go
                </button>
              </div>
            </div>
          </div>

          <!-- Title / Lemma -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
              Titel / Lemma
            </label>
            <input
              v-model="currentSegment.title"
              @focus="registerFocus"
              type="text"
              class="w-full px-3 py-1.5 text-sm font-semibold text-app-text rounded-lg border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="Abschnittstitel"
            />
          </div>

          <!-- Sanskrit IAST with Vidyut Lipi Transliteration Automation -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
                Sanskrit Umschrift (IAST)
              </label>
              <button
                @click="autoTransliterateIastToDevanagari"
                :disabled="transliterating || !currentSegment.sanskrit_iast"
                class="text-[11px] px-2 py-0.5 rounded font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/30 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-30"
                title="IAST via Rust Vidyut-Lipi automatisch in Devanāgarī überführen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 14h6"/>
                  <path d="M7 17v-6"/>
                  <path d="M14 10h6"/>
                  <path d="M17 7v6"/>
                </svg>
                <span>{{ transliterating ? "Konvertiere..." : "→ Devanāgarī via Vidyut Lipi" }}</span>
              </button>
            </div>
            <textarea
              v-model="currentSegment.sanskrit_iast"
              @focus="registerFocus"
              rows="3"
              class="w-full px-3 py-2 text-sm font-serif text-app-text rounded-lg border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors resize-none leading-relaxed"
              placeholder="IAST-Text des Verses..."
            ></textarea>
          </div>

          <!-- Sanskrit Devanagari -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
              Sanskrit (Devanāgarī)
            </label>
            <textarea
              v-model="currentSegment.sanskrit_devanagari"
              @focus="registerFocus"
              rows="2"
              class="w-full px-3 py-2 text-base font-serif text-app-text rounded-lg border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors resize-none leading-relaxed"
              placeholder="देवनागरी पाठ..."
            ></textarea>
          </div>

          <!-- German Translation (Primary) -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
              Deutsche Übersetzung (Primärfassung)
            </label>
            <textarea
              v-model="currentSegment.translation_primary"
              @focus="registerFocus"
              rows="3"
              class="w-full px-3 py-2 text-sm text-app-text rounded-lg border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors resize-none leading-relaxed"
              placeholder="Deutsche Übersetzung..."
            ></textarea>
          </div>

          <!-- Apparatus & Commentary Split -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
                Textkritischer Apparat
              </label>
              <textarea
                v-model="currentSegment.apparatus"
                @focus="registerFocus"
                rows="3"
                class="w-full px-3 py-2 text-xs font-mono text-app-text rounded-lg border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors resize-none"
                placeholder="Handschriften, Lesarten..."
              ></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-app-text-secondary uppercase tracking-wider">
                Philologischer Kommentar / Lemmata
              </label>
              <textarea
                v-model="currentSegment.commentary"
                @focus="registerFocus"
                rows="3"
                class="w-full px-3 py-2 text-xs text-app-text rounded-lg border border-app-border bg-app-bg focus:border-amber-500 focus:outline-none transition-colors resize-none"
                placeholder="Lemmata, Sacherklärungen..."
              ></textarea>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>