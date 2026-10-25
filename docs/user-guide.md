---
title: ZenTauri Philological Workbench — User Manual
---

# 📖 ZenTauri Philological Workbench — User Manual

> **An integrated, native desktop workbench for digital humanities: Scholarly authoring (EN/DE/SA), synoptic Master-JSON critical editions, and dual-vector PDF collation.**

---

## 🏛️ Introduction & Product Philosophy

The **ZenTauri Philological Workbench** was born out of real-world editorial challenges in major digital humanities projects (such as the *Payer Sanskrit Course* and the synoptic critical edition of the *Bṛhadāraṇyaka-Upaniṣad*). It is neither a generic markdown notepad nor a bloated office suite, but a **specialized precision environment for scholarly textual editing**.

### The Conventional Word Processing Dilemma (MS Word & Co.)
In academic editing and translation, philologists frequently resort to Microsoft Word simply due to a lack of viable alternatives. However, when applied to critical edition workflows, traditional word processors fail consistently:
1. **Font Mixing & Script Chaos:** Mixing European languages with Sanskrit (IAST diacritics, Vedic accents, Devanāgarī script) causes jumping line heights, broken ligatures, and unpredictable font substitutions.
2. **Collation & Synoptic Fragility:** Multi-column alignments (e.g. Scan ⇄ Original text ⇄ Translation ⇄ Critical Apparatus) break across page boundaries.
3. **Multi-Tier Apparatus:** Managing manuscript variants, parallel testimonies, and philological commentary simultaneously overwhelms standard footnote engines.
4. **The TEI-XML Dilemma:** While standard TEI-P5 XML is universally required by research libraries and archives, manually authoring raw XML tags during drafting is painfully tedious and error-prone.

### The Four Core Principles of ZenTauri

ZenTauri addresses these challenges through four foundational principles:

1. **The 3 Work-Modes Architecture (Functional Separation):**
   Rather than cluttering the screen with every conceivable tool, the Activity Bar toggles between three distinct modes:
   - **Mode 1 (Authoring):** Fast, distraction-free writing in extended scholarly Markdown.
   - **Mode 2 (Synoptic Edition & Master-JSON):** Segmented editing of historical scanned editions (`book.json` / AST format) in split-pane (Scan PDF on the left ⇄ structured segment editor on the right).
   - **Mode 3 (Dual PDF QA & Proofing):** Dual-vector PDF comparison (original scan vs. re-typeset edition) with visual bounding-box annotations and 1-click AI correction prompts.

2. **Dual Data Architecture (The Two Philological Text Types):**
   - *Text Type A (Linear Running Prose: Lessons, notes, essays):* Stored canonically as pure **Markdown**.
   - *Text Type B (Segmented Corpora & Historical Editions like Böhtlingk or Bṛhadāraṇyaka):* Stored canonically as structured **Master-JSON (`book.json`)**.
   Each text type possesses its own natural, immutable *Single Source of Truth*.

3. **Plain Text First & Interoperability (Compilation over Manual Tagging):**
   Scholars never type raw TEI-P5 XML or unstable OOXML binary schemas by hand.
   - **DOCX files** are automatically ingested and sanitized into clean Markdown via a native Rust/Pandoc pipeline.
   - **Publisher DOCX manuscripts** (*Gentium Plus* / *Noto Serif Devanagari*), **standard TEI-P5 XML**, **Typst academic PDFs**, and **web synopses** are compiled on-demand as downstream distribution targets.

4. **Rust-First Desktop Core:**
   Zentauri ships as a lightweight ~30 MB native binary on macOS, launching instantaneously without heavy Node.js or Chromium runtime overhead. PDF rendering is vector-based SVG (`hayro_svg`), and workspace indexing runs on an embedded SQLite database.

---

## 🗺️ User Manual Chapter Outline

This manual is organized into six comprehensive parts. Active features are immediately available, while upcoming modules are clearly designated by their roadmap status:

### Part I: Fundamentals & Workspace
- **Chapter 1: Installation & Workspace Architecture** (System requirements, project folders, local SQLite index)
- **Chapter 2: User Interface & Navigation** (Activity Bar, File Explorer, document search, split-pane ergonomics)

### Part II: Work-Mode 1 — Scholarly Authoring (Markdown)
- **Chapter 3: Scholarly Markdown & Container Boxes** (Grammar boxes, Payer syntax, Danda punctuation, table line breaks via `:br`)
- **Chapter 4: Multilingual Input & Sanskrit Typography** (IAST, Devanāgarī brackets `《...》`, transliteration shortcuts `⌥⌘D` / `⌥⌘H`, live IME)
- **Chapter 5: Math, Diagrams & Hyperlinking** (KaTeX formulas, Mermaid diagrams, footnotes `[^1]`, definition lists)
- **Chapter 6: Compilation & Export** (Native Typst PDF compilation, standalone HTML export adhering to Modern Web Guidance)

### Part III: Work-Mode 2 — Synoptic Master-JSON Edition *(Roadmap)*
- **Chapter 7: Master-JSON Concept (`book.json`)** (The Bṛhadāraṇyaka edition architecture as an AST Single Source)
- **Chapter 8: Split-Pane Collation Layout** (Historical PDF scan on the left ⇄ structured segment inputs on the right)
- **Chapter 9: Segment-Based Fields** (Devanāgarī, IAST, translations, critical variants, philological apparatus)
- **Chapter 10: Silent Auto-Repair & Validation** (Background auto-repair of quotation marks, dandas, and JSON syntax on save)
- **Chapter 11: TEI-P5 XML & Synoptic HTML Compilation** (Automated generation of `<ab>`-aligned TEI archives and web presentations)

