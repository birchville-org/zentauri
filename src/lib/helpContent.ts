export interface HelpChapter {
  id: string;
  title: string;
  content: string;
}

const welcomeContent = `# Welcome to Zentauri

ZenTauri is an integrated desktop workbench for digital humanities, Sanskrit philology, and critical text collation, structured around three dedicated work-modes:
1. **Mode 1 (Markdown Authoring):** Sanskrit grammar lessons, notes, and essays with Payer-v2 containers, IAST/Devanāgarī chevrons, KaTeX math rendering, and Typst PDF export.
2. **Mode 2 (Synoptic Edition & Master-JSON):** Segmented editing of historical scans (\`book.json\` AST format) with scan-synchronous split-pane alignment.
3. **Mode 3 (Dual PDF QA & Proofing):** High-precision vector PDF collation (\`hayro_svg\`) with normalized bounding-box annotations and 1-click AI review prompts.

::: note-box
**Layout Philosophy: Semantic Content First**  
ZenTauri focuses on compiling clean, semantic Markdown into standardized HTML and publication-ready Typst PDFs.

ZenTauri deliberately provides a focused, media-neutral set of scholarly syntax extensions (\`::: grammar-box\`, \`::: warning-box\`, \`::: verse-box\`, \`::: note-box\`, \`::: center\`, \`:indent\`, \`:br\`, and MultiMarkdown table cell merging) to facilitate structured, didactic layouting directly within the text flow.
:::

## Shortcuts
- **Settings:** Click the ⚙️ icon to change themes or font sizes.
- **Help:** Click the ? icon to open this guide.
- **Vim Mode:** Toggle Vim mode from the toolbar if you prefer keyboard navigation.
- **Cheatsheet:** A quick reference to standard and scholarly Markdown.
- **Transliteration (IAST ⇄ Devanāgarī):** \`⌥⌘D\` / \`Ctrl+Alt+D\` or \`F4\`
- **Transliteration (Harvard-Kyoto ⇄ Devanāgarī):** \`⌥⌘H\` / \`Ctrl+Alt+H\` or \`Shift+F4\`

---
Checkout the other help files to learn about advanced extensions!
`;

const infoBoxesContent = `# Extended Info Boxes

ZenTauri uses semantic container syntax to create visually distinct blocks matching the Payer v2 scholarly standard.

## Supported Scholarly Containers

Use the \`:::\` syntax to create a box:

:::grammar-box
**Grammar Paradigm:**
Normative grammar rules, morphological paradigms, and phonetic sound laws (gold border).
:::

:::warning-box
**Warning & Caution:**
Didactic alerts, false friends, and linguistic pitfalls (terracotta/signal border).
:::

:::verse-box
**Verse & Metrik:**
Ślokas, mantras, metrical schemas, and indented stanzas.
:::

:::note-box
**Philological Notes:**
Philological commentary, textual criticism, realia, and manuscript citations (slate border).
:::

You can also center text blocks:
:::center
This text is centered.
:::

## Nesting Boxes

You can nest boxes inside each other. To do this, the outer box must have more colons than the inner box (e.g., 4 colons for the outer box, 3 for the inner box):

::::grammar-box
This is the outer grammar box with 4 colons (\`::::grammar-box\`).

:::no-header
| Nested | Table |
|---|---|
| Inside | Box |
:::

::::
`;

const scholarlyContent = `# Scholarly & Math Extensions

Zentauri supports extended syntax for academic writing.

## Mathematics (KaTeX)
Use \`$\` for inline math and \`$$\` for block math. The math syntax follows **KaTeX** (standard LaTeX math subset).

- **Inline Math:** \`$E=mc^2$\` renders as $E=mc^2$
- **Square Root:** \`$\\sqrt{a^2 + b^2} = c$\` renders as $\\sqrt{a^2 + b^2} = c$
- **Exponents / Subscripts:** \`$2^{10} = 1024$\` renders as $2^{10} = 1024$ and \`$\\text{H}_2\\text{O}$\` renders as $\\text{H}_2\\text{O}$

### Block Math Example:
$$
\\int_{a}^{b} x^2 \\,dx = \\frac{b^3 - a^3}{3}
$$

## Extended Inline Formatting (Payer Standard)

- **Signal Red Highlight:** Extended Markdown syntax \`:sig[Signal Red Text]\` renders as: :sig[Signal Red Text]
- **Yellow Highlighter (Marker):** Extended Markdown syntax \`:mark[Yellow Highlight]\` renders as: :mark[Yellow Highlight]
- **Sanskrit Formatting:** Extended Markdown syntax \`《संस्कृतम्》\` renders as: 《संस्कृतम्》
- **Inline Line Break:** Extended Markdown syntax \`:br\` inserts an in-cell line break.
- **Inline Indent:** Extended Markdown syntax \`:indent\` inserts an in-cell tab indentation.
`;

