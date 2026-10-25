---
title: Release Notes
---

# 🚀 Zentauri Release Notes

### ZenTauri v1.6.0
- **Dual PDF QA Mode (Modus 3):** Integrated side-by-side vector PDF proofing suite (`PdfDualViewer.vue`) powered by `hayro_svg` with percentage and page-lockstep scroll synchronization, continuous scroll vs. single-page flip mode, zoom scaling, and document swap.
- **File Explorer Open PDFs Group:** Added dedicated comparison slot management (`[1] Ref`, `[2] Comp`) with quick-reveal, slot unload, and automatic activation when clicking `.pdf` files.
- **Consistent Filename Display:** Replaced H1 heading substitution in the file explorer with real disk filenames (`node.name`), matching editor tabs exactly.
- **Bidirectional Explorer Synchronization:** Renaming or deleting files in the workspace tree immediately synchronizes open editor tabs and detaches deleted files safely into untitled buffers.
- **Strategic 3-Work-Modes Toolbar:** Streamlined view navigation to `Source`, `Split`, and `Dual PDF QA`, archiving legacy text-reference QA into the backlog.
- **Type Safety & Portability Hardening:** Fixed auto-repair markdown mutation, typed HTML export options, isolated global keyboard listeners, and eliminated hardcoded machine paths.

---

### ZenTauri v1.5.0
- **Dedicated Editor Formatting Ribbon:** Added an interactive editor ribbon (`EditorRibbon.vue`) providing direct tool groups for headings (H1-H3), typography (bold, italic, strike, inline code), structure (lists, tables, quotes), scholarly callouts (`grammar-box`, `warning-box`, `verse-box`, `note-box`), Sanskrit citation markers (`《...》`), signal highlights, and KaTeX math.
- **Syntax Catalog Dropdown & Transliteration Toggles:** Integrated categorized dropdown select for full cheatsheet access alongside quick-toggle buttons for IAST and Harvard-Kyoto transliteration.
- **Standalone HTML Export (`Cmd/Ctrl+Shift+H`):** Generates self-contained, offline-ready HTML5 documents with embedded Birchville Scholarly Synthesis styles and KaTeX CSS.
- **HTML Multi-MIME Clipboard Copy (`Cmd/Ctrl+Shift+C`):** Copies rendered HTML as rich formatted text (`text/html`) and source (`text/plain`) with graceful fallback and floating toast feedback.
- **Typst PDF Export Math Hardening:** Implemented `TYPST_MATH_BUILTINS` whitelist and automatic text-quoting for multi-letter currency and unit identifiers (`USD`, `EUR`, `CHF`), resolving fatal `unknown variable` compilation errors.
- **LaTeX Macro Normalization:** Resolves `\text`, `\mathrm`, `\operatorname`, and `\sqrt` before fraction parsing, resolving nested brace collisions in `\frac`.
- **Top Header Streamlining:** Removed export controls from the top header to dedicate it strictly to presentation and layout options (Source, Split, 2-Col QA, 3-Col QA, Scroll-Sync, SWAP, Vim Mode).

---

### ZenTauri v1.4.0
- **Didactic v2 Standard & New Containers:** Full integration of the minimal v2 container set from `markdown-it-extensible` v1.4.0 featuring `::: warning-box` (didactic guidance, pitfalls; Birchville Scholarly Terracotta `#ea580c`) and `::: verse-box` (Ślokas, Mantras, metrical texts).
- **Graceful Aliasing for Legacy Containers:** Seamless backward compatibility with automatic aliasing for existing documents (`important` → `.warning-box`, `compact` → `.verse-box`, `literatur-box` / `literatur` → `.note-box`).
- **Single Source of Truth (`containers.ts`):** Consolidated all block container definitions into a central architecture module (`src/lib/containers.ts`), completely eliminating 4-way redundancy across parser, auto-repair, and Typst converter.
- **Typst Native PDF Export:** Robust matching for containers with and without spacing before bracket titles (`::: box [Title]` and `::: box[Title]`), automatic descending length sorting preventing prefix shadowing, and typographical color matching for `warning-box` (Terracotta) and `verse-box`.
- **Performance & Rendering:** Eliminated duplicate container nesting passes in the rendering pipeline for noticeably faster live preview updates.
- **Editor UI & Quick-Snippets:** Added `::: warning-box` and `::: verse-box` directly to the quick-snippet toolbar (`App.vue`) and syntax cheatsheet.

---

