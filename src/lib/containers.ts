export interface ContainerDefinition {
  name: string;
  className: string;
}

export const BLOCK_CONTAINERS: ReadonlyArray<ContainerDefinition> = [
  // ── Konsolidiertes Kern-Set (Payer v2 Standard / markdown-it-extensible 1.4.0) ──
  { name: "grammar-box", className: "grammar-box" },
  { name: "grammarbox", className: "grammar-box" },
  { name: "warning-box", className: "warning-box" },
  { name: "warningbox", className: "warning-box" },
  { name: "verse-box", className: "verse-box" },
  { name: "versebox", className: "verse-box" },
  { name: "note-box", className: "note-box" },
  { name: "notebox", className: "note-box" },
  { name: "indent", className: "indent" },
  { name: "media", className: "media" },
  { name: "no-header", className: "no-header" },
  { name: "noheader", className: "no-header" },

  // ── Graceful Aliasing für Alt-Container (Abwärtskompatibilität) ──
  { name: "important", className: "warning-box" },
  { name: "literatur-box", className: "note-box" },
  { name: "literatur", className: "note-box" },
  { name: "compact", className: "verse-box" },

  // ── Strukturelle & Redaktionelle Legacy-Container ──
  { name: "grammar-box2", className: "grammar-box2" },
  { name: "grammarbox2", className: "grammar-box2" },
  { name: "metrik-schema", className: "verse-box metrik-schema" },
  { name: "metrikschema", className: "verse-box metrik-schema" },
  { name: "center", className: "center" },
  { name: "laut-table", className: "laut-table" },
  { name: "lauttable", className: "laut-table" },
  { name: "deleteme-box", className: "deleteme-box" },
  { name: "deletemebox", className: "deleteme-box" },

  // ── User-definierbare Dummy-Container (custom.css Erweiterungen) ──
  { name: "custom1", className: "custom1 custom-block" },
  { name: "custom2", className: "custom2 custom-block" },
  { name: "custom3", className: "custom3 custom-block" },
  { name: "custom4", className: "custom4 custom-block" },
  { name: "custom5", className: "custom5 custom-block" },

  // ── VitePress Standard-Container ──
  { name: "info", className: "info custom-block" },
  { name: "tip", className: "tip custom-block" },
  { name: "warning", className: "warning custom-block" },
  { name: "danger", className: "danger custom-block" },
  { name: "details", className: "details custom-block" },
];

export const REGISTERED_CONTAINER_NAMES: ReadonlySet<string> = new Set(
  BLOCK_CONTAINERS.map((c) => c.name),
);
