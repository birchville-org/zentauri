/**
 * Syntax Cheat Sheet — adapted from Payer's qa_viewer.html
 *
 * Provides structured data about available markdown syntax elements
 * for display in an interactive cheat sheet / syntax reference panel.
 *
 * Each category contains items with:
 *   - label:    The syntax example (code display)
 *   - before:   Text to insert before cursor (or wrapping selection)
 *   - after:    Text to insert after selection (empty = none)
 *   - desc:     Description (shown as tooltip / side label)
 */

export interface SyntaxItem {
  label: string;
  before: string;
  after: string;
  desc: string;
}

export interface SyntaxCategory {
  id: string;
  title: string;
  items: SyntaxItem[];
}

const CHEAT_SHEET: SyntaxCategory[] = [
  // ── Standard Markdown ──────────────────────────────────────
  {
    id: "std",
    title: "Standard Markdown",
    items: [
      {
        label: "# Title",
        before: "# ",
        after: "",
        desc: "H1–H6",
      },
      {
        label: "**bold**",
        before: "**",
        after: "**",
        desc: "Bold",
      },
      {
        label: "*italic*",
        before: "*",
        after: "*",
        desc: "Italic",
      },
      {
        label: "`code`",
        before: "`",
        after: "`",
        desc: "Inline code",
      },
      {
        label: "> Text",
        before: "\n> ",
        after: "",
        desc: "Blockquote",
      },
      {
        label: "- Item",
        before: "\n- ",
        after: "",
        desc: "List",
      },
      {
        label: "[Text](url)",
        before: "[",
        after: "](url)",
        desc: "Link",
      },
      {
        label: "![Alt](path)",
        before: "![",
        after: "](path)",
        desc: "Image",
      },
      {
        label: "| A | B |",
        before: "\n| A | B |\n|---|---|\n| ",
        after: " | |",
        desc: "Table",
      },
      {
        label: "| Colspan ||",
        before: "\n| A | B |\n|---|---|\n| 1 | 2 |\n| 1 ||\n",
        after: "",
        desc: "Table Colspan (Merge columns)",
      },
      {
        label: "| Rowspan ^^ |",
        before: "\n| A | B |\n|---|---|\n| 1 | 2 |\n| ^^ | 2 |\n",
        after: "",
        desc: "Table Rowspan (Merge rows)",
      },
      {
        label: "| Table Spans |",
        before:
          "\n| A | B |\n|---|---|\n| 1 | 2 |\n| 1 ||\n| 1 | 2 |\n| ^^ | 2 |\n",
        after: "",
        desc: "Table (Colspan & Rowspan)",
      },
      {
        label: "---",
        before: "\n---\n",
        after: "",
        desc: "Ruler",
      },
      {
        label: "[^1] Footnote",
        before: "[^1]\n\n[^1]: ",
        after: "",
        desc: "Footnote (reference and definition)",
      },
      {
        label: "Term : Definition",
        before: "\nTerm\n: ",
        after: "",
        desc: "Definition list",
      },
    ],
  },

  // ── Extensions (markdown-it-extensible) ───────────────────
  {
    id: "ext",
    title: "Extensions & Scholarly Directives",
    items: [
      {
        label: ":sig[Signalrot]",
        before: ":sig[",
        after: "]",
        desc: "Signalrot hervorheben (strong.signalrot)",
      },
      {
        label: ":mark[Marker]",
        before: ":mark[",
        after: "]",
        desc: "Gelber Textmarker (mark.marker-yellow)",
      },
      {
        label: "《Sanskrit》",
        before: "《",
        after: "》",
        desc: "Sanskrit Devanāgarī Auszeichnung",
      },
      {
        label: "《Sanskrit ||》",
        before: "《",
        after: " ||》",
        desc: "Sanskrit mit automatischer Doppeldanda (॥)",
      },
      {
        label: ":br",
        before: ":br",
        after: "",
        desc: "Zeilenumbruch innerhalb von Tabellenzellen",
      },
      {
        label: ":indent",
        before: ":indent",
        after: "",
        desc: "Einrückung innerhalb von Tabellenzellen",
      },
    ],
  },

  // ── Scholarly Containers (Payer v2 Minimal-Set) ─────────────
  {
    id: "cnt",
    title: "Scholarly Containers (Payer v2)",
    items: [
      {
        label: "::: grammar-box",
        before: "\n::: grammar-box\n",
        after: "\n:::",
        desc: "Normative Grammatik & Paradigmen (Gold)",
      },
      {
        label: "::: warning-box",
        before: "\n::: warning-box\n",
        after: "\n:::",
        desc: "Didaktische Warnung & Stolperfallen (Terracotta)",
      },
      {
        label: "::: verse-box",
        before: "\n::: verse-box\n",
        after: "\n:::",
        desc: "Ślokas, Mantras, Verse & Metrik",
      },
      {
        label: "::: note-box",
        before: "\n::: note-box\n",
        after: "\n:::",
        desc: "Philologischer Apparat, Realien & Quellen",
      },
      {
        label: "::: indent",
        before: "\n::: indent\n",
        after: "\n:::",
        desc: "Eingerückte Belege & Formenreihen",
      },
      {
        label: "::: media",
        before: "\n::: media\n",
        after: "\n:::",
        desc: "Zentrierte Abbildung mit Bildlegende",
      },
      {
        label: "::: no-header",
        before: "\n::: no-header\n",
        after: "\n:::",
        desc: "Tabelle ohne Kopfzeile (versteckt thead)",
      },
      {
        label: "::: center",
        before: "\n::: center\n",
        after: "\n:::",
        desc: "Zentrierter Textblock (Legacy)",
      },
      {
        label: "::: deleteme-box",
        before: "\n::: deleteme-box\n",
        after: "\n:::",
        desc: "Redaktionelle Notizen (im Druck verborgen)",
      },
    ],
  },

  // ── VitePress Callouts ─────────────────────────────────────
  {
    id: "vitepress",
    title: "VitePress Callouts",
    items: [
      {
        label: "::: tip [Titel]",
        before: "\n::: tip\n",
        after: "\n:::",
        desc: "Tipp-Hinweis (Grün)",
      },
      {
        label: "::: info [Titel]",
        before: "\n::: info\n",
        after: "\n:::",
        desc: "Informations-Hinweis (Blau)",
      },
      {
        label: "::: warning [Titel]",
        before: "\n::: warning\n",
        after: "\n:::",
        desc: "Warnung (Gelb)",
      },
      {
        label: "::: danger [Titel]",
        before: "\n::: danger\n",
        after: "\n:::",
        desc: "Gefahren-Hinweis (Rot)",
      },
      {
        label: "::: details [Titel]",
        before: "\n::: details Details\n",
        after: "\n:::",
        desc: "Aufklappbarer Details-Bereich",
      },
    ],
  },

  // ── Diagramme & Math ───────────────────────────────────────
  {
    id: "diag",
    title: "Diagrams & Math",
    items: [
      {
        label: "```mermaid",
        before: "\n```mermaid\ngraph TD\n  A[Start] --> B[End]\n",
        after: "```\n",
        desc: "Mermaid Diagram",
      },
      {
        label: "$$ Math $$",
        before: "\n$$\n",
        after: "\n$$\n",
        desc: "Math (Block)",
      },
      {
        label: "$ Math $",
        before: "$",
        after: "$",
        desc: "Math (Inline)",
      },
    ],
  },
];

/** Resolve a description. */
export function getItemDesc(item: SyntaxItem, _locale: string): string {
  return item.desc;
}

/** Resolve a category title. */
export function getCategoryTitle(cat: SyntaxCategory, _locale: string): string {
  return cat.title;
}

export { CHEAT_SHEET };
export default CHEAT_SHEET;
