/**
 * Philological Collation & Diff Engine for Zentauri
 * 
 * Provides word- and character-level collation diffs between text/markdown documents.
 * Unlike developer git-diffs, this preserves scholarly prose formatting, Sanskrit typography,
 * and highlights intra-word transliteration and diacritic variations (e.g. samskrtam ⇄ saṃskṛtam).
 */

import { renderMarkdown } from "./markdown";

export interface DiffStats {
  deletions: number;
  additions: number;
  modifications: number;
  totalDiffs: number;
}

export interface CollationResult {
  leftRenderedHtml: string;
  rightRenderedHtml: string;
  leftRawHtml: string;
  rightRawHtml: string;
  stats: DiffStats;
}

type DiffOp = "equal" | "delete" | "insert";

interface DiffToken {
  op: DiffOp;
  value: string;
}

/**
 * Tokenizes text into words, whitespace, and punctuation/symbols,
 * properly supporting German umlauts, Sanskrit IAST diacritics, and Devanagari.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  // Unicode ranges:
  // \u00C0-\u024F: Latin Extended A & B (ā, ī, ū, ṛ, ṝ, ḷ, ḹ, etc.)
  // \u1E00-\u1EFF: Latin Extended Additional (ṃ, ḥ, ṅ, ñ, ṭ, ḍ, ṇ, ś, ṣ, etc.)
  // \u0900-\u097F: Devanāgarī
  const regex = /(\s+|[^\w\s\u00C0-\u024F\u1E00-\u1EFF\u0900-\u097F]+)/u;
  return text.split(regex).filter((t) => t.length > 0);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const WORD_TOKEN_RE = /^[\w\u00C0-\u024F\u1E00-\u1EFF\u0900-\u097F]+$/u;
const MAX_MYERS_D = 1024;

function isWordToken(token: string): boolean {
  return WORD_TOKEN_RE.test(token);
}

/**
 * Standard Myers Diff Algorithm O(ND) with prefix/suffix trimming and MAX_D fallback.
 */
function myersDiff<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean = (x, y) => x === y): DiffToken[] {
  let start = 0;
  let endA = a.length;
  let endB = b.length;

  while (start < endA && start < endB && equals(a[start], b[start])) {
    start++;
  }
  while (endA > start && endB > start && equals(a[endA - 1], b[endB - 1])) {
    endA--;
    endB--;
  }

  const prefix: DiffToken[] = [];
  for (let i = 0; i < start; i++) {
    prefix.push({ op: "equal", value: String(a[i]) });
  }

  const suffix: DiffToken[] = [];
  for (let i = endA; i < a.length; i++) {
    suffix.push({ op: "equal", value: String(a[i]) });
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;

  if (n === 0 && m === 0) return prefix;
  if (n === 0) {
    return [...prefix, ...midB.map((val) => ({ op: "insert" as const, value: String(val) })), ...suffix];
  }
  if (m === 0) {
    return [...prefix, ...midA.map((val) => ({ op: "delete" as const, value: String(val) })), ...suffix];
  }

  const max = Math.min(n + m, MAX_MYERS_D);
  const v: Record<number, number> = { 1: 0 };
  const trace: Record<number, number>[] = [];

  for (let d = 0; d <= max; d++) {
    const snapshot: Record<number, number> = {};
    for (let k = -d; k <= d; k += 2) {
      if (v[k - 1] !== undefined) snapshot[k - 1] = v[k - 1];
      if (v[k + 1] !== undefined) snapshot[k + 1] = v[k + 1];
    }
    trace.push(snapshot);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) {
        x = v[k + 1] ?? 0;
      } else {
        x = (v[k - 1] ?? 0) + 1;
      }
      let y = x - k;

      while (x < n && y < m && equals(midA[x], midB[y])) {
        x++;
        y++;
      }
      v[k] = x;

      if (x >= n && y >= m) {
        const revScript: DiffToken[] = [];
        let curX = n;
        let curY = m;

        for (let step = d; step > 0; step--) {
          const vPrev = trace[step];
          const kPrev = curX - curY;
          let prevK: number;
          if (kPrev === -step || (kPrev !== step && (vPrev[kPrev - 1] ?? -1) < (vPrev[kPrev + 1] ?? -1))) {
            prevK = kPrev + 1;
          } else {
            prevK = kPrev - 1;
          }
          const prevX = vPrev[prevK] ?? 0;
          const prevY = prevX - prevK;

          while (curX > prevX && curY > prevY) {
            revScript.push({ op: "equal", value: String(midA[curX - 1]) });
            curX--;
            curY--;
          }

          if (curX === prevX) {
            revScript.push({ op: "insert", value: String(midB[curY - 1]) });
            curY--;
          } else {
            revScript.push({ op: "delete", value: String(midA[curX - 1]) });
            curX--;
          }
        }

        while (curX > 0 && curY > 0) {
          revScript.push({ op: "equal", value: String(midA[curX - 1]) });
          curX--;
          curY--;
        }

        revScript.reverse();
        return [...prefix, ...revScript, ...suffix];
      }
    }
  }

  // Fallback for very large diffs exceeding MAX_MYERS_D
  return [
    ...prefix,
    ...midA.map((val) => ({ op: "delete" as const, value: String(val) })),
    ...midB.map((val) => ({ op: "insert" as const, value: String(val) })),
    ...suffix,
  ];
}

/**
 * Computes character-level diff and similarity ratio in a single pass.
 */
