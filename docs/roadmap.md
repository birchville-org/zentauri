---
title: Roadmap & Feature Backlog
---

# 🗺️ Roadmap & Feature Backlog

This document provides transparent tracking of features currently in development, architectural plans, and features parked in the backlog for future releases (target: **ZenTauri v2.0.0**).

---

## 📌 Implementation Status Overview

| Capability | Current Status | Target Milestone | Description |
| :--- | :--- | :--- | :--- |
| **QA Reference Dual-Pane** | 📋 **Backlog / Parked (v1.3.0)** | v2.2.0 | Text-based dual-pane comparison (parked in v1.3.0 in favor of Mode 3: Dual PDF QA) |
| **Harvard-Kyoto & IAST Hotkeys** | ✅ **Active (v1.2.0)** | v1.2.0 | Bidirectional shortcuts `⌥⌘D` & `⌥⌘H` with tag-safe directive isolation |
| **Academic Footnotes & Deflists** | ✅ **Active (v1.2.0)** | v1.2.0 | Standard `[^1]` footnotes and `Term\n: Definition` lists via markdown-it |
| **Native Typst PDF Compilation** | ⏳ **In Development** | v2.0.0 | Pure Rust Typst compilation in `src-tauri` without browser/WebKit print engine |
| **Dual PDF QA & Proofing (Mode 3)** | 📋 **Backlog / Conceived** | v2.0.0 | Dual-vector PDF viewer with bounding-box annotations & AI correction prompt |
| **Synoptic Master-JSON (Mode 2)** | 📋 **Backlog / Conceived** | v2.1.0 | Split-pane editor for scanned editions (`book.json` AST format from Bṛhadāraṇyaka) |
| **DOCX Bridge & CriticMarkup** | 📋 **Backlog / Conceived** | v2.1.0 | Pandoc-powered DOCX ingest to clean Markdown, scholarly export template, and Track Changes |
| **In-Editor Live IME (Stage 2)** | 📋 **Backlog / Conceived** | v2.0.0 | CodeMirror live conversion inside `《...》` and compose sequences in prose |
| **Knowledge Graph & Wikilinks** | 📋 **Backlog / Parked** | v2.0.0 | Re-integration of interactive graph, `[[` fuzzy autocomplete, and Cmd+Click |

---

## 1. Native Typst PDF Compilation

- **Status:** In Development (`src-tauri` via `typst` & `typst-pdf` crates)
- **Goal:** Completely replacing web-based HTML print rendering with instantaneous, publication-grade academic PDF typesetting powered directly by the native Typst compiler.

### Key Milestones:
1. **Direct AST Mapping:** Compiling Markdown AST elements into semantic Typst markup.
2. **Academic Layouts:** Automated page numbering, margins, footnotes, and Devanagari typography cascades.
3. **No Heavy Chromium/Node Dependencies:** Lightweight, cross-platform binary builds.

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

## 4. Dual PDF QA & Proofing (Work-Mode 3)

- **Status:** Backlog / Conceived
- **Goal:** Comprehensive side-by-side collation and AI-assisted proofing of re-typeset editions against historical reference PDFs.

### Planned Stages:
1. **Normalized Overlay & Bounding Boxes:** Click-and-drag box annotations on rendered SVG vector pages (`hayro_svg`) with relative percentage coordinates.
2. **Web-First AI Prompt Generator:** 1-click clipboard prompt containing source Markdown and structured correction table for Claude/ChatGPT/Gemini Web.
3. **Annotated PDF Export & Automation:** Direct export of flattened PDF with visual annotations and optional local Ollama diff-patching.

---

## 5. Synoptic Master-JSON Editor (Work-Mode 2)

- **Status:** Backlog / Conceived (Inspired by the Bṛhadāraṇyaka-Upaniṣad edition project)
- **Goal:** Segmented, split-pane editing of scanned historical editions (`book.json` / AST format) without requiring error-prone manual TEI-XML markup.

### Planned Features:
1. **Split-Pane Scan Alignment:** Synchronized historical PDF scan on the left, structured segment entry on the right.
2. **Field-Based Segments:** Dedicated inputs for Devanāgarī, IAST, translations, critical variants (Slaje vs. Böhtlingk), and philological commentary.
3. **Automated Export Pipeline:** Native Rust compilation from Master-JSON into standard TEI-P5 XML and Typst-PDF.

---

## 6. DOCX Interoperability & CriticMarkup (Word Bridge)

- **Status:** Backlog / Conceived
- **Goal:** Lossless bridge to Microsoft Word-centric academic publishers and reviewers under a strict **Plain Text First** doctrine.

### Architecture:
- **Plain Text as Canon:** Markdown is the persistent Single Source of Truth. `.docx` is strictly an ingest and export format.
- **DOCX Ingest:** Automatic Rust/Pandoc conversion removing Word XML styling, normalizing Unicode diacritics, mapping footnotes to `[^1]`, and converting native Word Track Changes to CriticMarkup (`{++inserted++}`, `{--deleted--}`).
- **Scholarly Export Template:** Compilation to `.docx` using a pre-configured reference template guaranteeing correct academic font hierarchies (*Gentium Plus*, *Noto Serif Devanagari*).
- **In-Editor CriticMarkup:** Visual rendering of inline edits and comments in CodeMirror 6 with 1-click accept/reject controls.


