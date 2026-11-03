---
title: Roadmap & Feature-Backlog
---

# 🗺️ Roadmap & Feature-Backlog

Dieses Dokument erfasst geplante Ausbau-Features, Architekturkonzepte und vorläufig zurückgestellte Funktionen für künftige Versionen (Ziel: **ZenTauri v2.0.0 & v2.1.0**).

---

## 📌 Statusübersicht der Features

| Funktion | Aktueller Status | Zielversion | Beschreibung |
| :--- | :--- | :--- | :--- |
| **Nativer Typst-PDF-Export** | ✅ **Aktiv (v1.7.0+)** | v1.7.0 | Reiner Rust-Typst-Satz im Backend (`typst-as-lib`, `typst-pdf`, STIX Two Text Fontstack) |
| **Office- & DOCX-Ingest** | ✅ **Aktiv (v1.8.0)** | v1.8.0 | Pure-Rust Ingest (`docling-rs`) für `.docx`, `.odt`, `.rtf`, `.epub` mit Unicode NFC-Normalisierung |
| **Dual PDF QA Vektor-Viewer** | ✅ **Aktiv (v1.7.0+)** | v1.7.0 | Rust-First Vektor-Synchron-Viewer (`hayro_svg`, %/Seiten-Lockstep, SWAP, Dateiverknüpfungen) |
| **Editor-Trenner & Soft-Wrap** | ✅ **Aktiv (v1.8.2)** | v1.8.2 | Verschiebbare Split-Trennlinie (50/50-Reset) & CodeMirror 6 automatischer Zeilenumbruch |
| **Datei duplizieren & Befehl wiederholen** | ✅ **Aktiv (v1.8.1)** | v1.8.1 | Native Dateiduplizierung (`⌘⇧D`) und Befehlswiederholung (`⌘Y` / `Ctrl+Y`) mit Undo-Synchronisation |
| **Harvard-Kyoto & IAST Shortcuts** | ✅ **Aktiv (v1.2.0)** | v1.2.0 | Bidirektionale Tastenkürzel `⌥⌘D` & `⌥⌘H` mit Tag-geschützter Transliteration |
| **Wissenschaftliche Fußnoten & Deflists** | ✅ **Aktiv (v1.2.0)** | v1.2.0 | Standard `[^1]` Fußnoten und `Begriff\n: Definition` Definitionslisten |
| **Dual PDF QA Annotationen & KI** | 📋 **Backlog / Konzipiert** | v2.0.0 | Bounding-Box Overlays auf SVG-Seiten & 1-Klick Clipboard-Prompt für Web-LLMs |
| **In-Editor Live-IME (Stufe 2)** | 📋 **Backlog / Konzipiert** | v2.0.0 | CodeMirror-Echtzeitwandlung in `《...》` und Compose-Sequenzen im Fließtext |
| **Wissensgraph & Wikilinks** | 📋 **Backlog / Pausiert** | v2.0.0 | Re-Integration des Graphen, `[[`-Autovervollständigung und Cmd+Klick-Navigation |
| **Synchrone Diagramme (Pele)** | 📋 **Backlog / Evaluation** | v2.0.0 | Verzögerungsfreier, synchroner Mermaid-kompatibler Renderer via `pele.run` (~2,5 MB Ersparnis) |
| **DOCX-Export & CriticMarkup** | 📋 **Backlog / Konzipiert** | v2.1.0 | Akademisches `.docx`-Verlags-Exporttemplate und CodeMirror CriticMarkup Track-Changes |
| **Synoptischer Master-JSON (Modus 2)** | 📋 **Backlog / Konzipiert** | v2.1.0 | Split-Pane-Editor für historische Editionen (`book.json` AST-Format nach Bṛhadāraṇyaka) |
| **QA Reference Dual-Pane** | 📋 **Backlog / Pausiert (v1.3.0)** | v2.2.0 | Textbasierter 2-Spalten-Vergleich (in v1.3.0 zugunsten von Modus 3: Dual PDF QA zurückgestellt) |

---

## 1. Nativer Typst-PDF-Compiler

- **Status:** ✅ **Aktiv / Implementiert** (`src-tauri` via `typst-as-lib` & `typst-pdf`; STIX Two Text Standard in v1.8.0)
- **Ziel:** Vollständige Ablösung der WebKit-basierten Druckfunktion durch blitzschnellen, nativen PDF-Satz direkt über die Typst-Compiler-Engine in Rust (`⌘P`).