function diffWordPair(
  oldWord: string,
  newWord: string,
): { leftHtml: string; rightHtml: string; similarity: number } {
  if (oldWord === newWord) {
    const esc = escapeHtml(oldWord);
    return { leftHtml: esc, rightHtml: esc, similarity: 1 };
  }

  const charsA = Array.from(oldWord);
  const charsB = Array.from(newWord);
  if (charsA.length === 0 || charsB.length === 0) {
    return {
      leftHtml: escapeHtml(oldWord),
      rightHtml: escapeHtml(newWord),
      similarity: 0,
    };
  }

  const charDiff = myersDiff(charsA, charsB);
  let leftHtml = "";
  let rightHtml = "";
  let matching = 0;

  for (const item of charDiff) {
    const esc = escapeHtml(item.value);
    if (item.op === "equal") {
      matching += Array.from(item.value).length;
      leftHtml += esc;
      rightHtml += esc;
    } else if (item.op === "delete") {
      leftHtml += `<span class="diff-char-del">${esc}</span>`;
    } else if (item.op === "insert") {
      rightHtml += `<span class="diff-char-ins">${esc}</span>`;
    }
  }

  const similarity = (2 * matching) / (charsA.length + charsB.length);
  return { leftHtml, rightHtml, similarity };
}

/**
 * Computes a philological collation diff between two Markdown/Text documents.
 */
export function computeCollationDiff(leftText: string, rightText: string): CollationResult {
  const tokensA = tokenizeWords(leftText);
  const tokensB = tokenizeWords(rightText);

  const rawDiff = myersDiff(tokensA, tokensB);

  let additions = 0;
  let deletions = 0;
  let modifications = 0;

  let leftAnnotatedMd = "";
  let rightAnnotatedMd = "";
  let leftRawHtml = "";
  let rightRawHtml = "";

  let i = 0;
  while (i < rawDiff.length) {
    const item = rawDiff[i];

    if (item.op === "equal") {
      leftAnnotatedMd += item.value;
      rightAnnotatedMd += item.value;
      const esc = escapeHtml(item.value);
      leftRawHtml += esc;
      rightRawHtml += esc;
      i++;
      continue;
    }

    // Check for paired substitution: delete followed by insert (or insert followed by delete)
    const nextItem = i + 1 < rawDiff.length ? rawDiff[i + 1] : null;
    const isPair =
      nextItem &&
      ((item.op === "delete" && nextItem.op === "insert") ||
        (item.op === "insert" && nextItem.op === "delete"));

    if (isPair) {
      const delItem = item.op === "delete" ? item : nextItem;
      const insItem = item.op === "insert" ? item : nextItem;

      const isDelWord = !/^\s+$/.test(delItem.value);
      const isInsWord = !/^\s+$/.test(insItem.value);

      if (isDelWord && isInsWord) {
        modifications++;
        const { leftHtml, rightHtml, similarity } = diffWordPair(delItem.value, insItem.value);

        const leftMark =
          similarity >= 0.3
            ? `<mark class="diff-substitution diff-removed" title="Variante im Vergleich: ${escapeHtml(insItem.value)}">${leftHtml}</mark>`
            : `<mark class="diff-substitution diff-removed" title="Variante: ${escapeHtml(insItem.value)}">${escapeHtml(delItem.value)}</mark>`;
        const rightMark =
          similarity >= 0.3
            ? `<mark class="diff-substitution diff-added" title="Referenzfassung: ${escapeHtml(delItem.value)}">${rightHtml}</mark>`
            : `<mark class="diff-substitution diff-added" title="Referenz: ${escapeHtml(delItem.value)}">${escapeHtml(insItem.value)}</mark>`;

        leftAnnotatedMd += isWordToken(delItem.value) ? leftMark : delItem.value;
        rightAnnotatedMd += isWordToken(insItem.value) ? rightMark : insItem.value;
        leftRawHtml += leftMark;
        rightRawHtml += rightMark;

        i += 2;
        continue;
      }
    }

    // Single deletion
    if (item.op === "delete") {
      const isWhitespace = /^\s+$/.test(item.value);
      if (!isWhitespace) {
        deletions++;
        const esc = escapeHtml(item.value);
        const mark = `<mark class="diff-deletion" title="Gelöscht / Nur in Referenz">${esc}</mark>`;
        leftAnnotatedMd += isWordToken(item.value) ? mark : item.value;
        leftRawHtml += mark;
      } else {
        leftAnnotatedMd += item.value;
        leftRawHtml += escapeHtml(item.value);
      }
      i++;
      continue;
    }

    // Single insertion
    if (item.op === "insert") {
      const isWhitespace = /^\s+$/.test(item.value);
      if (!isWhitespace) {
        additions++;
        const esc = escapeHtml(item.value);
        const mark = `<mark class="diff-addition" title="Eingefügt / Nur im Neusatz">${esc}</mark>`;
        rightAnnotatedMd += isWordToken(item.value) ? mark : item.value;
        rightRawHtml += mark;
      } else {
        rightAnnotatedMd += item.value;
        rightRawHtml += escapeHtml(item.value);
      }
      i++;
      continue;
    }

    i++;
  }

  const leftRenderedHtml = renderMarkdown(leftAnnotatedMd, { sourceLines: true });
  const rightRenderedHtml = renderMarkdown(rightAnnotatedMd, { sourceLines: true });

  const stats: DiffStats = {
    deletions,
    additions,
    modifications,
    totalDiffs: deletions + additions + modifications,
  };

  return {
    leftRenderedHtml,
    rightRenderedHtml,
    leftRawHtml,
    rightRawHtml,
    stats,
  };
}
