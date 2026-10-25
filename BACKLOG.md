# Zentauri Feature Backlog & Architektur-Vision

Dieses Dokument erfasst die strategische Zielarchitektur und zukünftige Ausbau-Features für Zentauri als integrierte **Philologische Editions- und Proofing-Workbench**.

---

## 🏛️ Strategische Zielarchitektur: Das 3-Work-Modes Modell

Zentauri gliedert sich in drei klar abgegrenzte, zuschaltbare Arbeitsmodi in der ActivityBar. Alle Modi teilen sich denselben nativen Rust/Tauri-Unterbau (Dateiverwaltung, `hayro_svg` Vektor-Rendering, Sanskrit-Fontstacks, Transliteration):

1. **Modus 1: Markdown Authoring (Aktiv)**
   - Fokussiertes Schreiben von Lektionen (Payer-Kurs), Notizen und philologischen Essays.
   - CodeMirror 6, KaTeX, Sanskrit-Live-IME, Typst-PDF-Export.
2. **Modus 2: Synoptische Edition & Master-JSON (Geplant)**
   - Segmentierte Bearbeitung alter gescannter Ausgaben (`book.json` / AST-Gliederung wie im Projekt `brhadaranyaka`).
   - Split-Pane: Scan-PDF links ⇄ strukturierter, feldorientierter JSON-Editor rechts.
3. **Modus 3: Dual PDF QA & Proofing (In Konzeption / Backlog)**
   - 2-spaltiger Vektor-PDF-Vergleich (Original vs. Neusatz).
   - Visuelle Bounding-Box-Annotationen, 1-Klick-Clipboard-Prompt für KIs und annotierter PDF-Export.

---

## 1. Knowledge Graph & Zettelkasten-Verknüpfung

- **Status:** Backlog (temporär deaktiviert zur Verschlankung des Kern-Editors)
- **Komponenten:** `src/components/GraphView.vue`, `src-tauri/src/db.rs` (SQLite Workspace Indexer)

### Hintergrund & Motivation
ZenTauri besitzt im Rust-Backend (`src-tauri/src/db.rs`) bereits eine performante SQLite-Indizierung von Wikilinks (`[[Dateiname]]`, `[[Dateiname|Alias]]`) und regulären Markdown-Links (`[Text](pfad.md)`). Die Visualisierung erfolgte über einen interaktiven Force-Directed-Graphen (`v-network-graph`). 

Um den Editor so schlank, fokussiert und ressourceneffizient wie möglich zu halten (Reduktion der Bundle-Größe um über 600 kB und Entlastung der Benutzeroberfläche), wurde das Feature vorläufig aus der aktiven Menüleiste und dem View-Routing entfernt.

### Geplante Ausbaustufen bei Wiederaufnahme:
1. **Editor-Autovervollständigung für Wikilinks (`[[`)**:
   - Beim Tippen von `[[` im CodeMirror-Editor soll ein Autocomplete-Popup mit Fuzzy-Suche über alle Dokumente des aktuellen Workspaces erscheinen.
2. **Direkte Quelltext-Navigation (`Cmd+Klick`)**:
   - Ermöglicht das direkte Anspringen und Öffnen verlinkter Zieldateien per Tastenkombination / Klick im Markdown-Quelltext.
3. **Backlinks & Referenzen-Inspektor**:
   - Einblendung von Dokumenten, die auf die aktuell geöffnete Notiz verweisen (eingehende Kanten).
4. **Graph-Filter & Orphan-Erkennung**:
   - Filtermöglichkeiten nach Verzeichnissen, Frontmatter-Tags sowie gezielte Isolierung verwaister Notizen zur Pflege wissenschaftlicher Wissenssammlungen.

---

## 2. Nativer Typst PDF-Export (Roadmap-Abgleich)

- **Status:** In Entwicklung / Nativ im Rust-Backend (`src-tauri` via `typst` & `typst-pdf`).
- **Ziel:** Vollständiger Ersatz von Headless-Browser-basierten Rendering-Engines durch blitzschnellen, nativen Typst-Compiler-Durchlauf ohne Chromium-Abhängigkeiten.

---

## 3. Übersetzungs- & Text-QA-Vergleichsmodus (Dual-Document View & Heading-Sync)

