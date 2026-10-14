/**
 * Silent Auto-Repair module for Zentauri
 * Automatically fixes common Markdown syntax errors upon save (e.g., container nesting depth,
 * unclosed ::: containers, unclosed Sanskrit brackets 《...》 / ⟪...⟫).
 */

export interface AutoRepairResult {
  repaired: string;
  didRepair: boolean;
  repairedCount: number;
}

export interface ContainerNestingResult {
  repaired: string;
  didRepair: boolean;
  adjustedCount: number;
}

export interface ContainerNestingOptions {
  names?: Iterable<string> | null;
  closeUnclosed?: boolean;
}

export const DEFAULT_CONTAINER_NAMES: ReadonlySet<string> = new Set([
  "grammar-box2",
  "grammarbox2",
  "grammar-box",
  "grammarbox",
  "deleteme-box",
  "deletemebox",
  "metrik-schema",
  "metrikschema",
  "note-box",
  "notebox",
  "laut-table",
  "lauttable",
  "media",
  "center",
  "important",
  "indent",
  "compact",
  "no-header",
  "noheader",
  "info",
  "tip",
  "warning",
  "danger",
  "details",
  "custom1",
  "custom2",
  "custom3",
  "custom4",
  "custom5",
]);

const OPEN_RE = /^([ \t]*)(:{3,})([ \t]*)([a-zA-Z0-9_-]+)(.*)$/;
const CLOSE_RE = /^([ \t]*)(:{3,})[ \t]*$/;
const CODE_FENCE_OPEN_RE = /^[ \t]*(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE_RE = /^[ \t]*(`{3,}|~{3,})[ \t]*$/;

interface ContainerBlock {
  isKnown: boolean;
  openLineIndex: number;
  closeLineIndex: number | null;
  indent: string;
  colons: number;
  space: string;
  name: string;
  rest: string;
  closeIndent: string;
  closeColons: number;
  targetColonsCount: number;
  children: ContainerBlock[];
}

/**
 * Adjusts container colons according to hierarchy depth.
 * Outer containers are rewritten to use strictly more colons than any container nested inside them.
 */
export function adjustContainerNesting(
  src: string,
  options?: ContainerNestingOptions,
): ContainerNestingResult {
  if (!src || src.indexOf(":::") === -1) {
    return { repaired: src, didRepair: false, adjustedCount: 0 };
  }

  const names = options?.names
    ? new Set(Array.from(options.names, (n) => String(n).toLowerCase()))
    : null;

  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const hasTrailingNewline = src.endsWith(eol);
  const rawLines = src.split(eol);
  const lines =
    hasTrailingNewline &&
    rawLines.length > 0 &&
    rawLines[rawLines.length - 1] === ""
      ? rawLines.slice(0, -1)
      : rawLines.slice();

  const stack: ContainerBlock[] = [];
  const roots: ContainerBlock[] = [];
  const allContainers: ContainerBlock[] = [];

  let fenceChar = "";
  let fenceLen = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!fenceChar) {
      const fm = line.match(CODE_FENCE_OPEN_RE);
      if (fm) {
        const char = fm[1][0];
        const len = fm[1].length;
        const infoString = line.slice(fm[0].length);
        if (!infoString.includes(char)) {
          fenceChar = char;
          fenceLen = len;
          continue;
        }
      }
    } else {
      const fm = line.match(CODE_FENCE_CLOSE_RE);
      if (fm && fm[1][0] === fenceChar && fm[1].length >= fenceLen) {
        fenceChar = "";
        fenceLen = 0;
        continue;
      }
      continue;
    }

    const openMatch = line.match(OPEN_RE);
    if (openMatch) {
      const isKnown = !names || names.has(openMatch[4].toLowerCase());
      const block: ContainerBlock = {
        isKnown,
        openLineIndex: i,
        closeLineIndex: null,
        indent: openMatch[1],
        colons: openMatch[2].length,
        space: openMatch[3] || " ",
        name: openMatch[4],
        rest: openMatch[5],
        closeIndent: openMatch[1],
        closeColons: 0,
        targetColonsCount: openMatch[2].length,
        children: [],
      };

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(block);
      } else {
        roots.push(block);
      }
      stack.push(block);
      allContainers.push(block);
      continue;
    }

    const closeMatch = line.match(CLOSE_RE);
    if (closeMatch && stack.length > 0) {
      const top = stack.pop()!;
      top.closeLineIndex = i;
      top.closeIndent = closeMatch[1];
      top.closeColons = closeMatch[2].length;
    }
  }

  function computeTargetColons(block: ContainerBlock): number {
    let maxChildColons = 0;
    for (const child of block.children) {
      maxChildColons = Math.max(maxChildColons, computeTargetColons(child));
    }
    block.targetColonsCount = Math.max(
      block.colons,
      block.children.length > 0 ? maxChildColons + 1 : 3,
      3,
    );
    return block.targetColonsCount;
  }

  for (const root of roots) {
    computeTargetColons(root);
  }

  let didRepair = false;
  let adjustedCount = 0;

  for (const block of allContainers) {
    if (!block.isKnown) continue;

    const openChanged = block.targetColonsCount !== block.colons;
    const closeChanged =
      block.closeLineIndex !== null &&
      block.closeColons !== block.targetColonsCount;

    if (!openChanged && !closeChanged) continue;

    didRepair = true;
    adjustedCount++;

    const newColons = ":".repeat(block.targetColonsCount);
    lines[block.openLineIndex] =
      `${block.indent}${newColons}${block.space}${block.name}${block.rest}`;

    if (block.closeLineIndex !== null) {
      lines[block.closeLineIndex] = `${block.closeIndent}${newColons}`;
    }
  }

  if (options?.closeUnclosed && stack.length > 0) {
    while (stack.length > 0) {
      const unclosed = stack.pop()!;
      if (!unclosed.isKnown) continue;
      didRepair = true;
      adjustedCount++;
      lines.push(`${unclosed.indent}${":".repeat(unclosed.targetColonsCount)}`);
    }
  }

  let repairedText = lines.join(eol);
  if (hasTrailingNewline) {
    repairedText += eol;
  }

  return {
    repaired: repairedText,
    didRepair,
    adjustedCount,
  };
}

export function autoRepairMarkdown(src: string): AutoRepairResult {
  if (!src) {
    return { repaired: src, didRepair: false, repairedCount: 0 };
  }

  let text = src;
  let didRepair = false;
  let repairedCount = 0;

  // 1. Repair container nesting & unclosed containers with matching colon counts
  const nestingResult = adjustContainerNesting(text, { closeUnclosed: true });
  if (nestingResult.didRepair) {
    text = nestingResult.repaired;
    didRepair = true;
    repairedCount += nestingResult.adjustedCount;
  }

  // 2. Sanskrit brackets repair - only per-line outside code blocks, without appending to end of document
  const rawLines = text.split("\n");
  let inCodeFence = false;
  let codeFenceChar = "";
  let codeFenceLen = 0;

  const repairedLines = rawLines.map((line) => {
    const fenceMatch = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceChar = char;
        codeFenceLen = len;
        return line;
      }
      if (char === codeFenceChar && len >= codeFenceLen) {
        inCodeFence = false;
        return line;
      }
    }

    if (inCodeFence) {
      return line;
    }

    let modified = line;
    // Check line-level unclosed 《 ... 》
    const openDouble = (modified.match(/《/g) || []).length;
    const closeDouble = (modified.match(/》/g) || []).length;
    if (openDouble > closeDouble) {
      const diff = openDouble - closeDouble;
      modified += "》".repeat(diff);
      didRepair = true;
      repairedCount += diff;
    }

    // Check line-level unclosed ⟪ ... ⟫
    const openSpecial = (modified.match(/⟪/g) || []).length;
    const closeSpecial = (modified.match(/⟫/g) || []).length;
    if (openSpecial > closeSpecial) {
      const diff = openSpecial - closeSpecial;
      modified += "⟫".repeat(diff);
      didRepair = true;
      repairedCount += diff;
    }

    return modified;
  });

  if (didRepair) {
    text = repairedLines.join("\n");
  }

  return {
    repaired: text,
    didRepair,
    repairedCount,
  };
}
