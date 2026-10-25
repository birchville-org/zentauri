---
title: Editor Features & Scholarly Extensions
---

# 📝 Editor Features & Scholarly Extensions

Zentauri integrates custom extensions on top of `markdown-it-extensible` to support complex academic typesetting needs out-of-the-box, ensuring a streamlined authoring flow without context-switching.

---

## 1. Advanced Markdown Extensions

We've extended the standard markdown parser to support unique semantic blocks crucial for grammatical descriptions and literary analysis:

- **Scholarly Containers:** Core Payer-v2 containers (`::: grammar-box`, `::: warning-box`, `::: verse-box`, and `::: note-box`).
- **Footnotes & Definition Lists:** Complete academic footnoting (`[^1]` and `[^1]: Note`) and multi-line definition lists (`Term\n: Definition`).
- **Inline Sanskrit Typography:** Support for Devanāgarī `《...》`, IAST `⟪...⟫`, and danda punctuation (`|`, `||`) mapping to the scholarly font stack (Gentium Plus, Noto Serif Devanagari).
- **Visual Signals:** Direct inline highlights using `:sig[Signal]` and `:mark[Highlight]`.
- **Math & Equations:** Native MathJax/KaTeX syntax `$e^{i\pi} + 1 = 0$` mapped to Typst math environments.
- **Mermaid Diagrams:** Fully supported in the editor live preview.

---

## 2. Interactive Knowledge Graph (Roadmap / Backlog for v2.0.0)

::: info Status: Parked on Roadmap
The interactive Knowledge Graph visualization (`v-network-graph`) is currently parked in the backlog (see [Roadmap & Backlog](./roadmap)) to keep the v1.x core editor lean and performant. Link extraction and database indexing remain active in the Rust backend.
:::

Planned re-integration features:

- Support for bi-directional `[[Wiki Links]]` and standard relative markdown links `[Label](./file.md)`.
- Powered by `v-network-graph` in the frontend, generating a visual, interactive constellation of your notes and scholarly research.
- Double-clicking nodes dynamically navigates your editor straight to the source file.

---

## 3. Auto-Repair & Intelligent Workflows

Zentauri features a built-in Javascript-based syntax repair utility (`auto-repair.ts`) that runs seamlessly and silently on every document save:

- **Silent Auto-Repair:** Fixes minor syntax inconsistencies (like broken container boundaries or malformed YAML) automatically.
- **Visual Feedback:** A subtle UI indicator in the top toolbar verifies that the syntax was repaired without intrusive popups.

---

## 4. Metadata Display

The file explorer natively hooks into the SQLite backend to fetch and display intelligent YAML metadata. Instead of just file names, the explorer dynamically displays parsed document `title`s and visual badges representing localized content (`IAST`, `Devanagari`).

---

## 5. QA Dual-Document Comparison & Heading Sync (Backlog / Reference Feature)

::: info Status: Parked in Backlog (v1.3.0)
The text-based QA reference dual-pane (`QaReferencePane.vue`) was parked in the backlog in v1.3.0 to focus the user interface on the primary 3 Work-Modes (specifically **Mode 3: Dual PDF QA & Proofing**). The modular components and heading synchronization algorithms remain in the repository for specialized corpus collation.
:::

Tailored for translators, scholarly editors, and comparative philology (inspired by the Payer QA Viewer):

- **Dual- & Triple-Pane Layouts (2-Col / 3-Col):** Parallel display of a reference document on the left alongside the active CodeMirror editor (2-Col), or with an additional live preview on the right (3-Col).
- **Instant SWAP:** One-click swapping of reference and active editor documents without losing scroll positions.
- **Intelligent Heading-Based Scroll Synchronization:** Harmonizes scrolling based on Markdown headings (`#`, `##`, `###`), numeric prefixes, and proportional interpolation — eliminating scroll drift across asymmetrical translations. Modes: *Sync: Header*, *Sync: Percentage*, and *Sync: Off*.
- **Bilingual Corpus Navigation:** Automatic heuristic detection of parallel language files (e.g., `de/` ↔ `en/` or `_de.md` ↔ `_en.md`) with one-click selection from the status bar.