### ZenTauri v1.3.4
- **Dual-Track Download & Manual Fallback:** Added resilient direct browser download buttons linking directly to GitHub Releases in both `UpdateNotification.vue` and `Settings.vue`. If the in-app updater fails or encounters permission/sandbox issues, users can immediately download the installer/DMG with one click.
- **Updater Error State Recovery:** Prominent recovery button ("Im Browser herunterladen ↗") rendered whenever update checks or installations encounter errors, preventing users from being locked out.
- **Settings Version Binding:** Fixed `updateVersion` ref binding in Settings template, ensuring version strings render reliably in the release notes view.
- **Repository URL Alignment:** Updated all VitePress documentation and social links from deprecated `marcodem/zentauri` to `birchville-org/zentauri`.
- **CI/CD Manifest Pre-flight Verification:** Added automated pre-flight URL verification (`curl -fsIL`) to the release workflow's `manifest` job, ensuring all platform asset URLs exist before uploading `latest.json`.

---

### ZenTauri v1.3.3
- **Workspace-Boundary & Sandbox Protection (Rust Backend):** Strict workspace boundary verification (`is_within_known_workspace`) for move, duplicate, and delete operations preventing path traversal outside mounted workspaces. Atomic cross-device move with proper error propagation.
- **SQL Wildcard & Query Escaping:** Escaped LIKE query wildcards (`_` and `%`) in directory sync and search queries to prevent unintended pattern matching.
- **XSS & Content Security Sanitization:** Explicitly prohibited `<style>`, `<form>`, `<input>`, `<button>`, `<textarea>`, and `<select>` in DOMPurify configuration to prevent UI spoofing and phishing. Cleaned obsolete custom protocols from CSP.
- **Typst PDF Export (Relative Image Resolution):** Resolved relative image paths against the active document's base directory, fixing broken image embeds in exported Typst PDFs.
- **Graceful Shutdown & Data Integrity:** Controlled application shutdown via system tray (`request-app-quit`), flushing active auto-save debounces and persisting dirty tabs before process exit.
- **File Tree Validation:** Path separator and collision validation for file renaming operations, preventing unintentional file overwrites.
- **CI/CD Quality Gate:** Integrated automated pre-release quality gate (`check`-Job) validating linter, typecheck, unit tests, and backend tests before building release binaries.

---

### ZenTauri v1.3.2
- **Markdown Rendering Engine Upgrade:** Upgraded `markdown-it-extensible` to 1.3.2 and `markdown-it-container` to 4.0.0 from npm registry for robust builds and cross-platform compatibility.
- **XSS Sanitization & Token Streaming:** Automatic HTML-escaping for container titles (`::: box [Title]`) and full Markdown-It token-streaming for Sanskrit brackets (`《...》` / `⟪...⟫`), eliminating raw HTML injection vectors.
- **Inline Directive Hardening:** Added lookbehind protection (`(?<![\w:-])`) and letter-prefix constraints (`:[a-zA-Z]`) to prevent false-positive parsing on time strings (`10:30[Uhr]`) and object/array code accesses (`obj:key[0]`). Added full support for nested brackets in directive payload (`:[sig][Note [1]]`).
- **Nesting Stack & Code-Fence Protection:** Protected nesting parser stack from unclosed external/unknown containers, preventing premature closure of known scholarly blocks. Single-line code fences are accurately tracked.
- **Webview Performance & Stabilität:** Disabled synchronous filesystem lookups (`configFile: false`) in the UI render loop.

---

### ZenTauri v1.3.1
- **File Explorer Layout Refinements:** Constrained sidebar width up to 480px, preventing layout breakage on ultra-wide screens.
- **Horizontal Scrolling:** Clean horizontal scrolling for file tree items and open tabs with long filenames.
- **Sticky Headers:** Action icons and folder headers remain visible during horizontal scrolling.

---

### ZenTauri v1.3.0
- **Academic Footnotes Support:** Full bidirectional footnote navigation (`markdown-it-footnote`) with numerical markers, named citations (`[^ref]`), footnote separator styling, and return backlink jumps (`↩`).
- **Definition Lists Support:** Standards-compliant term definition parsing (`markdown-it-deflist`) for scholarly glossaries, grammatical terminology, and lexicons using `<dl>`, `<dt>`, and `<dd>` semantics.
- **Syntax Cheatsheet Integration:** Dedicated footnote snippet template added to the quick-insert snippet bar and syntax reference (`syntax-cheatsheet.ts`).
- **Bilingual Documentation:** Full English documentation with dedicated German localization (`/de/`), structured roadmap/backlog separation, and Birchville portal navigation integration.
- **Default Editor Showcase:** Updated interactive welcome document demonstrating scholarly footnotes and definition lists out of the box.

---

