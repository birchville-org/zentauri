export type WorkMode = "markdown" | "synoptic" | "pdf-qa";

export type MarkdownViewMode = "source" | "split" | "live";

export interface WorkModeMeta {
  id: WorkMode;
  label: string;
  badge: string;
  shortcut: string;
  description: string;
}

export const WORK_MODES: Record<WorkMode, WorkModeMeta> = {
  markdown: {
    id: "markdown",
    label: "Authoring",
    badge: "Modus 1",
    shortcut: "⌘1",
    description: "Fokussiertes Verfassen von Markdown, KaTeX, Sanskrit & Typst-Export",
  },
  synoptic: {
    id: "synoptic",
    label: "Synopse",
    badge: "Modus 2",
    shortcut: "⌘2",
    description: "Segmentierte Master-JSON Edition & Scan-PDF Split-Pane",
  },
  "pdf-qa": {
    id: "pdf-qa",
    label: "Vergleich",
    badge: "Modus 3",
    shortcut: "⌘3",
    description: "2-spaltiger Dokumenten-Vergleich (PDF & Markdown lesend) mit QA-Proofing",
  },
};