- **Status:** Backlog (in v1.3.0 aus der aktiven UI ausgeblendet zur Fokussierung auf die 3 Kern-Work-Modes)
- **Komponenten:** `src/components/QaReferencePane.vue`, `src/lib/heading-sync.ts`, `src/lib/language-detector.ts`

### Hintergrund & Motivation
Im Payer-Projekt existiert im `qa_viewer.html` ein bewährter Side-by-Side-Modus für Lektoren und Übersetzer. Dieser erlaubt es, zwei Dokumente parallel nebeneinander zu öffnen (z. B. deutsches Original als Referenz und Zielsprache im Editor), um Übersetzungen synchron zu prüfen.

In Zentauri ist das primäre QA-Proofing-Konzept jedoch für Modus 3 (**Dual PDF QA & Proofing**) reserviert (visueller Vektor-PDF-Vergleich Originalscan vs. Neusatz). Um Feature-Creep und redundante Vergleiche im Kern-Markdown-Editor zu vermeiden, wurde die Text-Reference-Funktion (`qa-2col`, SWAP-Button, Referenzspalte) aus der aktiven Menü- und Toolbar-Oberfläche ausgeblendet. Die zugrundeliegenden Komponenten (`QaReferencePane.vue`) und Algorithmen (`heading-sync.ts`) bleiben modular im Repository erhalten und können bei Bedarf für spezialisierte Korpus-Vergleiche reaktiviert werden.

### Geplante Funktionen & Ausbaustufen bei Wiederaufnahme:
1. **Dual-Pane Dokumentenansicht (2-Col / 3-Col Layout):**
   - Paralleles Laden zweier Markdown-Dateien im Workspace (z. B. Referenzdatei links schreibgeschützt oder gerendert, Zieldatei rechts im CodeMirror-Editor).
   - Flexible Umschaltung: 2-Spalten-Vergleich (Original vs. Editor), 3-Spalten-Vergleich (Original, Editor, Live-Vorschau) sowie SWAP-Button zum Seitentausch.
2. **Kapitel- & Überschriften-basiertes Synchron-Scrollen (Heading-Matching):**
   - Intelligente Scroll-Synchronisation basierend auf übereinstimmenden Markdown-Headings (`#`, `##`, `###`) statt reinem Pixel-/Prozent-Scrollen.
   - Verhindert Desynchronisation bei unterschiedlich langen Sprachfassungen (z. B. Deutsch vs. Sanskrit/Englisch).
   - Wählbare Modi: *Sync: Header*, *Sync: Percentage*, *Sync: Off*.
3. **Parallele Workspace-Sprachnavigation:**
   - Schnellauswahl paralleler Dateien bei mehrsprachigen Korpora (z. B. automatische Zuordnung korrespondierender Sprachpfade wie `de/lektion01.md` ↔ `en/lektion01.md`).

---

## 4. Dreistufiges Hybridkonzept für Sanskrit-Eingabe (In-Editor IME & Live-Transliteration)

- **Status:** Backlog / Konzipiert (Architektur dokumentiert in `docs/scholarly-input-architecture.md`)
- **Komponenten:** `src/components/Editor.vue`, `src/lib/transliteration.ts`, CodeMirror 6 Extensions

### Hintergrund & Motivation
Sanskrit-Texte sind im wissenschaftlichen Alltag Mischtexte (deutscher/englischer Kommentar kombiniert mit IAST-Fachbegriffen oder Devanāgarī-Zitaten).
Ein reines OS-Tastaturlayout zwingt zu ständigen Unterbrechungen des Schreibflusses mitten im Satz; reine Harvard-Kyoto-ASCII-Speicherung entstellt den Quelltext typografisch und kollidiert mit Großbuchstaben am Satzanfang.

### Geplante Ausbaustufen:
1. **Stufe 1 (Kanonische Speicherung):**
   - Markdown-Dateien persistieren standardkonformes IAST (`kṛṣṇaḥ`) oder Devanāgarī (`कृष्णः`). Volle Interoperabilität mit externen Tools (Git, Typst, Pandoc).
