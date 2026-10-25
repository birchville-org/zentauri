# Zentauri

> **ZenTauri is a native desktop workbench for scholarly Sanskrit editions, multilingual authoring (DE/EN/SA), and critical text collation. It combines a lightweight Markdown editor with custom grammar extensions, KaTeX math rendering, and multi-pane alignment tools for digital humanities.**

📚 **Online Documentation & Technical Wiki:** [https://birchville-org.github.io/zentauri/](https://birchville-org.github.io/zentauri/)

Zentauri is a lightweight (ca. 30MB on Mac), high-performance philological desktop environment. Built with Tauri and Vue 3, it originated as a standalone editor for the Payer Sanskrit Course and evolved into an integrated three-pillar workbench:

> [!NOTE]
> **The 3 Work-Modes of Zentauri**
> 1. **✍️ Markdown Authoring (Active):** High-speed writing of Sanskrit grammar lessons, notes, and scholarly articles with custom container boxes (`::: grammar-box`, `::: note-box`), Sanskrit Devanāgarī bracket highlighting (`《...》`), and bidirectional transliteration.
> 2. **📜 Synoptic Edition & Master-JSON (Planned):** Structured editing of scanned historical editions (`book.json` / AST format as in the *Bṛhadāraṇyaka-Upaniṣad* project). Split-pane alignment pairing historical scans (PDF) with segmented field inputs for Devanāgarī, IAST, translation, and critical apparatus without brittle TEI-XML manual markup.
> 3. **🔍 Dual PDF QA & Proofing (In Development):** Synchronized dual-vector PDF comparison (original vs. re-typeset edition) with normalized bounding-box annotations, 1-click clipboard prompt generation for LLMs, and annotated PDF export.

If you wish to explore the full architecture, developer notes, and syntax extensions, visit the [Documentation Wiki](https://birchville-org.github.io/zentauri/).

---

## Tech Stack

- **Tauri** — Blazing fast desktop execution with a secure Rust backend.
- **Vue 3** — Highly reactive and responsive component-driven interface.
- **CodeMirror 6** — Modern, modular, and extensible editor experience.
- **Tailwind CSS v4** — Premium styling system with dark mode and custom palettes.
- **markdown-it** — Custom extensible Markdown parsing and rendering pipeline.

---

## Key Features

### 📂 Premium IDE-Style File Explorer

- **Popup-Free File Editing:** Create new files, folders, or rename existing nodes inline using smooth text fields that confirm on `Enter`/`Blur` and cancel on `Escape`.
- **File-Type Specific Icons:** Distinct visual cues for Markdown files, PDF documents, local images, and settings/config files.
- **Header Toolbar:** One-click shortcuts to **Collapse All** directory folders and **Refresh** the current workspace path.
- **Workspace Sync:** Clicking on open editor tabs automatically highlights and expands folders to reveal that file in the explorer tree.

### 🔍 Search in File Panel

- **Document-Level Search:** Accessible via the magnifying glass in the Activity Bar.
- **Live Previews:** Displays matching lines with line numbers and highlights the search term visually.
- **Case-Sensitivity Filter:** Toggle precise case matching.
- **Quick-Jump Integration:** Clicking a search result instantly scrolls CodeMirror 6 and anchors the cursor to that line.

### ✍️ Custom Scholarly Markdown Rendering

- **Sanskrit Devanagari Highlighting:** Matches word boundaries wrapped in CJK double brackets `《Sanskrit-Text》` and highlights them in Sanskrit-Red.
- **Custom Container Blocks:** Implements Payer-compatible style containers:
  - `:::grammar-box` (gold border)
  - `:::grammar-box2` (orange border)
  - `:::important` (purple border)
  - `:::note-box` (blue-grey border)
  - `:::literatur-box` (bibliographic data)
- **VitePress Standard Containers:** Provides rendering for VitePress standard containers:
  - `:::info`, `:::tip`, `:::warning`, `:::danger`, `:::details`
- **Scientific Extensions:** Full support for KaTeX math equations (inline & block), Mermaid structural diagrams, and GitHub Flavored Markdown (GFM) tables.
- **Local Asset Integration:** Renders local images, videos, and PDFs directly in the live preview.

### 🎨 Custom Stylesheet (User Empowerment)

- **External Configuration:** Users can define their own CSS overrides (like `font-family` or UI colors) in a `custom.css` file located in the application's local config directory.
- **Auto-Template:** If the `custom.css` file does not exist, Zentauri automatically generates a helpful template on startup to guide the user.

---

## Documentation

Comprehensive architecture guides, scholarly feature specifications, and technology stack overviews are published at:
👉 **[https://birchville-org.github.io/zentauri/](https://birchville-org.github.io/zentauri/)**

- 📐 **[System Architecture](https://birchville-org.github.io/zentauri/system-architecture)**: Rust-First backend, SQLite workspace indexing, Typst native PDF export pipeline.
- 📝 **[Scholarly Extensions](https://birchville-org.github.io/zentauri/scholarly-features)**: Specialized containers, Devanagari highlighting, and interactive knowledge graph.

---

## Development

### Prerequisites

Make sure you have Node.js and Rust/Cargo installed.

### Setup and Running Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Tauri development server:

   ```bash
   npm run tauri dev
   ```

### Building for Production

To bundle Zentauri into a native desktop package (.app, .dmg, .msi, etc.):

```bash
npm run tauri build
```

## Releases & Build Artifacts

The desktop applications are automatically compiled via GitHub Actions with every release (triggered by pushing a version tag such as `v*`). The following installer files are generated as build artifacts:

- 🍎 **macOS:** Universal `.dmg` & `.app` (compatible with Apple Silicon M1/M2/M3 and Intel processors).
- 🪟 **Windows:** Standalone `.msi` installers and `.exe` binaries.
- 🐧 **Linux:** Debian package (`.deb`) and portable AppImage (`.AppImage`).

You can find the compiled binaries in the GitHub repository under the **Releases** tab.

---

## License

MIT
