---
title: ZenTauri Philological Workbench — Benutzerhandbuch
---

# 📖 ZenTauri Philological Workbench — Benutzerhandbuch

> **Eine integrierte, native Desktop-Arbeitsumgebung für die Digital Humanities: Wissenschaftliches Authoring (DE/EN/SA), synoptische Master-JSON-Editionen und Vektor-PDF-Kollationierung.**

---

## 🏛️ Einleitung & Philosophie des Produktes

Die **ZenTauri Philological Workbench** wurde aus der editorischen Praxis anspruchsvoller philologischer Großprojekte (wie dem *Payer Online-Sanskritkurs* und der synoptischen Edition der *Bṛhadāraṇyaka-Upaniṣad*) heraus entwickelt. Sie ist kein generischer Allzweck-Markdown-Editor und keine überfrachtete Office-Suite, sondern ein **fokussiertes Präzisionswerkzeug für die wissenschaftliche Textarbeit**.

### Das Dilemma herkömmlicher Textverarbeitungen (MS Word & Co.)
In der akademischen Editions- und Übersetzungspraxis greifen viele Philologen mangels Alternativen zu Microsoft Word. Bei Kernaufgaben der textkritischen Philologie führt dies regelmäßig zu schweren Problemen:
1. **Schriftmischung & Kodierungschaos:** Die Kombination europäischer Sprachen mit Sanskrit (IAST-Umschrift mit vedischen Akzenten, Devanāgarī-Originalschrift) führt in Office-Programmen zu springenden Zeilenabständen, fehlerhaften Ligaturen und unberechenbarem Schriftartenwechsel.
2. **Kollationierungs- & Synopsen-Bruch:** Mehrspaltige Gegenüberstellungen (z. B. Scan ⇄ Urtext ⇄ Übersetzung ⇄ Apparat) brechen in Standard-Textverarbeitungen bei Seitenumbrüchen auseinander.
3. **Mehrstufige Apparate:** Die parallele Führung von Handschriften-Varianten, Parallelstellen und Sachkommentaren überfordert herkömmliche Fußnotensysteme.
4. **Das TEI-XML-Dilemma:** Standardkonformes TEI-P5 XML ist das anerkannte Archivierungsformat von Bibliotheken und Fachgesellschaften, von Hand im Alltag jedoch unbedienbar und fehleranfällig.

### Die vier Kernprinzipien von ZenTauri

ZenTauri löst diese Herausforderungen durch vier architektonische Grundsätze:

1. **Das 3-Work-Modes Modell (Funktionale Trennung):**
   Statt alle Werkzeuge auf einmal in die Benutzeroberfläche zu drängen, schaltet die ActivityBar zwischen drei spezialisierten Arbeitsmodi um:
   - **Modus 1 (Authoring):** Schnelles, ablenkungsfreies Schreiben in erweitertem Markdown.
   - **Modus 2 (Synoptische Edition & Master-JSON):** Segmentierte Bearbeitung historischer Ausgaben (`book.json` / AST) im Split-Pane (Scan-PDF links ⇄ strukturierter Editor rechts).
   - **Modus 3 (Dual PDF QA & Proofing):** Vektorbasierter 2-Spalten-Vergleich (Original vs. Neusatz) mit visuellen Bounding-Box-Annotationen und KI-Korrektur-Prompt.

2. **Duale Daten-Architektur (Die 2 philologischen Texttypen):**
   - *Texttyp A (Linearer Fließtext: Lektionen, Notizen, Essays):* Kanonisches Speicherformat ist reines **Markdown**.
   - *Texttyp B (Segmentierte Korpora & historische Editionen wie Böhtlingk oder Bṛhadāraṇyaka):* Kanonisches Speicherformat ist strukturiertes **Master-JSON (`book.json`)**.
   Jeder Texttyp besitzt seine eigene, natürliche Repräsentation als unveränderliche *Single Source of Truth*.

3. **Plain Text First & Interoperabilität (Kompilieren statt Hand-Taggen):**
   Zentauri zwingt den Autor niemals dazu, rohes TEI-P5 XML oder instabiles OOXML von Hand zu tippen.
   - **DOCX-Dateien** werden beim Import automatisch über eine Rust/Pandoc-Pipeline in sauberes, bereinigtes Markdown überführt.
   - **Verlags-DOCX-Manuskripte** (*Gentium Plus* / *Noto Serif Devanagari*), **standardkonformes TEI-P5 XML**, **Typst-Druck-PDFs** und **Web-Synopsen** werden vollautomatisch als nachgelagerte Kompilierungsziele (*Distribution Targets*) generiert.