const advancedContent = `# Advanced Formatting

## Tables with Cell Merging (Rowspan & Colspan)
Zentauri supports MultiMarkdown table cell merging:

- **Vertical Merging (Rowspan):** Place \`| ^^ |\` in the cell directly below to merge it vertically.
- **Horizontal Merging (Colspan):** Place double/triple pipes \`|||\` or \`| text ||\` to merge cells horizontally across columns.

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Spanning across 3 columns |||
| Rowspan Cell | Column B | Column C |
| ^^ | Column B2 | Column C2 |

## Mermaid Diagrams
Create flowcharts, sequence diagrams, and more using \`mermaid\` code blocks.

\`\`\`mermaid
graph TD
  A[Hard] -->|Text| B(Round)
  B --> C{Decision}
  C -->|One| D[Result 1]
  C -->|Two| E[Result 2]
\`\`\`
`;

const developerGuideContent = `# Developer Guide: Customizing Syntax

Zentauri uses an advanced, highly extensible \`markdown-it\` pipeline to render its Markdown. 

---

## 1. Zero-Code Custom Inline Styling

Zentauri supports zero-code custom inline elements via CSS without modifying any parser code:

1. **Write any directive in Markdown:**  
   \`\`\`markdown
   This is a :my-custom-style[highlighted badge] in Zentauri.
   \`\`\`
   *(Unregistered directives automatically fall back to \`<span class="my-custom-style">Text</span>\`)*
2. **Style it in your \`custom.css\` (or \`src/payer-theme.css\`):**  
   \`\`\`css
   .my-custom-style {
     background-color: #e0e7ff;
     color: #3730a3;
     padding: 0.1em 0.4em;
     border-radius: 4px;
   }
   \`\`\`

---

## 2. New Block Containers

Because the Markdown parser needs to know block names in advance, we have pre-registered five dummy containers for you: \`custom1\`, \`custom2\`, \`custom3\`, \`custom4\`, and \`custom5\`. 

You can use them immediately in Markdown without recompiling:
\`\`\`markdown
::: custom1 [My Custom Title]
This is my own custom box!
:::
\`\`\`

To style it, just target the class in your \`custom.css\`:
\`\`\`css
.custom-block.custom1 {
  background-color: #e0f2fe;
  border-left: 4px solid #0284c7;
  padding: 1rem;
}
\`\`\`

If you need *more* than five custom containers (or if you want to rename existing containers), you will need to register them in the Zentauri source code first:
1. Open \`src/lib/markdown.ts\`
2. Scroll to the plugin configuration and add your box to the \`blockContainers\` array:
   \`\`\`typescript
   { name: "my-box", className: "my-box" },
   \`\`\`
3. Recompile Zentauri.
`;

const vimContent = `# Vim Mode

Zentauri includes a full Vim emulator for power users who prefer keyboard-centric text editing. You can toggle this mode using the "Vim Mode" button in the top toolbar.

## Basic Modes
- **Normal Mode:** This is the default mode when Vim is active. Keys like \`j\` and \`k\` navigate instead of typing characters.
- **Insert Mode:** Press \`i\` or \`a\` to enter Insert Mode. Now you can type text normally.
- **Visual Mode:** Press \`v\` to start selecting text.

## Escaping Insert Mode
To return to Normal Mode from Insert or Visual mode, simply press the **\`Esc\`** key.

## Important Navigation Commands
| Key | Action |
|---|---|
| \`h\`, \`j\`, \`k\`, \`l\` | Move Left, Down, Up, Right |
| \`w\` / \`b\` | Jump forward / backward by one word |
| \`0\` / \`$\` | Jump to beginning / end of the line |
| \`gg\` / \`G\` | Jump to top / bottom of the document |

## Editing Commands
| Key | Action |
|---|---|
| \`x\` | Delete character under cursor |
| \`dd\` | Delete current line |
| \`yy\` | Yank (copy) current line |
| \`p\` | Paste after cursor |
| \`u\` / \`Ctrl+r\` | Undo / Redo |

> [!TIP]
> **Saving:** You can type \`:w\` and press Enter in Normal Mode to save your document, just like in a real Vim environment! Alternatively, \`Cmd+S\` (or \`Ctrl+S\`) always works.
`;

export const HELP_CHAPTERS: HelpChapter[] = [
  { id: "welcome", title: "Welcome", content: welcomeContent },
  { id: "vim", title: "Vim Mode", content: vimContent },
  { id: "info_boxes", title: "Info Boxes", content: infoBoxesContent },
  { id: "scholarly", title: "Scholarly & Math", content: scholarlyContent },
  { id: "advanced", title: "Advanced Formatting", content: advancedContent },
  {
    id: "developer_guide",
    title: "Developer Guide",
    content: developerGuideContent,
  },
];
