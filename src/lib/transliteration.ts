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

/**
 * Transliterates IAST to Devanagari via native Rust Vidyut engine.
 */
export async function iastToDevanagari(text: string): Promise<string> {
  if (!text) return text;
  return await invoke<string>("transliterate_sanskrit", {
    text,
    from: "iast",
    to: "devanagari",
  });
}

/**
 * Transliterates Devanagari to IAST via native Rust Vidyut engine.
 */
export async function devanagariToIast(text: string): Promise<string> {
  if (!text) return text;
  return await invoke<string>("transliterate_sanskrit", {
    text,
    from: "devanagari",
    to: "iast",
  });
}

/**
 * Smart bidirectional toggle (IAST <-> Devanagari):
 * If the input contains Devanagari, convert Devanagari -> IAST.
 * Otherwise, convert IAST -> Devanagari.
 */
export async function toggleTransliteration(text: string): Promise<string> {
  if (!text) return text;
  return await invoke<string>("toggle_transliteration_scheme", {
    text,
    scheme: "iast",
  });
}

/**
 * Transliterates Harvard-Kyoto (HK) to Devanagari via native Rust Vidyut engine.
 */
export async function hkToDevanagari(text: string): Promise<string> {
  if (!text) return text;
  return await invoke<string>("transliterate_sanskrit", {
    text,
    from: "hk",
    to: "devanagari",
  });
}

/**
 * Transliterates Devanagari to Harvard-Kyoto (HK) via native Rust Vidyut engine.
 */
export async function devanagariToHk(text: string): Promise<string> {
  if (!text) return text;
  return await invoke<string>("transliterate_sanskrit", {
    text,
    from: "devanagari",
    to: "hk",
  });
}

/**
 * Smart bidirectional toggle (Harvard-Kyoto <-> Devanagari):
 * If the input contains Devanagari, convert Devanagari -> Harvard-Kyoto.
 * Otherwise, convert Harvard-Kyoto -> Devanagari.
 */
export async function toggleHkTransliteration(text: string): Promise<string> {
  if (!text) return text;
  return await invoke<string>("toggle_transliteration_scheme", {
    text,
    scheme: "hk",
  });
}

/**
 * Smart bidirectional toggle for a specified scheme ('iast' or 'hk').
 */
export async function toggleSchemeTransliteration(
  text: string,
  scheme: TransliterationScheme = "iast",
): Promise<string> {
  if (!text) return text;
  return await invoke<string>("toggle_transliteration_scheme", {
    text,
    scheme,
  });
}

/**
 * Finds the Sanskrit/IAST/Harvard-Kyoto/Devanagari word range around a given character position.
 */
export function findSanskritWordRange(
  doc: string,
  pos: number,
): { from: number; to: number } | null {
  const charRegex = /[\p{L}\p{M}\u0900-\u097F']/u;
  if (pos < 0 || pos >= doc.length || !charRegex.test(doc[pos])) {
    return null;
  }
  let from = pos;
  let to = pos;

  while (from > 0 && charRegex.test(doc[from - 1])) {
    from--;
  }
  while (to < doc.length && charRegex.test(doc[to])) {
    to++;
  }

  return from < to ? { from, to } : null;
}
