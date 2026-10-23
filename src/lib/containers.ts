export interface ContainerDefinition {
  name: string;
  className: string;
}

export const BLOCK_CONTAINERS: ReadonlyArray<ContainerDefinition> = [
  { name: "warning-box", className: "warning-box" },
  { name: "warningbox", className: "warning-box" },
  { name: "verse-box", className: "verse-box" },
  { name: "versebox", className: "verse-box" },
  { name: "grammar-box2", className: "grammar-box2" },
  { name: "grammarbox2", className: "grammar-box2" },
  { name: "grammar-box", className: "grammar-box" },
  { name: "grammarbox", className: "grammar-box" },
  { name: "deleteme-box", className: "deleteme-box" },
  { name: "deletemebox", className: "deleteme-box" },
  { name: "metrik-schema", className: "verse-box metrik-schema" },
  { name: "metrikschema", className: "verse-box metrik-schema" },
  { name: "note-box", className: "note-box" },
  { name: "notebox", className: "note-box" },
  { name: "literatur-box", className: "note-box" },
  { name: "literatur", className: "note-box" },
  { name: "laut-table", className: "laut-table" },
  { name: "lauttable", className: "laut-table" },
  { name: "media", className: "media" },
  { name: "center", className: "center" },
  { name: "important", className: "warning-box" },
  { name: "indent", className: "indent" },
  { name: "compact", className: "verse-box" },
  { name: "no-header", className: "no-header" },
  { name: "noheader", className: "no-header" },
  { name: "info", className: "info custom-block" },
  { name: "tip", className: "tip custom-block" },
  { name: "warning", className: "warning custom-block" },
  { name: "danger", className: "danger custom-block" },
  { name: "details", className: "details custom-block" },
  { name: "custom1", className: "custom1" },
  { name: "custom2", className: "custom2" },
  { name: "custom3", className: "custom3" },
  { name: "custom4", className: "custom4" },
  { name: "custom5", className: "custom5" },
];

export const REGISTERED_CONTAINER_NAMES: ReadonlySet<string> = new Set(
  BLOCK_CONTAINERS.map((c) => c.name),
);
