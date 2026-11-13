---
title: Roadmap & Feature Backlog
---

# 🗺️ Roadmap & Feature Backlog

This document provides transparent tracking of features currently in development, architectural plans, and features parked in the backlog for future releases (target: **ZenTauri v2.0.0**).

---

## 📌 Implementation Status Overview

| Capability | Current Status | Target Milestone | Description |
| :--- | :--- | :--- | :--- |
| **Native Typst PDF Export** | ✅ **Active (v1.7.0+)** | v1.7.0 | Pure Rust Typst compilation in `src-tauri` (`typst-as-lib`, `typst-pdf`, STIX Two Text fontstack) |
| **Office & DOCX Ingest** | ✅ **Active (v1.8.0)** | v1.8.0 | Pure-Rust ingest (`docling-rs`) for `.docx`, `.odt`, `.rtf`, `.epub` with Unicode NFC sanitization |
| **Dual PDF QA Vector Viewer** | ✅ **Active (v1.7.0+)** | v1.7.0 | Rust-first vector PDF synchron-viewer (`hayro_svg`, %/page lockstep, SWAP, file associations) |
| **Editor Splitter & Soft-Wrap** | ✅ **Active (v1.8.2)** | v1.8.2 | Draggable vertical editor/preview split-divider (50/50 reset) & CodeMirror 6 soft line wrapping |
| **Duplicate File & Repeat Command**| ✅ **Active (v1.8.1)** | v1.8.1 | Native file duplication (`⌘⇧D`) and command repetition (`⌘Y` / `Ctrl+Y`) with undo sync |
| **Harvard-Kyoto & IAST Hotkeys** | ✅ **Active (v1.2.0)** | v1.2.0 | Bidirectional shortcuts `⌥⌘D` & `⌥⌘H` with tag-safe directive isolation |
| **Academic Footnotes & Deflists** | ✅ **Active (v1.2.0)** | v1.2.0 | Standard `[^1]` footnotes and `Term\n: Definition` lists via markdown-it |
| **Dual PDF QA Annotations & AI** | ✅ **Active** | v2.0.0 | Bounding-box annotation overlay on SVG pages, JSON export & 1-click AI Review Prompt |
| **Dual Markdown & Collation Diff** | ✅ **Active** | v2.0.0 | Side-by-side Markdown comparison (rendered & source) with word/character diacritic diff |
| **Synoptic Master-JSON (Mode 2)** | ✅ **Active (Core)** | v2.0.0 | Split-pane editor for `book.json` editions alongside PDF scans (`⌘S`, `⌘↑`/`⌘↓`) |
| **In-Editor Live IME (Stage 2)** | 📋 **Backlog / Conceived** | v2.0.0 | CodeMirror live conversion inside `《...》` and compose sequences in prose |
| **Knowledge Graph & Wikilinks** | 📋 **Backlog / Parked** | v2.0.0 | Re-integration of interactive graph, `[[` fuzzy autocomplete, and Cmd+Click navigation |
| **Synchronous Diagrams (Pele)** | 📋 **Backlog / Evaluation** | v2.0.0 | Zero-lag synchronous Mermaid-compatible renderer via `pele.run` (~2.5 MB bundle reduction) |
| **DOCX Export & CriticMarkup** | 📋 **Backlog / Conceived** | v2.1.0 | Scholarly `.docx` export template and CodeMirror CriticMarkup track-changes visualization |
| **TEI-P5 Export (Mode 2)** | 📋 **Backlog / Conceived** | v2.1.0 | Automated Rust compilation from `book.json` Master-JSON to TEI-P5 XML and Typst-PDF |
| **QA Reference Dual-Pane** | 📋 **Backlog / Parked (v1.3.0)** | v2.2.0 | Text-based dual-pane comparison (parked in v1.3.0 in favor of Mode 3: Dual PDF QA) |

---

## 1. Native Typst PDF Compilation

- **Status:** ✅ **Active / Deployed** (`src-tauri` via `typst-as-lib` & `typst-pdf`; STIX Two Text standard in v1.8.0)
- **Goal:** Completely replaces web-based HTML/WebKit print rendering with instantaneous, publication-grade academic PDF typesetting powered directly by the native Typst compiler in Rust.

