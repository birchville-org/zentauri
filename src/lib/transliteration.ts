import Sanscript from "@indic-transliteration/sanscript";
import { invoke } from "@tauri-apps/api/core";

/**
 * Supported transliteration schemes for bidirectional conversion with Devanagari.
 */
export type TransliterationScheme = "iast" | "hk";

/**
 * Checks if the string contains Devanagari characters.
 */
export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function isTauriAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__,
    )
  );
}

/**
 * Helper to transliterate text while preserving directive wrappers (:sig[...] and :mark[...])
 * and citation chevrons (《...》 and ⟪...⟫), safely handling nested brackets.
 */
function transformPreservingDirectives(
  text: string,
  transform: (chunk: string) => string,
): string {
  if (!text) return text;
  if (text.startsWith("《") && text.endsWith("》")) {
    return `《${transformPreservingDirectives(text.slice(1, -1), transform)}》`;
  }
  if (text.startsWith("⟪") && text.endsWith("⟫")) {
    return `⟪${transformPreservingDirectives(text.slice(1, -1), transform)}⟫`;
  }

  let result = "";
  let i = 0;
  while (i < text.length) {
    const sigIdx = text.indexOf(":sig[", i);
    const markIdx = text.indexOf(":mark[", i);
    let nextIdx = -1;
    let prefix = "";

    if (sigIdx !== -1 && (markIdx === -1 || sigIdx < markIdx)) {
      nextIdx = sigIdx;
      prefix = ":sig[";
    } else if (markIdx !== -1) {
      nextIdx = markIdx;
      prefix = ":mark[";
    }

    if (nextIdx === -1) {
      result += transform(text.slice(i));
      break;
    }

    if (nextIdx > i) {
      result += transform(text.slice(i, nextIdx));
    }

    let depth = 1;
    let j = nextIdx + prefix.length;
    while (j < text.length && depth > 0) {
      if (text[j] === "[") depth++;
      else if (text[j] === "]") depth--;
      j++;
    }

    if (depth === 0) {
      const inner = text.slice(nextIdx + prefix.length, j - 1);
      result += `${prefix}${transform(inner)}]`;
      i = j;
    } else {
      // Unclosed directive, treat remaining segment as text
      result += transform(text.slice(nextIdx, j));
      i = j;
    }
  }

  return result;
}

/**
 * Client-side Sanscript fallback for browser mode or when Tauri IPC is not available.
 */
export function jsTransliterate(
  text: string,
  from: "iast" | "hk" | "devanagari",
  to: "iast" | "hk" | "devanagari",
): string {
  if (!text || from === to) return text;
  let normalized = text;
  if (from === "iast") {
    normalized = normalized.replace(/ṁ/g, "ṃ").replace(/Ṁ/g, "Ṃ");
  }
  return transformPreservingDirectives(normalized, (chunk) => {
    if (!chunk) return "";
    return Sanscript.t(chunk, from, to);
  });
}

/**
 * Unified transliteration runner routing to native Rust Vidyut when Tauri is present,
 * with explicit logging on backend failure before falling back to Sanscript.
 */
async function transliterate(
  text: string,
  from: "iast" | "hk" | "devanagari",
  to: "iast" | "hk" | "devanagari",
): Promise<string> {
  if (!text || from === to) return text;
  if (isTauriAvailable()) {
    try {
      return await invoke<string>("transliterate_sanskrit", {
        text,
        from,
        to,
      });
    } catch (err) {
      console.warn(
        "Tauri transliterate_sanskrit IPC error, falling back to Sanscript:",
        err,
      );
      return jsTransliterate(text, from, to);
    }
  }
  return jsTransliterate(text, from, to);
}

/**
 * Transliterates IAST to Devanagari via native Rust Vidyut engine (with JS Sanscript fallback).
 */
export function iastToDevanagari(text: string): Promise<string> {
  return transliterate(text, "iast", "devanagari");
}

/**
 * Transliterates Devanagari to IAST via native Rust Vidyut engine (with JS Sanscript fallback).
 */
export function devanagariToIast(text: string): Promise<string> {
  return transliterate(text, "devanagari", "iast");
}

/**
 * Transliterates Harvard-Kyoto (HK) to Devanagari via native Rust Vidyut engine (with JS Sanscript fallback).
 */
export function hkToDevanagari(text: string): Promise<string> {
  return transliterate(text, "hk", "devanagari");
}

/**
 * Transliterates Devanagari to Harvard-Kyoto (HK) via native Rust Vidyut engine (with JS Sanscript fallback).
 */
export function devanagariToHk(text: string): Promise<string> {
  return transliterate(text, "devanagari", "hk");
}

/**
 * Smart bidirectional toggle for a specified scheme ('iast' or 'hk').
 */
export async function toggleSchemeTransliteration(
  text: string,
  scheme: TransliterationScheme = "iast",
): Promise<string> {
  if (!text) return text;
  if (isTauriAvailable()) {
    try {
      return await invoke<string>("toggle_transliteration_scheme", {
        text,
        scheme,
      });
    } catch (err) {
      console.warn(
        "Tauri toggle_transliteration_scheme IPC error, falling back to Sanscript:",
        err,
      );
    }
  }
  const isDeva = containsDevanagari(text);
  if (scheme === "hk") {
    return isDeva
      ? jsTransliterate(text, "devanagari", "hk")
      : jsTransliterate(text, "hk", "devanagari");
  }
  return isDeva
    ? jsTransliterate(text, "devanagari", "iast")
    : jsTransliterate(text, "iast", "devanagari");
}

/**
 * Smart bidirectional toggle (IAST <-> Devanagari):
 * If the input contains Devanagari, convert Devanagari -> IAST.
 * Otherwise, convert IAST -> Devanagari.
 */
export function toggleTransliteration(text: string): Promise<string> {
  return toggleSchemeTransliteration(text, "iast");
}

/**
 * Smart bidirectional toggle (Harvard-Kyoto <-> Devanagari):
 * If the input contains Devanagari, convert Devanagari -> Harvard-Kyoto.
 * Otherwise, convert Harvard-Kyoto -> Devanagari.
 */
export function toggleHkTransliteration(text: string): Promise<string> {
  return toggleSchemeTransliteration(text, "hk");
}

/**
 * Finds the Sanskrit/IAST/Harvard-Kyoto/Devanagari word range around a given character position.
 * Supports cursor directly on word characters or at the immediate end of a word (whitespace/EOF).
 */
export function findSanskritWordRange(
  doc: string,
  pos: number,
): { from: number; to: number } | null {
  const charRegex = /[\p{L}\p{M}\u0900-\u097F']/u;
  let targetPos = pos;

  if (targetPos < 0 || targetPos > doc.length) {
    return null;
  }

  // If pos is on a word character, use it directly
  if (targetPos < doc.length && charRegex.test(doc[targetPos])) {
    // Keep targetPos as is
  } else if (
    (targetPos === doc.length || /\s/.test(doc[targetPos])) &&
    targetPos > 0 &&
    charRegex.test(doc[targetPos - 1])
  ) {
    // Cursor is right at the end of a word (at EOF or directly on whitespace following a word)
    targetPos = targetPos - 1;
  } else {
    return null;
  }

  let from = targetPos;
  let to = targetPos;

  while (from > 0 && charRegex.test(doc[from - 1])) {
    from--;
  }
  while (to < doc.length && charRegex.test(doc[to])) {
    to++;
  }

  return from < to ? { from, to } : null;
}
