import { EditorView } from "@codemirror/view";

/**
 * Standard Sanskrit IAST Compose Sequences.
 * Allows quick scholarly input without switching OS keyboard layouts.
 * E.g., `.r` => `ṛ`, `-a` => `ā`, `~n` => `ñ`, `'s` => `ś`.
 */
export const SANSKRIT_COMPOSE_MAP: Record<string, string> = {
  // Macrons (Vowels)
  "-a": "ā",
  "-A": "Ā",
  "-i": "ī",
  "-I": "Ī",
  "-u": "ū",
  "-U": "Ū",

  // Underdots (Vocalic liquids, retroflex consonants, anusvāra, visarga)
  ".r": "ṛ",
  ".R": "Ṛ",
  ".l": "ḷ",
  ".L": "Ḷ",
  ".m": "ṃ",
  ".M": "Ṃ",
  ".h": "ḥ",
  ".H": "Ḥ",
  ".t": "ṭ",
  ".T": "Ṭ",
  ".d": "ḍ",
  ".D": "Ḍ",
  ".n": "ṇ",
  ".N": "Ṇ",
  ".s": "ṣ",
  ".S": "Ṣ",

  // Palatal nasal & sibilant
  "~n": "ñ",
  "~N": "Ñ",
  "'s": "ś",
  "'S": "Ś",

  // Long vocalic liquids
  "~r": "ṝ",
  "~R": "Ṝ",
  "~l": "ḹ",
  "~L": "Ḹ",
  "-ṛ": "ṝ",
  "-Ṛ": "Ṝ",
  "-ḷ": "ḹ",
  "-Ḷ": "Ḹ",
};

/**
 * CodeMirror 6 inputHandler extension for Sanskrit Compose-Key shortcuts.
 */
export function sanskritComposeExtension() {
  return EditorView.inputHandler.of((view, from, to, text) => {
    // Only handle single-character insertions with a preceding character
    if (from === 0 || text.length !== 1) {
      return false;
    }

    const prevChar = view.state.doc.sliceString(from - 1, from);
    const key = prevChar + text;
    const replacement = SANSKRIT_COMPOSE_MAP[key];

    if (replacement) {
      view.dispatch({
        changes: { from: from - 1, to, insert: replacement },
        selection: { anchor: from - 1 + replacement.length },
        userEvent: "input.compose.sanskrit",
      });
      return true;
    }

    return false;
  });
}