### Key Milestones:
1. **Direct AST Mapping (✅ Active):** Compiles Markdown AST elements, Payer container boxes, KaTeX formulas, footnotes, and metadata into semantic Typst markup.
2. **Academic Layouts & Font Cascades (✅ Active):** Automated page numbering, margins, footnotes, and the Birchville Scholarly Fontstack (*STIX Two Text*, *Gentium Plus*, *Noto Serif Devanagari*).
3. **No Heavy Chromium/Node Dependencies (✅ Active):** Zero-overhead binary builds without Playwright or headless browsers.
4. **Future Enhancements (📋 Target: v2.0.0):** User-configurable Typst template selection and multi-column critical apparatus.

---

## 2. In-Editor Live IME (Stage 2 of Sanskrit Hybrid Framework)

- **Status:** Planned / Architecture documented in [Sanskrit Input Architecture](./scholarly-input-architecture)
- **Goal:** Context-aware real-time transliteration directly inside the CodeMirror 6 editor without switching operating system keyboard layouts.

### Planned Stages:
- **Stage 1 (Canonical Storage):** ✅ *Active* — Markdown source always persists standard IAST or Unicode Devanāgarī.
- **Stage 2 (In-Editor Live IME):** 📋 *Planned*
  - **Scope-Based Live IME:** While typing inside Sanskrit brackets (`《...》` or `⟪...⟫`), ASCII Harvard-Kyoto (`kRSNaH`) is converted to IAST (`kṛṣṇaḥ`) or Devanāgarī (`कृष्णः`) in real time.
  - **Compose Sequences:** Fast inline character sequences in running prose (`.r` => `ṛ`, `-a` => `ā`, `~n` => `ñ`, etc.).
- **Stage 3 (Post-Hoc Transliteration):** ✅ *Active* — Global shortcuts `⌥⌘D` and `⌥⌘H` for selection toggling.

> [!NOTE]
> **OS Keyboard Compatibility:** Direct input via OS keyboards (such as EasyUnicode or Mac Option-keys) is always passed through unmodified and will never be constrained by Stage 2.

---

## 3. Knowledge Graph & Bidirectional Wikilinks

- **Status:** Backlog (temporarily deactivated in active UI to reduce bundle size by ~600 kB)
- **Components:** `src/components/GraphView.vue`, `src-tauri/src/db.rs` (SQLite Workspace Indexer)

### Planned Enhancements upon Re-Activation:
1. **Editor Autocomplete for Wikilinks (`[[`):** Fuzzy document search popup when typing `[[` in CodeMirror.
2. **Direct Source Code Navigation (`Cmd+Click`):** Instant jumping to linked target files.
3. **Backlinks Inspector:** Dedicated sidebar panel for incoming cross-references.
4. **Graph Filters & Orphan Detection:** Isolate unlinked notes and filter by tags or folders.

---

## 4. Dual PDF & Markdown QA / Proofing (Work-Mode 3)

- **Status:** ✅ **Active (Vector Viewer, Dual Markdown, Collation Diff, Bounding-Box Annotations & AI Prompt)** / 📋 **Flattened PDF Export in Backlog**
- **Goal:** Comprehensive side-by-side collation and AI-assisted proofing of re-typeset editions against historical reference PDFs or Markdown sources.

### Active Features:
- **High-Fidelity Vector Rendering:** Direct SVG rendering of PDF pages via `hayro_svg` in Rust with ID isolation and sharp zooming.
- **Synchronous Dual-Viewer:** Percentage-based and page-lockstep synchronized scrolling, SWAP toggle, and fit-width modes.
- **Dual Markdown & Philological Collation Diff:** Side-by-side Markdown comparison (rendered & raw source) with word- and character-level diacritic highlighting (`diffCollation.ts`).
- **Normalized Overlay & Bounding Boxes:** Click-and-drag box annotations on rendered SVG vector pages with Proofing Drawer and JSON export.
- **Web-First AI Prompt Generator:** 1-click clipboard prompt containing document metadata, bounding-box findings, and collation diff stats for Claude/ChatGPT/Gemini.
- **System Launch & File Associations:** Direct file launch from macOS Finder and CLI (`open -a ZenTauri --args file1.pdf file2.pdf`).