4. **Nativer Rust/Tauri-Unterbau:**
   Zentauri wiegt ca. 30 MB, startet in Millisekunden und arbeitet ohne schwere Browser- oder Node.js-Abhängigkeiten. Das PDF-Rendering geschieht nativ als Vektor-SVG (`hayro_svg`), die Datei- und Workspace-Indizierung erfolgt über eingebettetes SQLite.

---

## 🗺️ Gesamt-Kapitelgerüst des Benutzerhandbuchs

Dieses Handbuch ist in sechs methodische Hauptteile untergliedert. Aktive Funktionen sind sofort anwendbar; im Ausbau befindliche Module sind mit ihrem Roadmap-Status gekennzeichnet:

### Teil I: Grundlagen & Arbeitsumgebung
- **Kapitel 1: Installation & Workspace-Konzept** (Systemanforderungen, Projektordner, lokale SQLite-Indizierung)
- **Kapitel 2: Benutzeroberfläche & Navigation** (ActivityBar, File Explorer, Workspace-Suche, Split-Pane-Ergonomie)

### Teil II: Work-Mode 1 — Wissenschaftliches Authoring (Markdown)
- **Kapitel 3: Philologisches Markdown & Container-Boxen** (Grammatik-Boxen, Payer-Syntax, Danda-Interpunktion, Tabellen mit `:br`)
- **Kapitel 4: Mehrsprachigkeit & Sanskrit-Eingabe** (IAST, Devanāgarī-Brackets `《...》`, Transliteration `⌥⌘D` / `⌥⌘H`, Live-IME)
- **Kapitel 5: Formeln, Typografie & Wissensvernetzung** (KaTeX-Formeln, Mermaid-Diagramme, Fußnoten `[^1]`, Definitionslisten)
- **Kapitel 6: Export & Ausgabe** (Typst-PDF-Kompilierung, Standalone-HTML-Export nach Modern Web Guidance)

### Teil III: Work-Mode 2 — Synoptische Edition & Master-JSON *(Roadmap)*
- **Kapitel 7: Das Master-JSON Konzept (`book.json`)** (Die Architektur der Bṛhadāraṇyaka-Edition als AST-Single-Source)
- **Kapitel 8: Split-Pane Editions-Layout** (Scan-PDF links ⇄ strukturierte Segment-Eingabe rechts)
- **Kapitel 9: Segmentbasierte Felder** (Devanāgarī, IAST, Übersetzung, Lemmata, textkritischer Apparat)
- **Kapitel 10: Silent Auto-Repair & Validierung** (Automatische Korrektur von typografischen Anführungszeichen und Dandas beim Speichern)
- **Kapitel 11: TEI-P5 XML & Synopse-Kompilierung** (Automatischer Export nach `<ab>`-Standard und HTML-Synopse)

### Teil IV: Work-Mode 3 — Dual PDF QA & Kollationierung *(Aktiv / Ausbau)*
- **Kapitel 12: Dokumentenvergleich im Vektor-Synchron-Viewer** (Zwei PDFs parallel laden, SWAP-Funktion)
- **Kapitel 13: Scroll-Synchronisationsmodi** (Prozentuale Bindung, Seiten-Lockstep, Heading-Sync)
- **Kapitel 14: Visuelle Bounding-Box-Annotationen** *(Konzipiert)* (Klick & Drag auf Vektor-SVGs, normalisierte Prozent-Koordinaten)
- **Kapitel 15: KI-Korrektur-Bridge (Web-First)** *(Konzipiert)* (1-Klick Clipboard-Prompt für Claude/ChatGPT/Gemini)
- **Kapitel 16: Export kommentierter Korrektur-PDFs** *(Konzipiert)* (Eingebrannte Boxen für Lektoren und Vision-KIs)

### Teil V: Interoperabilität & Verlags-Workflow
- **Kapitel 17: DOCX-Ingest (Import & Veredelung)** *(Konzipiert)* (Befreiung von Word-Ballast, Unicode-Normalisierung)
- **Kapitel 18: DOCX-Export (Verlags-Manuskripte)** *(Konzipiert)* (Scholarly Reference Template mit *Gentium Plus* & Fußnoten)
- **Kapitel 19: Korrekturverfolgung & CriticMarkup** *(Konzipiert)* (Lektorat mit `{++hinzu++}`, `{--gelöscht--}`, `{>>Kommentar<<}`)