### ZenTauri v1.2.0
- **QA Reference Dual-Document Mode:** Dedicated side-by-side workspace comparison view (`QaReferencePane.vue`). Offers 2-column (Reference vs. Editor) and 3-column layouts (Reference, Editor, Live Preview) with instant SWAP functionality.
- **Intelligent Heading Scroll Synchronization (`heading-sync.ts`):** High-precision scroll alignment based on Markdown headings (`#`, `##`, `###`), preventing scroll drift across asymmetric translations (e.g. Sanskrit verse vs. expanded English/German commentary). Modes: *Sync: Header*, *Sync: Percentage*, *Sync: Off*.
- **Automatic Language Version Matching (`language-detector.ts`):** Heuristic detector that discovers matching language siblings across directory conventions (`/de/` ↔ `/en/`) and file naming suffixes (`_de.md` ↔ `_en.md`).
- **Harvard-Kyoto & IAST Sanskrit Transliteration:** Bidirectional conversion between Harvard-Kyoto (HK) and IAST with Devanāgarī. Global keyboard shortcuts `⌥⌘H` (HK) and `⌥⌘D` (IAST) plus toolbar triggers.
- **Tag-Safe Directive Transliteration:** Custom directive isolation for `:sig[...]` and `:mark[...]`, preserving markup containers while safely converting enclosed payload and surrounding prose.
- **Interactive Status Bar (`StatusBar.vue`):** Live indicators for line/column, character/word count, active scroll-sync mode, and one-click transliteration toggles.
- **Birchville "Scholarly Synthesis" Design:** Harmonized warm ivory & deep ink light mode, candlelit dark mode, and frosted-glass headers.

---

### ZenTauri v1.1.23
- **Tab Management & Unsaved Changes Protection:** Closing modified tabs with auto-save disabled opens a native 3-way dialog (Save, Don't Save, Cancel) via Tauri Dialog. New tab bar context menu on right-click (Close, Close Others, Close to the Right, Copy Path, Reveal in Finder).
- **Filesystem Synchronization (Rust-First Watcher):** Integrated the native Rust `notify` crate to recursively watch mounted workspaces. Streams debounced `workspace-fs-changed` events to keep the file tree in sync.
- **Typst PDF Export & Sanskrit Typography:** Robust Devanagari font cascade (`Kohinoor Devanagari`, `Noto Sans Devanagari`, `Noto Serif Devanagari`, `Devanagari MT`) for seamless ligatures and accents. Configurable page formats (A4 / US Letter) in Settings.
- **Finder & CLI Integration:** Double-clicking files in Finder or launching via CLI automatically replaces untouched empty drafts.
- **Performance & Code-Splitting:** Code-split heavy diagram and rendering libraries (Mermaid, KaTeX, Cytoscape), reducing the entry chunk from 2.2 MB to 491 kB.

---

### ZenTauri v1.1.22
- **Security & Path Validation (PDF Export):** Strict hardening of `export_pdf` against directory traversal and arbitrary writes. Validates null bytes, `.pdf` extension, sensitive directories (`.ssh`, `.gnupg`), and system roots.
- **Data Integrity & SQLite Cleanup on Deletion:** Native Rust command `delete_file_item` atomic deletion of files, folders, and SQLite records. Recursive directory synchronization with pruning.
- **Tauri Capabilities Cleaned:** Streamlined `fs:read-all` and `fs:write-all` capabilities.
- **Performance & LRU Caching:** Converted `markdownRenderCache` to true O(1) LRU eviction.
- **UX & Lifecycle State:** `autoSave.cancel()` and deterministic cleanup in `beforeunload` prevent dirty state drops or dangling timers.

---

### ZenTauri v1.1.21
- **Release Notes Display in Update Popup & Settings:** Interactive "What's new in vX.Y.Z?" accordion in update popup and Settings dialog, rendered with safe sanitization via DOMPurify.
- **CI/CD Hardening:** Updater manifest generation waits strictly on all release artifacts and cryptographic signatures across Darwin, Windows, and Linux.

---

### ZenTauri v1.1.20
- **Background Update Checks & 1-Click Installation:** Automatic check at launch (delayed by 4 seconds) and recurring every 4 hours. Frosted-glass notification banner with progress and 1-click relaunch.
- **Linux ARM64 Packaging:** Added native GitHub Actions packaging for `linux-aarch64` (AppImage and compressed archives).

---

### ZenTauri v1.1.19
- **Editor Data Integrity & Tab State:** Zero buffer drops on tab switching; autosave cleanly separated from auto-repair.
- **Security Sandbox:** Strict CSP without `unsafe-eval`; dynamically scoped filesystem access (`fs_scope().allow_directory`).
- **Typst PDF Math Formulae:** LaTeX math expressions translated into native Typst math syntax.
- **Live Preview Performance:** Migrated CodeMirror live preview to `ViewPlugin` with `view.visibleRanges` viewport virtualization.

---

### ZenTauri v1.1.18
- **macOS System Directory Protection:** Opening standalone files no longer mounts user home or Desktop as workspaces, eliminating TCC permission dialogs.
- **CLI & Working Directory Auto-Detection:** Automatically mounts current working directory when launched from terminal.
- **Birchville Design & Layout:** Cleaned up documentation layout, sidebar carets, and typography.