### Planned Proofing Extensions:
1. **Annotated PDF Export & Automation:** Direct export of flattened PDF with embedded visual annotations and optional local Ollama diff-patching.

---

## 5. Synoptic Master-JSON Editor (Work-Mode 2)

- **Status:** ✅ **Active Core Split-Pane Editor (`SynopticView.vue`)** / 📋 **TEI-P5 & Typst Export Pipeline Planned**
- **Goal:** Segmented, split-pane editing of scanned historical editions (`book.json` / AST format) without requiring error-prone manual TEI-XML markup.

### Active Features:
1. **Split-Pane Scan Alignment:** Historical PDF scan on the left, structured segment entry on the right (`⌘S` save, `⌘↑`/`⌘↓` segment navigation).
2. **Field-Based Segments:** Dedicated inputs for Devanāgarī, IAST, translations, and philological apparatus with bidirectional Sanskrit transliteration.

### Planned Features:
1. **Automated Export Pipeline:** Native Rust compilation from Master-JSON into standard TEI-P5 XML and Typst-PDF.
2. **Silent Auto-Repair & Validation:** Automatic normalization of quotation marks, dandas, and JSON structure on save.

---

## 6. DOCX Interoperability & CriticMarkup (Word Bridge)

- **Status:** ✅ **Ingest Active (v1.8.0 via `docling-rs`)** / 📋 **Export & CriticMarkup on Roadmap (v2.1.0)**
- **Goal:** Lossless bridge to Microsoft Word-centric academic publishers and reviewers under a strict **Plain Text First** doctrine.

### Implemented Ingest Architecture (v1.8.0):
- **Plain Text as Canon:** Markdown is the persistent Single Source of Truth. `.docx` is strictly an ingest and export format.
- **Pure-Rust Office Ingest:** Direct native parsing of `.docx`, `.odt`, `.rtf`, `.epub`, `.pptx`, and `.xlsx` via `docling-rs` without Python or Pandoc dependencies.
- **Safe Import Buffer:** Converted documents open in a new unsaved tab (`<file>.md`), ensuring original files are never overwritten.
- **Sanitization & Unicode NFC:** Strips invisible control characters (soft hyphens, zero-width spaces, BOM) and enforces Unicode NFC normalization for IAST diacritics.

### Planned Scholarly Extensions (Target: v2.1.0):
1. **Scholarly Export Template:** Compilation to `.docx` using a pre-configured reference template guaranteeing correct academic font hierarchies (*STIX Two Text*, *Gentium Plus*, *Noto Serif Devanagari*).
2. **In-Editor CriticMarkup:** Visual rendering of inline edits and comments in CodeMirror 6 (`{++inserted++}`, `{--deleted--}`, `{>>comment<<}`) with 1-click accept/reject controls.

---

## 7. Synchronous Diagram Engine via Pele (`pele.run`)

- **Status:** 📋 **Backlog / Evaluation** (Target: v2.0.0)
- **Goal:** Replacing asynchronous Mermaid (v11/12) with a zero-dependency synchronous renderer to eliminate rendering lag and dramatically reduce bundle size.

### Key Advantages:
1. **Zero-Lag Synchronous Rendering:** Eliminates debounce timers and async DOM mutation in the preview by rendering diagrams directly in `markdown-it`.
2. **Bundle Size Reduction:** Reduces distribution bundle size by ~2.5 MB by eliminating Mermaid's heavy chunk graph.
3. **Birchville Theming:** Direct styling through standard CSS custom properties (`--pele-bg`, `--pele-fg`, `--pele-accent`), supporting instant light/dark theme switching.
4. **Vector Embedding in HTML Export:** Direct embedding of vector SVGs into standalone HTML exports under a strict `script-src 'none'` Content Security Policy.


