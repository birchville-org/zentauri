---
title: Roadmap & Feature-Backlog
---

# 🗺️ Roadmap & Feature-Backlog

Dieses Dokument erfasst geplante Ausbau-Features, Architekturkonzepte und vorläufig zurückgestellte Funktionen für künftige Versionen (Ziel: **ZenTauri v2.0.0 & v2.1.0**).

---

## 📌 Statusübersicht der Features

| Funktion | Aktueller Status | Zielversion | Beschreibung |
| :--- | :--- | :--- | :--- |
| **QA Reference Dual-Pane** | 📋 **Backlog / Pausiert (v1.3.0)** | v2.2.0 | Textbasierter 2-Spalten-Vergleich (in v1.3.0 zugunsten von Modus 3: Dual PDF QA zurückgestellt) |
| **Harvard-Kyoto & IAST Shortcuts** | ✅ **Aktiv (v1.2.0)** | v1.2.0 | Bidirektionale Tastenkürzel `⌥⌘D` & `⌥⌘H` mit Tag-geschützter Transliteration |
| **Wissenschaftliche Fußnoten & Deflists** | ✅ **Aktiv (v1.2.0)** | v1.2.0 | Standard `[^1]` Fußnoten und `Begriff\n: Definition` Definitionslisten |
| **Nativer Typst-PDF-Compiler** | ⏳ **In Entwicklung** | v2.0.0 | Direkter Typst-Satz im Rust-Backend (`src-tauri`) ohne Browser-Drucker |
| **Dual PDF QA & Proofing (Modus 3)** | 📋 **Backlog / Konzipiert** | v2.0.0 | Dual-Vektor-PDF-Viewer mit Bounding-Box-Annotationen & KI-Korrektur-Prompt |
| **Synoptischer Master-JSON (Modus 2)** | 📋 **Backlog / Konzipiert** | v2.1.0 | Split-Pane-Editor für historische Editionen (`book.json` AST-Format nach Bṛhadāraṇyaka) |
| **DOCX-Brücke & CriticMarkup** | 📋 **Backlog / Konzipiert** | v2.1.0 | Pandoc-gestützter DOCX-Ingest, akademisches Verlags-Template und Track-Changes |
| **In-Editor Live-IME (Stufe 2)** | 📋 **Backlog / Konzipiert** | v2.0.0 | Echtzeit-Wandlung in `《...》` und Compose-Sequenzen im Fließtext |
| **Wissensgraph & Wikilinks** | 📋 **Backlog / Pausiert** | v2.0.0 | Re-Integration des Graphen, `[[`-Autovervollständigung und Cmd+Klick |

---

## 1. Nativer Typst-PDF-Compiler

- **Status:** In Entwicklung (`src-tauri` via `typst`- und `typst-pdf`-Crates)
- **Ziel:** Vollständige Ablösung der WebKit-basierten Druckfunktion durch blitzschnellen, nativen PDF-Satz direkt über die Typst-Compiler-Engine in Rust.

### Meilensteine:
1. **Direktes AST-Mapping:** Übersetzung von Markdown-Elementen in semantischen Typst-Code.
2. **Akademisches Satzlayout:** Automatische Paginierung, Ränder, Fußnoten und Devanāgarī-Schriftartenkaskaden.
3. **Plattformunabhängig & leicht:** Keine Chromium- oder Node.js-Abhängigkeiten.

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

- **Status:** Backlog / Konzipiert
- **Ziel:** Synchronisierter 2-Spalten-Vektor-PDF-Vergleich von Neusatz-Ausgaben gegen historische Druckscans mit KI-unterstützter Korrekturführung.

### Geplante Phasen:
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

- **Status:** Backlog / Konzipiert
- **Ziel:** Verlustfreie Brücke zu Microsoft Word-zentrierten Verlagen und Gutachtern unter dem strikten Prinzip **Plain Text First**.

### Architektur:
- **Plain Text als Kanon:** Markdown ist die persistente *Single Source of Truth*. `.docx` dient ausschließlich als Ingest- und Exportformat.
- **DOCX-Ingest:** Automatische Rust/Pandoc-Konvertierung zur Entfernung von Word-Formatierungsballast, Normalisierung von Unicode-Diakritika, Übernahme von Fußnoten und Wandlung von Word Track-Changes in CriticMarkup (`{++eingefügt++}`, `{--gelöscht--}`).
- **Scholarly Export-Template:** Kompilierung nach `.docx` über eine konfigurierte Vorlage mit festen Schriftarten (*Gentium Plus*, *Noto Serif Devanagari*).
- **In-Editor CriticMarkup:** Visuelles Rendering von Inline-Änderungen und Lektorenkommentaren in CodeMirror 6 mit 1-Klick Accept/Reject-Steuerung.