2. **Stufe 2 (CodeMirror 6 In-Editor Live-IME):**
   - **Scope-basierter IME:** Innerhalb von Sanskrit-Klammern (`《...》` und `⟪...⟫`) tippt der Autor in flüssigem Harvard-Kyoto (`kRSNaH`); CodeMirror wandelt dies während des Tippens in Echtzeit in IAST (`《kṛṣṇaḥ》`) oder Devanāgarī (`《कृष्णः》`) um.
   - **Compose-Key Sequenzen im Fließtext:** Emulation schneller Compose-Kürzel ohne OS-Tastaturwechsel (z. B. `.r` => `ṛ`, `-a` => `ā`, `~n` => `ñ`, `'s` => `ś`, `.s` => `ṣ`, `.m` => `ṃ`, `.h` => `ḥ`).
3. **Stufe 3 (Post-Hoc Transliteration - Bereits aktiv):**
   - Tastatur-Shortcuts `⌥⌘D` (IAST ⇄ Devanāgarī) und `⌥⌘H` (Harvard-Kyoto ⇄ Devanāgarī) sowie Header-Buttons für bestehende Dokumente und Korpus-Importe.

> [!NOTE]
> **Kompatibilität mit OS-Tastaturlayouts:** Das Hybridkonzept schränkt installierte OS-Layouts (z. B. EasyUnicode, Mac Option-IAST) in keiner Weise ein. Da Stufe 1 als Zielformat IAST nutzt, werden vom Betriebssystem gesendete IAST-Unicode-Zeichen nativ und unverändert in den Editor übernommen. Stufe 2 dient rein als optionale Unterstützung für Autoren ohne installiertes OS-Layout und bleibt jederzeit abschaltbar.

---

## 5. PDF-Vergleich: Visuelle Annotationen & KI-Korrektur-Bridge (Dual PDF QA)

- **Status:** Backlog / Konzipiert (Diskussionsstand Oktober 2026)
- **Komponenten:** `src/components/PdfDualViewer.vue`, `src-tauri/src/lib.rs` (PDF-Annotation/Export), optionale KI-Bridge-Module

### Hintergrund & Motivation
Beim visuellen PDF-Vergleich (z. B. Referenz-PDF vs. generiertes Dokument im rechten Viewer) entstehen Korrekturanmerkungen (Typografie, Layout, Übersetzungen, Textfehler). Ziel ist ein strukturierter Workflow, um Anmerkungen direkt auf den Seiten zu erfassen und entweder als annotiertes PDF / strukturierter Prompt an Web-KIs (Claude, ChatGPT, Gemini) weiterzugeben oder optional über eine In-App-Automation (lokale/externe LLMs) direkt in das Markdown-Quelldokument zurückzuführen.

### Geplante Ausbaustufen (3-Ebenen-Modell):

1. **Stufe 1 (Visuelle Erfassung im rechten Pane):**
   - **Werkzeug-Modus:** Umschaltbar zwischen *Hand/Pan* (Scrollen) und *Annotieren* (Bounding-Box aufziehen per Klick & Drag).
   - **Normalisiertes Koordinaten-Overlay:** Speicherung von Position und Dimension in relativen Prozentwerten (0.0 bis 1.0) auf Basis der gerenderten SVG-Seiten (`.pdf-page-card`), unabhängig von Zoomstufe und Fenstergröße.
   - **Inline-Kommentarfeld & Nummerierung:** Fortlaufende Badges (`[1]`, `[2]`, ...) mit Popover-Eingabefeld für Korrekturanweisungen direkt an der Bounding-Box.
   - **Review-Drawer:** Einklappbare Seitenleiste mit chronologischer Notizenübersicht je Seite und Klick-Navigation zur entsprechenden Fundstelle.
   - **Persistenz:** Lokale Zwischenspeicherung im Workspace (z. B. `.zentauri/reviews/<pdf-hash>.json`).

2. **Stufe 2 (Web-First Handoff & Export – Primärer Modus):**
   - **„Copy AI Review Prompt“ (1-Klick ins Clipboard):** Generiert einen strukturierten Markdown-Prompt bestehend aus System-Rolle, aktuellem Markdown-Quelltext aus dem Editor sowie einer tabellarischen Liste aller Anmerkungen (Seite, Kasten-ID, Textanker, Korrekturanweisung) für den direkten Web-Chat (Claude Projects, ChatGPT, Gemini Studio).
   - **„Export Annotated PDF“:** Erzeugt ein neues PDF (`<name>_annotated.pdf`) mit eingebrannten Boxen, Badge-Nummern und angehängter/eingebetteter Kommentartabelle zur manuellen Weitergabe an Lektoren oder Multimodal-KIs.