### Umgesetzte Meilensteine:
1. **Direktes AST-Mapping (✅ Aktiv):** Übersetzung von Markdown-Elementen, Payer-Containerboxen, KaTeX-Formeln, Tabellen und Fußnoten in semantischen Typst-Code.
2. **Akademisches Satzlayout & Fontstacks (✅ Aktiv):** Automatische Paginierung, Ränder, Fußnoten und der Birchville Scholarly Fontstack (*STIX Two Text*, *Gentium Plus*, *Noto Serif Devanagari*).
3. **Plattformunabhängig & leicht (✅ Aktiv):** Keine Chromium- oder Node.js-Abhängigkeiten.
4. **Zukunftserweiterungen (📋 Ziel: v2.0.0):** Benutzerdefinierte Typst-Vorlagenauswahl und mehrstufiger textkritischer Apparat.

---

## 2. In-Editor Live-IME (Stufe 2 des Sanskrit-Hybridkonzepts)

- **Status:** Geplant / Architektur dokumentiert in [Sanskrit-Eingabearchitektur](./scholarly-input-architecture)
- **Ziel:** Kontextbezogene Echtzeit-Transliteration direkt im CodeMirror-Editor ohne Wechsel des Betriebssystem-Tastaturlayouts.

### Gliederung der Stufen:
- **Stufe 1 (Kanonische Speicherung):** ✅ *Aktiv* — Markdown-Dateien speichern immer standardkonformes IAST oder Unicode Devanāgarī.
- **Stufe 2 (In-Editor Live-IME):** 📋 *Geplant / Roadmap*
  - **Scope-basierter Live-IME:** Beim Tippen innerhalb von Sanskrit-Klammern (`《...》` oder `⟪...⟫`) wird 7-Bit Harvard-Kyoto (`kRSNaH`) in Echtzeit zu IAST (`kṛṣṇaḥ`) oder Devanāgarī (`कृष्णः`) transformiert.
  - **Compose-Sequenzen:** Schnelle Tastenkürzel im Fließtext (`.r` => `ṛ`, `-a` => `ā`, `~n` => `ñ` etc.).
- **Stufe 3 (Post-Hoc Transliteration):** ✅ *Aktiv* — Globale Shortcuts `⌥⌘D` und `⌥⌘H` für markierte Abschnitte.

> [!NOTE]
> **Kompatibilität mit OS-Tastaturlayouts:** Direkte Eingaben über installierte OS-Layouts (z. B. EasyUnicode) werden transparent durchgereicht und zu 100 % unterstützt.

---

## 3. Wissensgraph & Bidirektionale Wikilinks

- **Status:** Backlog (zur Verschlankung des Editors und Reduktion der Bundle-Größe um ~600 kB vorläufig aus der UI entfernt)
- **Komponenten:** `src/components/GraphView.vue`, `src-tauri/src/db.rs` (SQLite Workspace Indexer)

### Geplante Ausbaustufen bei Wiederaufnahme:
1. **Editor-Autovervollständigung für Wikilinks (`[[`):** Fuzzy-Suche beim Tippen von `[[` im CodeMirror-Editor.
2. **Quelltext-Navigation (`Cmd+Klick`):** Direktes Öffnen verlinkter Dateien per Tastaturklick.
3. **Backlinks-Inspektor:** Einblendung eingehender Referenzen in der Sidebar.
4. **Graph-Filter & Orphan-Erkennung:** Isolierung verwaister Notizen.

---

## 4. Dual PDF QA & Proofing (Work-Mode 3)

- **Status:** ✅ **Kern-Vektor-Viewer Aktiv (v1.7.0+)** / 📋 **Visuelles Proofing & KI-Bridge im Backlog (v2.0.0)**
- **Ziel:** Synchronisierter 2-Spalten-Vektor-PDF-Vergleich von Neusatz-Ausgaben gegen historische Druckscans mit KI-unterstützter Korrekturführung.

### Aktive Kernfunktionen (v1.7.0+):
- **Hochpräzises Vektor-Rendering:** Direkter SVG-Satz von PDF-Seiten via `hayro_svg` in Rust mit ID-Scoping und randscharfem Zoom.
- **Synchroner Dual-Viewer:** Prozentuales Scrollen und Seiten-Lockstep, SWAP-Seitentausch und Breitenanpassung.
- **Systemintegration:** Dateiverknüpfungen und Direktstart via macOS Finder („Öffnen mit...“) sowie Terminal-CLI.

