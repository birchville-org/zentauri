---
layout: doc
title: Zentauri — Technische Dokumentation
---

# 🌌 Zentauri — Technische Dokumentation

Willkommen zur offiziellen Dokumentation für **Zentauri**, der integrierten Desktop-Workbench für die Digital Humanities (Sanskrit-Philologie, mehrsprachiges Authoring und kritische Textkollation).

::: note-box
**Die 3 Work-Modes von Zentauri**:
1. **Modus 1 (Markdown Authoring):** Philologisches Schreiben mit Payer-v2-Containern (`grammar-box`, `warning-box`, `verse-box`, `note-box`), IAST/Devanāgarī-Klammern (`《...》`, `⟪...⟫`), KaTeX-Formelsatz und nativem Typst-PDF-Export.
2. **Modus 2 (Synoptische Edition & Master-JSON):** Segmentierte Bearbeitung historischer Scans (`book.json` / AST-Format) im synchronen Split-Pane (Scan-PDF links ⇄ strukturierte Felder für Devanāgarī, IAST, Apparat und Übersetzung rechts).
3. **Modus 3 (Dual PDF QA & Proofing):** Vektorbasiertes 2-Spalten-PDF-Kollationieren (`hayro_svg`) mit relativen Bounding-Box-Annotationen und 1-Klick-Clipboard-Prompt für multimodale KIs.
:::

---

## 🎯 Primärzweck: Multi-Purpose Philologische Suite

Zentauri verbindet fokussiertes Markdown-Authoring mit strukturierter Korpus-Edition und visuellem Proofing:
1. **Markdown & Semantisches HTML:** Die Textauszeichnung wird verlustfrei und standardisiert in HTML überführt – ideal für Webseiten, VitePress-Dokumentationen und digitale Lehrbücher.
2. **Medienneutrales didaktisches Layout:** Statt manueller DTP-Layouts bietet Zentauri eine kuratierte Auswahl semantischer Direktiven (Scholarly Boxes, Einrückungen, Inline-Signalmarkierungen, Textzentrierung und MultiMarkdown-Spans).
3. **Typst-PDF-Export:** Blitzschneller akademischer Buchsatz direkt über das native Rust-Backend ohne Chromium-Ballast.

---

## 🏛️ Kernsäulen

| Kernsäule | Technologie | Status & Zielsetzung |
| :--- | :--- | :--- |
| 🦀 **Rust-First Architektur** | Tauri v2, Rust, SQLite | **Aktiv** — Maximale Performance, minimaler Speicherverbrauch und native OS-Integration |
| 📝 **Scholarly Editing (Modus 1)** | Vue 3, CodeMirror 6, markdown-it-extensible | **Aktiv** — Split-Pane Authoring, Payer-v2 Container, Fußnoten, Silent Auto-Repair und Metadaten |
| 📜 **Synoptische Edition (Modus 2)** | Master-JSON (`book.json`), Scan Split-Pane | **Roadmap (v2.1.0)** — Segmentbasierte Bearbeitung historischer Drucke und Scans |
| 🔍 **Dual PDF QA (Modus 3)** | `hayro_svg`, Bounding-Boxes, KI-Prompt | **Aktiv / Roadmap (v2.0.0)** — 2-spaltiger Vektor-PDF-Vergleich und visuelles Proofing |
| 🖨️ **Nativer PDF-Export** | Typst (`typst-as-lib`) | **Roadmap** — Direkter akademischer Buchsatz nativ in Rust ohne Chromium oder Node.js |
| 🕸️ **Knowledge Graph** | SQLite Indexing, `v-network-graph` | **Backlog** — Visuelle Darstellung von Verknüpfungen (Indexierung aktiv, UI-Ansicht geparkt) |

---

## 📌 Dokumentationsübersicht

### Erste Schritte
- 💻 **[Installation & Setup](./installation)**: Anleitung für macOS (Gatekeeper-Freigabe), Windows und Linux sowie automatische Updates.
- 📖 **[Benutzerhandbuch & Custom CSS](./user-guide)**: Bedienung des Editors, Erstellen eigener Syntax-Elemente und Anpassung via `custom.css`.

### Architektur & Technik
- 📐 **[System-Architektur](./system-architecture)**: Rust-First File-Explorer, IPC-Kommunikation, SQLite-Indexierung und Typst-PDF-Pipeline.
- ⌨️ **[Sanskrit-Eingabearchitektur](./scholarly-input-architecture)**: 3-stufiges Hybridkonzept, In-Editor IME und Tastatur-Shortcuts.
- 📝 **[Scholarly Features](./scholarly-features)**: Container-Blöcke (`::: grammar-box`), Fußnoten, Devanāgarī-Formatierung und QA-Vergleichsmodus.
- 📋 **[Roadmap & Backlog](./roadmap)**: Gegenüberstellung aktiver Funktionen versus geplanter Meilensteine für Version 2.0.0.
- 🚀 **[Release Notes](./release-notes)**: Versionshistorie und Feature-Übersicht von v1.0 bis v1.2.0.

---

::: tip HINWEIS
Nutzen Sie die linke Navigationsleiste oder die Sprachauswahl im Kopfbereich, um direkt zwischen Themen und Sprachen zu wechseln.
:::
