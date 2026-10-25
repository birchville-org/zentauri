---
layout: doc
title: Zentauri — Technical Documentation
---

# 🌌 Zentauri — Technical Documentation

Welcome to the official documentation for **Zentauri**, the Digital Humanities Desktop Workbench for Sanskrit philology, multilingual authoring, and critical text collation.

::: note-box
**The 3 Work-Modes of Zentauri**:
1. **Modus 1 (Markdown Authoring):** High-speed writing of Sanskrit grammar lessons, notes, and scholarly articles with Payer-v2 containers (`grammar-box`, `warning-box`, `verse-box`, `note-box`), Sanskrit bracket highlighting (`《...》`, `⟪...⟫`), KaTeX math rendering, and native Typst PDF export.
2. **Modus 2 (Synoptic Edition & Master-JSON):** Segmented editing of scanned historical editions (`book.json` / AST format) in a synchronized split-pane (scan PDF ⇄ structured fields for Devanāgarī, IAST, translation, and critical apparatus).
3. **Modus 3 (Dual PDF QA & Proofing):** Dual-vector PDF collation (`hayro_svg`) with normalized bounding-box annotations, 1-click AI review prompts, and annotated PDF export.
:::

---

## 🎯 Primary Purpose: Multi-Purpose Philological Suite

Zentauri combines focused Markdown text authoring with structured corpus edition and visual proofing:
1. **Markdown & Semantic HTML:** Text markup compiles into standard-compliant, semantic HTML — ideal for websites, VitePress portals, and digital textbooks.
2. **Media-Neutral Didactic Formatting:** Rather than complex DTP manual layouting, Zentauri provides a focused set of semantic directives (scholarly boxes, centering, indents, inline signal markers, and MultiMarkdown table spans).
3. **Typst PDF Export:** High-precision publication-grade typesetting compiled directly in native Rust without Chromium overhead.

---

## 🏛️ Core Architectural Pillars

| Pillar | Technology | Status & Objective |
| :--- | :--- | :--- |
| 🦀 **Rust-First Architecture** | Tauri v2, Rust, SQLite | **Active** — Maximum responsiveness, minimal memory footprint, and native OS integration |
| 📝 **Scholarly Editing (Mode 1)** | Vue 3, CodeMirror 6, markdown-it-extensible | **Active** — Split-pane authoring, Payer-v2 containers, footnotes, silent auto-repair, and philological metadata |
| 📜 **Synoptic Edition (Mode 2)** | Master-JSON (`book.json`), Scan Split-Pane | **Roadmap (v2.1.0)** — Segment-based edition of historical prints and scans |
| 🔍 **Dual PDF QA (Mode 3)** | `hayro_svg`, Bounding-Boxes, AI-Prompt | **Active / Roadmap (v2.0.0)** — Side-by-side vector PDF collation and visual proofing |
| 🖨️ **Native PDF Export** | Typst (`typst-as-lib`) | **Roadmap** — Instantaneous, high-precision academic PDF typesetting natively in Rust without Chromium |
| 🕸️ **Knowledge Graph** | SQLite Indexing, `v-network-graph` | **Backlog** — Visual constellation of bidirectional cross-references (indexing active, UI parked) |

---

## 📌 Documentation Overview

### Getting Started
- 💻 **[Installation & Setup](./installation)**: Step-by-step setup for macOS (Gatekeeper bypass), Windows, and Linux, plus seamless automatic updates.
- 📖 **[User Guide & Customization](./user-guide)**: Editor workflows, custom inline/block syntax creation, and styling via `custom.css`.

### Architecture & Specifications
- 📐 **[System Architecture](./system-architecture)**: Rust-first file explorer, IPC bridges, SQLite indexing, and native Typst PDF pipeline.
- ⌨️ **[Sanskrit Input Architecture](./scholarly-input-architecture)**: 3-stage hybrid input concept, in-editor live IME, and global transliteration hotkeys.
- 📝 **[Scholarly Features](./scholarly-features)**: Container blocks (`::: grammar-box`), footnotes, Devanāgarī font cascade, and QA dual-pane comparison mode.
- 📋 **[Roadmap & Backlog](./roadmap)**: Delineation of active v1.x core features versus planned v2.0.0 milestones.
- 🚀 **[Release Notes](./release-notes)**: Complete release history and feature highlights.

---

::: tip NAVIGATION
Use the left sidebar or the language selector in the top navigation bar to explore topics and switch languages.
:::