3. **Stufe 3 (Optionale Closed-Loop Automation):**
   - **Provider-Schnittstelle:** Modulare Anbindung an lokale Modelle via Ollama (`http://localhost:11434/api/generate`, z. B. `qwen2.5-coder`) oder Cloud-APIs (OpenAI, Anthropic, Gemini).
   - **Diff-Review & Apply im Editor:** Automatische Patch-Generierung aus den Annotationen mit visueller Diff-Vorschau im CodeMirror-Editor und schrittweiser Übernahme (Accept/Reject).

---

## 6. Synoptischer Master-JSON Editor für Alt-Ausgaben (`book.json` / Modus 2)

- **Status:** Backlog / Konzeptioniert (Oktober 2026)
- **Komponenten:** `src/components/MasterJsonEditor.vue` (neu), `src/components/PdfDualViewer.vue`, `src-tauri/src/lib.rs` (JSON-I/O & AST-Validierung)
- **Referenz-Projekt:** [`/Volumes/SanDisk1TB/proj/brhadaranyaka`](file:///Volumes/SanDisk1TB/proj/brhadaranyaka) (Bṛhadāraṇyaka-Upaniṣad 1.4 Master-JSON & QA-Viewer)

### Hintergrund & Motivation (Die 2 Texttypen der Philologie)
Zentauri unterscheidet strikt zwischen zwei Texttypen:
1. **Texttyp A (Linearer Fließtext):** Payer-Lektionen, Grammatiknotizen, Aufsätze. Hier ist **Markdown (Modus 1)** das ideale, leichtgewichtige Format.
2. **Texttyp B (Segmentierte Korpora & historische Editionen):** Editionen historischer Drucke (z. B. Otto von Böhtlingk 1889, historische St. Petersburger Ausgaben, Handschriften-Scans) oder Korpora wie die *Bṛhadāraṇyaka-Upaniṣad*. Dies sind keine Fließtexte, sondern relationale Datenbanken von Sinneinheiten (Mantren, Verse, Wörterbucheinträge).

**Warum das direkte Editieren von `book.json` alternativlos ist:**
- In reinem Markdown müssten unlesbare, fehleranfällige Tabellen- oder Boxenkonstrukte erfunden werden.
- Jedes Segment im JSON hält diskrete Relationen: Vers-ID, Scan-Seitenzahl, Devanāgarī, IAST, Übersetzungen (z. B. Slaje vs. Böhtlingk), textkritischer Apparat und Lemmata.
- Die synoptische Kopplung (Klick auf Scan links springt exakt zum JSON-Segment rechts) funktioniert nur über diese IDs.
- Reines TEI-P5 XML ist im redaktionellen Alltag unergonomisch und fehleranfällig. Stattdessen dient das strukturierte **Master-JSON (`book.json` / `master.json`)** als Single-Source-of-Truth. Aus diesem werden TEI-XML, Typst-PDF, Synopse-HTML und EPUB 3 vollautomatisch nachgelagert kompiliert.

### Geplante Funktionen (Modus 2):
1. **Split-Pane Layout (Payer QA Standard):**
   - **Linke Spalte:** Originaler Scan (PDF via `hayro_svg` Vektor-Rendering mit synchroner Segmentnavigation).
   - **Rechte Spalte:** Wahlweise strukturierte, feldorientierte Eingabemaske für das aktive Textsegment (Abschnitt, Vers, Mantra) oder direkter JSON-CodeMirror-Editor mit Schemavalidierung und Folding.
2. **Feld- & Segmentbasierte Eingabe:**
   - Dedizierte, syntaktisch isolierte Felder je Segment:
     * Devanāgarī (mit automatischer Ligaturprüfung).
     * IAST (wissenschaftliche Umschrift mit Diakritika-Unterstützung).
     * Deutsche / Englische Übersetzung.
     * Textkritischer Apparat / Varianten (z. B. Slaje vs. Böhtlingk).
     * Philologischer Kommentar / Lemmata.
3. **Silent Auto-Repair & Validierung:**
   - Automatische Korrektur von typografischen Anführungszeichen, Danda-Interpunktion (`|` / `||`) und JSON-Syntax beim Speichern ohne störende Dialoge.
4. **TEI- & Export-Kompilierung per Rust-Befehl:**
   - Export aus dem Master-JSON nach TEI-P5 XML (`<ab>`-Parallelität) und Typst-PDF direkt aus Zentauri.

---

## 7. DOCX-Interoperabilität & CriticMarkup Track-Changes (Word-Brücke)

- **Status:** Backlog / Konzipiert (Oktober 2026)
- **Komponenten:** `src-tauri/src/docx_engine.rs` (Rust/Pandoc-Bridge), `src/lib/critic-markup.ts`, CodeMirror 6 Visual Extensions

### Hintergrund & Motivation
In der akademischen Philologie und Editionsarbeit fordern Verlage (Brill, Harrassowitz, De Gruyter) und Koautoren standardmäßig `.docx`-Dokumente. Word scheitert zwar bei philologischen Kernaufgaben (mehrstufige Apparate, Ligaturen, Diakritika-Encoding), bleibt aber das dominierende Austauschformat.
Zentauri schlägt diese Brücke unter einem strikten Architekturprinzip: **Plain Text First (Markdown als kanonische Single Source of Truth)**. `.docx` wird niemals direkt editiert oder als Speicherformat genutzt, sondern fungiert ausschließlich als **Ingest-** (Import) und **Distributions-Format** (Export).

### Geplante Funktionen:

1. **DOCX-Ingest (Import & semantische Befreiung):**
   - **Pandoc/Rust Konvertierung:** Drag & Drop oder Öffnen einer `.docx`-Datei wandelt diese unmittelbar in sauberes, archivierbares Markdown um.
   - **Formatierungs-Sanitization:** Entfernen von Word-Formatierungsmüll, unsichtbaren Steuerzeichen (wie weichen Trennstrichen `\u00ad` und Zero-Width Spaces) und zerstückelten XML-Spans.
   - **Unicode-Normalisierung (NFC):** Bereinigung von IAST-Diakritika und Devanāgarī-Zeichenfolgen.
   - **Fußnoten-Mapping:** Verlustfreie Überführung von Word-Fußnoten in den `[^1]`-Standard.
   - **Track-Changes & Kommentare:** Konvertierung nativer Word-Änderungsverfolgungen in **CriticMarkup** (`{++neu++}`, `{--alt--}`) und Word-Kommentaren in `{>>Hinweis<<}`.

2. **DOCX-Export (Verlags-Kompilierung):**
   - On-the-Fly-Kompilierung von Markdown zu `.docx` über ein vordefiniertes *Scholarly Reference Template* (`scholarly-reference.docx`).
   - Feste Zuordnung philologischer Font-Hierarchien (*Gentium Plus* für IAST/Fließtext, *Noto Serif Devanagari* für Devanāgarī), sodass Verlage und Gutachter ein typografisch einwandfreies Dokument ohne Zeilensprünge erhalten.
   - Rücküberführung von Markdown-Fußnoten in native Word-Fußnoten.

3. **CriticMarkup In-Editor Visualisierung:**
   - CodeMirror 6 Extensions rendern CriticMarkup-Tags visuell wie die gewohnte Word-Änderungsverfolgung (grün unterstrichen für Ergänzungen, rot durchgestrichen für Streichungen, gelbe Randnotizen für Kommentare).
   - Werkzeugleiste zum selektiven Annehmen (*Accept*) oder Verwerfen (*Reject*) von Korrekturen direkt im Quelltext.

---

## 8. Synchroner Mermaid-Renderer via Pele (`pele.run`)

- **Status:** Evaluation & Prototyping (Oktober 2026)
- **Komponenten:** `src/lib/markdown.ts`, `src/components/Preview.vue`, `src/lib/htmlExporter.ts`, `src/styles.css`
- **Referenz:** [`pele.run`](https://pele.run) (Steph Ango / kepano, MIT, Zero Dependencies)

### Hintergrund & Motivation
ZenTauri nutzt aktuell die offizielle `mermaid`-Bibliothek (v11/12). Obwohl Mermaid mächtig ist, bringt es signifikante Nachteile für einen nativen, leichtgewichtigen Desktop-Editor mit:
1. **Enorme Bundle-Größe:** Mermaid zersplittert im Vite-Build in über 20 Chunks (`mermaid.core` 605 kB, `cytoscape.esm` 443 kB, `cynefin` 690 kB, `architectureDiagram` 151 kB, etc.) mit einem Gesamtgewicht von über 2,5 MB minifiziert.
2. **Asynchrone DOM-Mutation & Race Conditions:** Mermaid rendert ausschließlich asynchron im DOM (`await mermaid.run()`). Dies erzwingt in `Preview.vue` künstliche Debounce-Timer (`setTimeout(200)`), Request-IDs (`mermaidRunId`) und sichtbares Flackern/Nachladen bei jedem Tastendruck im Editor.
3. **Schwieriges Theming:** Mermaid injiziert Inline-Styles in SVG-Elemente. Der Wechsel zwischen Tag- und Nachtmodus (Birchville Pergament `#fcf9f2` ↔ Kerzenlicht `#0a1628`) erfordert ein komplettes Neuinitialisieren und Neu-Rendern aller Diagramme.
4. **Fehlende Diagramme im Standalone-HTML-Export:** Der Standalone-Export (`src/lib/htmlExporter.ts`) nutzt aus Sicherheitsgründen eine strikte Content Security Policy (`script-src 'none'`). Da Mermaid Client-JavaScript benötigt, blieben Diagramme im exportierten HTML ungerendert als roher `<pre class="mermaid">`-Codeblock.

### Die Vorteile von `pele` für Zentauri
Pele ist ein hochgradig optimierter, abhängigkeitsfreier Mermaid-Renderer (kompatibel mit Mermaid 12.1 Syntax):

1. **Synchrones Rendern (Zero-Lag):**
   - Pele stellt eine synchrone `render(code)`-Funktion bereit: `const { svg } = render(code);`.
   - Das Diagramm-Rendering kann direkt synchron in der `markdown-it`-Fence-Rule (`src/lib/markdown.ts`) erfolgen.
   - Beseitigt `mermaidDebounceTimer`, `mermaidRunId` und jegliche DOM-Query-Mutationen in `Preview.vue`.
2. **Birchville-Theming via native CSS-Variablen:**
   - Pele steuert alle Diagrammfarben über standardisierte CSS-Custom-Properties (`--pele-bg`, `--pele-fg`, `--pele-surface`, `--pele-line`, `--pele-accent`, etc.).
   - Farbwechsel bei Theme-Umschaltung erfolgen verzögerungsfrei per CSS, ohne dass SVGs neu berechnet oder neu gerendert werden müssen.
   - Nahtlose Harmonie mit den Birchville Scholarly Synthesis Farbwerten (`#b45309` Warm Amber / `#eab308` Kerzengold).
3. **Echtes Vektor-Embedding im Standalone-HTML-Export:**
   - Da `pele.render()` ohne Headless-Browser oder DOM auskommt, können fertige, voll funktionsfähige Vektor-SVGs direkt in die exportierte `.html`-Datei eingebettet werden – unter Beibehaltung von `script-src 'none'`.
4. **Dramatische Verschlankung des Distribution-Bundles:**
   - Reduktion des JS-Bundles um über 2 MB.

### Architektur- & Migrationsplan:
- **Phase A (Machbarkeits- & Feature-Check):**
  - Syntax-Abdeckung gängiger Diagrammtypen (Flowchart, Sequence, State, Class, ER).
  - Test des synchronen Markdown-It-Plugins.
- **Phase B (Integration & Theming):**
  - Implementierung in `src/lib/markdown.ts` mit Fallback-Handling bei Syntaxfehlern.
  - Definition des Birchville-Farbmappings in `src/payer-theme.css` und `src/styles.css`.
- **Phase C (Bereinigung):**
  - Entfernung von `mermaid` aus `package.json`.
  - Bereinigung von Debounce-Logik in `Preview.vue`.
  - Aktualisierung der Vitest-Suites (`Preview.test.ts`, `markdown.test.ts`).







