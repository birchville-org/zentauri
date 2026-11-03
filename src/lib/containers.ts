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
  { name: "custom1", className: "custom1" },
  { name: "custom2", className: "custom2" },
  { name: "custom3", className: "custom3" },
  { name: "custom4", className: "custom4" },
  { name: "custom5", className: "custom5" },

  // ── VitePress Standard-Container ──
  { name: "info", className: "info" },
  { name: "info-box", className: "info-box info" },
  { name: "infobox", className: "info-box info" },
  { name: "tip", className: "tip" },
  { name: "warning", className: "warning" },
  { name: "danger", className: "danger" },
  { name: "details", className: "details" },
];

export const REGISTERED_CONTAINER_NAMES: ReadonlySet<string> = new Set(
  BLOCK_CONTAINERS.map((c) => c.name),
);