### Teil VI: Konfiguration & Referenz
- **Kapitel 20: Stylesheet-Anpassung (`custom.css`)** (Birchville Scholarly Synthesis Design System, Theme-Anpassungen)
- **Kapitel 21: Tastenkürzel & Produktivitäts-Cheatsheet** (Tastatur-Befehlsreferenz für macOS und Windows/Linux)

---

## 🛠️ Praxisleitfaden zu den aktiven Kernfunktionen

### 1. Benutzeroberfläche & Navigation (Teil I)
- **ActivityBar (Linke Randleiste):** Bietet schnellen Wechsel zwischen Explorer, Suche, Cheatsheet und den Work-Modes.
- **Split-Pane:** Synchronisierte Ansicht mit CodeMirror 6 auf der linken Seite und der Live-Vorschau auf der rechten Seite.
- **Dateibaum:** Inline-Umbenennen und Anlegen von Notizen ohne störende Modaldialoge (`Enter` bestätigt, `Escape` bricht ab).

### 2. Wissenschaftliche Container-Boxen (Modus 1)
ZenTauri bringt vordefinierte Block-Container nach dem Payer-Standard mit:

::: grammar-box
**Grammatik-Paradigma:**
devo viṣṇuḥ = ⟪देवो⟫ ⟪विष्णुः⟫ = „Viṣṇu ist ein Gott.“
:::

- `::: grammar-box`: Goldene Umrandung für morphologische Paradigmen und Lautgesetze.
- `::: warning-box`: Terracotta/Signalrot für didaktische Warnungen und sprachliche Stolperfallen.
- `::: verse-box`: Eingerückter Kasten für Ślokas, Mantras und metrische Schemata.
- `::: note-box`: Schiefergrauer Kasten für philologische Sachanmerkungen und Textzeugen.
- `::: indent`, `::: center`, `::: media`, `::: no-header`: Strukturelle Layout-Blöcke.
- `::: info`, `::: tip`, `::: warning`, `::: danger`, `::: details`: Standard-VitePress-Container.
- Abwärtskompatible Aliase: `grammar-box2` (sekundäre Schemata), `important` (`warning-box`), `literatur-box` (`note-box`), `compact` (`verse-box`).

### 3. Sanskrit-Typografie & Transliterations-Shortcuts (Modus 1)
- **Devanāgarī-Brackets:** Text in CJK-Doppelklammern wie `《धर्मक्षेत्रे कुरुक्षेत्रे》` oder `⟪...⟫` wird automatisch im Devanāgarī-Font gerendert und farblich hervorgehoben.
- **Bidirektionale Transliteration:**
  - `⌥⌘D` (Option+Cmd+D): Markierten Text zwischen **IAST** (`kṛṣṇaḥ`) und **Devanāgarī** (`कृष्णः`) umschalten.
  - `⌥⌘H` (Option+Cmd+H): Markierten Text zwischen **Harvard-Kyoto** (`kRSNaH`) und **Devanāgarī** umschalten.
- **Akademische Fußnoten & Definitionslisten:**
  - Standard-Fußnoten über `[^1]` im Text und `[^1]: Fußnotentext` am Dokumentenende.
  - Definitionslisten über `Term\n: Definition`.

### 4. Dual PDF QA: Vektor-Synchron-Viewer (Modus 3)
- **Zwei Dokumente synchron prüfen:** Über die Menüleiste oder ActivityBar wird der `PdfDualViewer` geladen.
- **Vektor-SVG-Schärfe:** PDF-Seiten werden über die Rust-Engine `hayro_svg` gerendert – Schriften bleiben auch bei starkem Zoom gestochen scharf.
- **Sync-Modi:**
  - `% (Prozentual):` Beide Spalten scrollen proportional zur jeweiligen Gesamtlänge.
  - `Seite (Lockstep):` Beide Dokumente wechseln seitenweise synchron.
  - `Off:` Unabhängiges Scrollen.
- **SWAP-Taste:** Vertauscht linke und rechte Dokumente mit einem Klick.

### 5. Individuelle Gestaltung (`custom.css`)
Über die Konfigurationsdatei `~/.config/zentauri/custom.css` (macOS/Linux) bzw. `%APPDATA%\zentauri\custom.css` (Windows) können alle Farben, Schriftarten und Container individuell überschrieben werden:

```css
/* Eigene Akzentuierung für Grammatik-Boxen */
.vp-doc .custom-block.grammar-box,
.grammar-box {
  background-color: #fcf9f2 !important;
  border-left-color: #b45309 !important;
}
```