### Geplante Proofing-Erweiterungen (Ziel: v2.0.0):
1. **Normalisiertes Bounding-Box Overlay:** Klick- und Zieh-Markierungen auf den gerenderten SVG-Vektorseiten (`hayro_svg`) mit relativen Prozent-Koordinaten.
2. **Web-First KI-Prompt-Generator:** 1-Klick-Übernahme eines strukturierten Markdown-Prompts (Quelltext + Korrekturtabelle) ins Clipboard für Claude, ChatGPT und Gemini Web.
3. **Annotierter PDF-Export & Automation:** Export als visuell eingebranntes PDF sowie optionale lokale Ollama-Diff-Korrektur.

---

## 5. Synoptischer Master-JSON Editor (Work-Mode 2)

- **Status:** Backlog / Konzipiert (Inspiriert durch das Editions-Projekt *Bṛhadāraṇyaka-Upaniṣad*)
- **Ziel:** Segmentierte Split-Pane-Bearbeitung historischer Scanausgaben (`book.json` / AST-Format) ohne fehleranfälliges manuelles TEI-XML-Taggen.

### Geplante Funktionen:
1. **Split-Pane Scan-Synchronisation:** Historischer PDF-Scan links, strukturierte Segment-Eingabe rechts.
2. **Segmentbasierte Felder:** Isolierte Eingaben für Devanāgarī, IAST, Übersetzungen, textkritische Varianten (z. B. Slaje vs. Böhtlingk) und Lemmata.
3. **Automatisierte Export-Pipeline:** Native Rust-Kompilierung aus dem Master-JSON nach standardkonformem TEI-P5 XML (`<ab>`-Parallelität) und Typst-PDF.

---

## 6. DOCX-Interoperabilität & CriticMarkup (Word-Brücke)

- **Status:** ✅ **Ingest Aktiv (v1.8.0 via `docling-rs`)** / 📋 **Export & CriticMarkup auf Roadmap (v2.1.0)**
- **Ziel:** Verlustfreie Brücke zu Microsoft Word-zentrierten Verlagen und Gutachtern unter dem strikten Prinzip **Plain Text First**.

### Implementierte Ingest-Architektur (v1.8.0):
- **Plain Text als Kanon:** Markdown ist die persistente *Single Source of Truth*. `.docx` dient ausschließlich als Ingest- und Exportformat.
- **Reine Rust-Pipeline ohne Pandoc:** Nativer Parser via `docling-rs` für `.docx`, `.odt`, `.rtf`, `.epub`, `.pptx` und `.xlsx`.
- **Sicherer Import-Puffer:** Konvertierte Dokumente öffnen in einem neuen ungespeicherten Tab (`<name>.md`), sodass Originaldateien niemals überschrieben werden.
- **Sanitization & Unicode NFC:** Bereinigung unsichtbarer Steuerzeichen (weiche Trenner, Zero-Width Spaces, BOM) und NFC-Normalisierung für IAST-Diakritika.

### Geplante Verlags-Erweiterungen (Ziel: v2.1.0):
1. **Scholarly Export-Template:** Kompilierung nach `.docx` über eine konfigurierte Vorlage mit festen Schriftarten (*STIX Two Text*, *Gentium Plus*, *Noto Serif Devanagari*).
2. **In-Editor CriticMarkup:** Visuelles Rendering von Inline-Änderungen und Lektorenkommentaren in CodeMirror 6 (`{++eingefügt++}`, `{--gelöscht--}`, `{>>Hinweis<<}`) mit 1-Klick Accept/Reject-Steuerung.

---

## 7. Synchroner Diagramm-Renderer via Pele (`pele.run`)

- **Status:** 📋 **Backlog / Evaluation** (Ziel: v2.0.0)
- **Ziel:** Ersatz von asynchronem Mermaid (v11/12) durch einen abhängigkeitsfreien, synchronen Renderer zur Beseitigung von Render-Verzögerungen und massiven Einsparung von Bundle-Größe.

### Kernvorteile:
1. **Verzögerungsfreier synchroner Satz:** Beseitigt Debounce-Timer und asynchrone DOM-Mutationen in der Vorschau durch direktes Rendern in `markdown-it`.
2. **Bundle-Verschlankung:** Reduktion des Anwendungs-Bundles um ~2,5 MB durch Wegfall des Mermaid-Chunk-Graphen.
3. **Birchville-Theming:** Steuerung über native CSS-Custom-Properties (`--pele-bg`, `--pele-fg`, `--pele-accent`) für verzögerungsfreien Hell/Dunkel-Wechsel.
4. **Vektor-Embedding im HTML-Export:** Einbettung nativer Vektor-SVGs in Standalone-HTML-Dateien unter Beibehaltung einer strikten `script-src 'none'` Content Security Policy.