### Part IV: Work-Mode 3 — Dual PDF QA & Proofing *(Active / In Development)*
- **Chapter 12: Dual-Vector Synchronous Viewer** (Loading parallel PDFs, one-click SWAP control)
- **Chapter 13: Scroll Synchronization Modes** (Percentage scroll, page lockstep, heading matching)
- **Chapter 14: Normalized Bounding-Box Annotations** *(Conceived)* (Click-and-drag overlays on vector SVGs with relative coordinates)
- **Chapter 15: Web-First AI Correction Bridge** *(Conceived)* (1-click clipboard prompt for Claude, ChatGPT, and Gemini)
- **Chapter 16: Flattened Annotated PDF Export** *(Conceived)* (Embedded markings for human reviewers and multimodal vision models)

### Part V: Interoperability & Word Workflows
- **Chapter 17: DOCX Ingest (Import & Sanitization)** *(Conceived)* (Stripping Word styling debris, Unicode NFC normalization)
- **Chapter 18: DOCX Export (Publisher Manuscripts)** *(Conceived)* (Scholarly Reference Template with *Gentium Plus* & footnotes)
- **Chapter 19: Track Changes & CriticMarkup** *(Conceived)* (Visual editorial reviews via `{++added++}`, `{--deleted--}`, `{>>notes<<}`)

### Part VI: Configuration & Reference
- **Chapter 20: Stylesheet Customization (`custom.css`)** (Birchville Scholarly Synthesis design tokens, custom containers)
- **Chapter 21: Keyboard Shortcuts & Productivity Cheatsheet** (Complete shortcut reference for macOS and Windows/Linux)

---

## 🛠️ Practical Guide to Active Features

### 1. User Interface & File Tree (Part I)
- **Activity Bar:** Quickly switch between File Explorer, Workspace Search, Cheatsheet, and Work-Modes.
- **Split-Pane:** Synchronized live preview pairing CodeMirror 6 with the rendered HTML output.
- **Inline Renaming:** Rename notes and folders inline in the tree without popups (`Enter` commits, `Escape` cancels).

### 2. Scholarly Container Blocks (Mode 1)
Zentauri provides built-in Payer-compliant container boxes:

::: grammar-box
**Grammar Paradigm:**
devo viṣṇuḥ = ⟪देवो⟫ ⟪विष्णुः⟫ = "Viṣṇu is a god."
:::

- `::: grammar-box`: Golden border for morphological paradigms and sound laws.
- `::: warning-box`: Terracotta/red border for didactic alerts and linguistic pitfalls.
- `::: verse-box`: Indented block for Ślokas, mantras, and metrical schemas.
- `::: note-box`: Slate navy box for philological observations and citations.
- `::: indent`, `::: center`, `::: media`, `::: no-header`: Structural layout blocks.
- `::: info`, `::: tip`, `::: warning`, `::: danger`, `::: details`: Standard VitePress alerts.
- Backward-compatibility aliases: `grammar-box2` (secondary paradigm), `important` (`warning-box`), `literatur-box` (`note-box`), `compact` (`verse-box`).

### 3. Sanskrit Typography & Hotkeys (Mode 1)
- **Devanāgarī CJK Brackets:** Any text enclosed in `《धर्मक्षेत्रे कुरुक्षेत्रे》` or `⟪...⟫` is highlighted and rendered in the Devanāgarī font stack.
- **Bidirectional Transliteration:**
  - `⌥⌘D` (Option+Cmd+D): Toggle selection between **IAST** (`kṛṣṇaḥ`) and **Devanāgarī** (`कृष्णः`).
  - `⌥⌘H` (Option+Cmd+H): Toggle selection between **Harvard-Kyoto** (`kRSNaH`) and **Devanāgarī**.
- **Footnotes & Definition Lists:**
  - Standard footnotes using `[^1]` inline and `[^1]: Footnote body` at the bottom.
  - Lexical definition lists via `Term\n: Definition`.

### 4. Dual PDF QA: Vector Synchronous Viewer (Mode 3)
- **Synchronized Collation:** Load two PDFs side-by-side using the `PdfDualViewer` component.
- **Rust Vector Precision:** Pages are compiled as SVG via `hayro_svg` — preserving razor-sharp typography at any zoom level.
- **Sync Modes:**
  - `% (Percentage):` Both panes scroll proportionally relative to their overall scroll height.
  - `Page (Lockstep):` Both panes lock to the identical page number.
  - `Off:` Independent scrolling.
- **SWAP Control:** Instantly flip left and right panes with a single click.

### 5. Custom Styling (`custom.css`)
Override colors, fonts, and container styles via `~/.config/zentauri/custom.css` (macOS/Linux) or `%APPDATA%\zentauri\custom.css` (Windows):

```css
/* Custom styling for grammar boxes */
.vp-doc .custom-block.grammar-box,
.grammar-box {
  background-color: #fcf9f2 !important;
  border-left-color: #b45309 !important;
}
```
