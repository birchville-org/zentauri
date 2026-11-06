<script setup lang="ts">
import {
  defaultKeymap,
  history,
  historyKeymap,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches } from "@codemirror/search";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { adjustContainerNesting } from "../lib/auto-repair";
import { directiveGuidelines } from "../lib/editor-extensions/directive-guidelines";
import { livePreviewExtension } from "../lib/editor-extensions/live-preview";
import {
  type TransliterationScheme,
  findSanskritWordRange,
  toggleSchemeTransliteration,
} from "../lib/transliteration";

export interface ScrollInfo {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  ratio: number;
  fractionalLine: number;
  totalLines: number;
}

export interface CursorInfo {
  line: number;
  column: number;
  selectedChars: number;
  totalLines: number;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    vimMode?: boolean;
    livePreview?: boolean;
    lineWrapping?: boolean;
  }>(),
  {
    vimMode: false,
    livePreview: false,
    lineWrapping: true,
  },
);
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "scroll", info: ScrollInfo): void;
  (e: "user-interaction"): void;
  (e: "cursor-change", info: CursorInfo): void;
  (
    e: "history-change",
    status: { canUndo: boolean; canRedo: boolean; canRepeat: boolean },
  ): void;
}>();

const lastHistoryStatus = { canUndo: false, canRedo: false, canRepeat: false };

function emitHistoryStatus() {
  if (!view) return;
  const uDepth = undoDepth(view.state);
  const rDepth = redoDepth(view.state);
  const currentCanUndo = uDepth > 0;
  const currentCanRedo = rDepth > 0;
  const currentCanRepeat = lastCommand !== null;
  if (
    currentCanUndo !== lastHistoryStatus.canUndo ||
    currentCanRedo !== lastHistoryStatus.canRedo ||
    currentCanRepeat !== lastHistoryStatus.canRepeat
  ) {
    lastHistoryStatus.canUndo = currentCanUndo;
    lastHistoryStatus.canRedo = currentCanRedo;
    lastHistoryStatus.canRepeat = currentCanRepeat;
    emit("history-change", {
      canUndo: currentCanUndo,
      canRedo: currentCanRedo,
      canRepeat: currentCanRepeat,
    });
  }
}

function resetHistoryStatus() {
  lastCommand = null;
  lastHistoryStatus.canUndo = false;
  lastHistoryStatus.canRedo = false;
  lastHistoryStatus.canRepeat = false;
  emitHistoryStatus();
}

interface LastCommand {
  type: "wrap" | "insert" | "transliteration";
  before?: string;
  after?: string;
  text?: string;
  scheme?: TransliterationScheme;
}

let lastCommand: LastCommand | null = null;

function insertText(text: string, record = true) {
  if (record) {
    lastCommand = { type: "insert", text };
    emitHistoryStatus();
  }
  if (!view) return;
  const selection = view.state.selection.main;

  if (text.includes(":::")) {
    const docText = view.state.doc.toString();
    const docWithInsert =
      docText.slice(0, selection.from) + text + docText.slice(selection.to);
    const nestingResult = adjustContainerNesting(docWithInsert);
    if (nestingResult.didRepair) {
      const oldDoc = view.state.doc;
      view.dispatch({
        changes: { from: 0, to: oldDoc.length, insert: nestingResult.repaired },
        scrollIntoView: true,
      });
      try {
        const line = oldDoc.lineAt(selection.from);
        const col = selection.from - line.from;
        const newDoc = view.state.doc;
        const targetLineNum = Math.min(line.number, newDoc.lines);
        const newLine = newDoc.line(targetLineNum);
        const newBase = Math.min(newLine.to, newLine.from + col);
        view.dispatch({
          selection: { anchor: Math.min(newDoc.length, newBase + text.length) },
        });
      } catch {
        // fallback
      }
      view.focus();
      return;
    }
  }

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: text },
    selection: { anchor: selection.from + text.length },
    scrollIntoView: true,
  });
  view.focus();
}

function wrapSelection(before: string, after: string, record = true) {
  if (record) {
    lastCommand = { type: "wrap", before, after };
    emitHistoryStatus();
  }
  if (!view) return;
  const docText = view.state.doc.toString();
  const selection = view.state.selection.main;
  const selectedText = view.state.sliceDoc(selection.from, selection.to);

  // 1. Block container logic (:::)
  if (before.includes(":::")) {
    const replacement = `${before}${selectedText}${after}`;
    const docWithReplacement =
      docText.slice(0, selection.from) +
      replacement +
      docText.slice(selection.to);

    const nestingResult = adjustContainerNesting(docWithReplacement);
    if (nestingResult.didRepair) {
      const oldDoc = view.state.doc;
      view.dispatch({
        changes: {
          from: 0,
          to: oldDoc.length,
          insert: nestingResult.repaired,
        },
        scrollIntoView: true,
      });
      try {
        const line = oldDoc.lineAt(selection.from);
        const col = selection.from - line.from;
        const newDoc = view.state.doc;
        const targetLineNum = Math.min(line.number, newDoc.lines);
        const newLine = newDoc.line(targetLineNum);
        const newBase = Math.min(newLine.to, newLine.from + col);
        let newAnchor = Math.min(newDoc.length, newBase + before.length);
        let newHead = Math.min(newDoc.length, newAnchor + selectedText.length);
        if (selectedText.length === 0 && before.includes("[]")) {
          const bracketIndex = before.indexOf("[]");
          newAnchor = Math.min(newDoc.length, newBase + bracketIndex + 1);
          newHead = newAnchor;
        }
        view.dispatch({
          selection: { anchor: newAnchor, head: newHead },
        });
      } catch {
        // fallback
      }
      view.focus();
      return;
    }
  }

  // 2. Inline Toggle & Anti-Duplicate Unwrap Logic (e.g. 《...》, :sig[...], $...$, **...**)
  // Only applies to non-block containers with closing delimiters (after.length > 0)
  if (!before.includes(":::") && after.length > 0) {
    // 2A. Active selection: selection itself is already wrapped in before & after
    if (
      selectedText.length >= before.length + after.length &&
      selectedText.startsWith(before) &&
      selectedText.endsWith(after)
    ) {
      const unwrapped = selectedText.slice(
        before.length,
        selectedText.length - after.length,
      );
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: unwrapped,
        },
        selection: {
          anchor: selection.from,
          head: selection.from + unwrapped.length,
        },
        scrollIntoView: true,
      });
      view.focus();
      return;
    }

    // 2B. Active selection: selection is directly surrounded by before and after in doc
    if (
      selection.from >= before.length &&
      selection.to + after.length <= docText.length &&
      docText.slice(selection.from - before.length, selection.from) ===
        before &&
      docText.slice(selection.to, selection.to + after.length) === after
    ) {
      view.dispatch({
        changes: [
          { from: selection.to, to: selection.to + after.length, insert: "" },
          {
            from: selection.from - before.length,
            to: selection.from,
            insert: "",
          },
        ],
        selection: {
          anchor: selection.from - before.length,
          head: selection.to - before.length,
        },
        scrollIntoView: true,
      });
      view.focus();
      return;
    }

    // 2C. Collapsed cursor: check if cursor is between empty wrapper (e.g. 《|》 or :sig[|])
    if (selection.empty) {
      const pos = selection.from;
      if (
        pos >= before.length &&
        pos + after.length <= docText.length &&
        docText.slice(pos - before.length, pos) === before &&
        docText.slice(pos, pos + after.length) === after
      ) {
        view.dispatch({
          changes: {
            from: pos - before.length,
            to: pos + after.length,
            insert: "",
          },
          selection: {
            anchor: pos - before.length,
            head: pos - before.length,
          },
          scrollIntoView: true,
        });
        view.focus();
        return;
      }

      // Check if cursor is inside an existing wrapper on current line
      const line = view.state.doc.lineAt(pos);
      const lineText = line.text;
      const col = pos - line.from;

      let matchedRange: { start: number; end: number; inner: string } | null =
        null;

      if (before === after) {
        // Symmetrical delimiters (e.g. **, *, $, `, ~~)
        let searchIdx = 0;
        while (searchIdx < lineText.length) {
          const openIdx = lineText.indexOf(before, searchIdx);
          if (openIdx === -1) break;
          const closeIdx = lineText.indexOf(after, openIdx + before.length);
          if (closeIdx === -1) break;
          const segStart = openIdx;
          const segEnd = closeIdx + after.length;
          if (col >= segStart && col <= segEnd) {
            matchedRange = {
              start: line.from + segStart,
              end: line.from + segEnd,
              inner: lineText.slice(openIdx + before.length, closeIdx),
            };
            break;
          }
          searchIdx = segEnd;
        }
      } else {
        // Asymmetrical delimiters (e.g. 《...》, :sig[...])
        let searchIdx = 0;
        while (searchIdx < lineText.length) {
          const openIdx = lineText.indexOf(before, searchIdx);
          if (openIdx === -1) break;
          const closeIdx = lineText.indexOf(after, openIdx + before.length);
          if (closeIdx === -1) break;
          const segStart = openIdx;
          const segEnd = closeIdx + after.length;
          if (col >= segStart && col <= segEnd) {
            matchedRange = {
              start: line.from + segStart,
              end: line.from + segEnd,
              inner: lineText.slice(openIdx + before.length, closeIdx),
            };
            break;
          }
          searchIdx = openIdx + before.length;
        }
      }

      if (matchedRange) {
        view.dispatch({
          changes: {
            from: matchedRange.start,
            to: matchedRange.end,
            insert: matchedRange.inner,
          },
          selection: {
            anchor: matchedRange.start,
            head: matchedRange.start + matchedRange.inner.length,
          },
          scrollIntoView: true,
        });
        view.focus();
        return;
      }

      // If cursor is on a word, wrap or unwrap the word
      const wordRange = findSanskritWordRange(docText, pos);
      if (wordRange) {
        const isWordWrapped =
          wordRange.from >= before.length &&
          wordRange.to + after.length <= docText.length &&
          docText.slice(wordRange.from - before.length, wordRange.from) ===
            before &&
          docText.slice(wordRange.to, wordRange.to + after.length) === after;

        if (isWordWrapped) {
          view.dispatch({
            changes: [
              {
                from: wordRange.to,
                to: wordRange.to + after.length,
                insert: "",
              },
              {
                from: wordRange.from - before.length,
                to: wordRange.from,
                insert: "",
              },
            ],
            selection: {
              anchor: wordRange.from - before.length,
              head: wordRange.to - before.length,
            },
            scrollIntoView: true,
          });
          view.focus();
          return;
        }

        const word = docText.slice(wordRange.from, wordRange.to);
        view.dispatch({
          changes: {
            from: wordRange.from,
            to: wordRange.to,
            insert: `${before}${word}${after}`,
          },
          selection: {
            anchor: wordRange.from + before.length,
            head: wordRange.from + before.length + word.length,
          },
          scrollIntoView: true,
        });
        view.focus();
        return;
      }
    }
  }

  // 3. Standard Wrap fallback
  const replacement = `${before}${selectedText}${after}`;
  let anchor = selection.from + before.length;
  let head = anchor + selectedText.length;
  if (selectedText.length === 0 && before.includes("[]")) {
    const bracketIndex = before.indexOf("[]");
    anchor = selection.from + bracketIndex + 1;
    head = anchor;
  }

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: replacement },
    selection: {
      anchor,
      head,
    },
    scrollIntoView: true,
  });
  view.focus();
}

async function toggleTransliteration(
  scheme: TransliterationScheme = "iast",
  record = true,
) {
  if (record) {
    lastCommand = { type: "transliteration", scheme };
    emitHistoryStatus();
  }
  if (!view) return;
  const state = view.state;
  const docText = state.doc.toString();
  const rangesToUpdate: { from: number; to: number; text: string }[] = [];

  for (const range of state.selection.ranges) {
    let from = range.from;
    let to = range.to;

    if (range.empty) {
      const wordRange = findSanskritWordRange(docText, range.head);
      if (wordRange) {
        from = wordRange.from;
        to = wordRange.to;
      }
    }

    if (from !== to) {
      rangesToUpdate.push({ from, to, text: state.sliceDoc(from, to) });
    }
  }

  if (rangesToUpdate.length === 0) return;

  try {
    const changes = await Promise.all(
      rangesToUpdate.map(async ({ from, to, text }) => {
        const transformed = await toggleSchemeTransliteration(text, scheme);
        return { from, to, insert: transformed };
      }),
    );

    view.dispatch({
      changes,
      userEvent: "input.transliterate",
    });
    view.focus();
  } catch (err) {
    console.error("Transliteration error:", err);
  }
}

function repeatLastCommand(): boolean {
  if (!view || !lastCommand) return false;

  if (
    lastCommand.type === "wrap" &&
    lastCommand.before !== undefined &&
    lastCommand.after !== undefined
  ) {
    wrapSelection(lastCommand.before, lastCommand.after, false);
    return true;
  }

  if (lastCommand.type === "insert" && lastCommand.text !== undefined) {
    insertText(lastCommand.text, false);
    return true;
  }

  if (lastCommand.type === "transliteration" && lastCommand.scheme) {
    toggleTransliteration(lastCommand.scheme, false);
    return true;
  }

  return false;
}

function undoAction(): boolean {
  if (!view) return false;
  return undo(view);
}

function redoAction(): boolean {
  if (!view) return false;
  return redo(view);
}

function focus() {
  if (view) {
    view.focus();
  }
}

function jumpToLine(lineNum: number) {
  if (!view) return;
  try {
    const line = view.state.doc.line(lineNum);
    view.dispatch({
      selection: { anchor: line.from, head: line.from },
      scrollIntoView: true,
    });
    view.focus();
  } catch (e) {
    console.error("Failed to jump to line", e);
  }
}

let isProgrammaticScroll = false;
let rafUnlockId: number | null = null;
let unlockTimer: ReturnType<typeof setTimeout> | null = null;
let programmaticTargetTop: number | null = null;

function clearProgrammaticScrollLock() {
  if (rafUnlockId !== null) {
    cancelAnimationFrame(rafUnlockId);
    rafUnlockId = null;
  }
  if (unlockTimer !== null) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }
  isProgrammaticScroll = false;
  programmaticTargetTop = null;
}

function scheduleUnlock() {
  if (rafUnlockId !== null) {
    cancelAnimationFrame(rafUnlockId);
    rafUnlockId = null;
  }
  if (unlockTimer !== null) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }
  // Double RAF + safety timeout to ensure DOM scroll events from scrollTop updates have fired
  rafUnlockId = requestAnimationFrame(() => {
    rafUnlockId = requestAnimationFrame(() => {
      clearProgrammaticScrollLock();
    });
  });
  unlockTimer = setTimeout(() => {
    clearProgrammaticScrollLock();
  }, 120);
}

function getScrollInfo(): ScrollInfo | null {
  if (!view) return null;
  const scroller = view.scrollDOM;
  const scrollTop = scroller.scrollTop;
  const scrollHeight = scroller.scrollHeight;
  const clientHeight = scroller.clientHeight;
  const maxScroll = scrollHeight - clientHeight;
  const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
  const totalLines = view.state.doc.lines;

  if (scrollTop <= 1) {
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      ratio: 0,
      fractionalLine: 1,
      totalLines,
    };
  }
  if (scrollTop >= maxScroll - 2) {
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      ratio: 1,
      fractionalLine: totalLines,
      totalLines,
    };
  }

  let fractionalLine = 1;
  try {
    const block = view.lineBlockAtHeight(scrollTop);
    const lineObj = view.state.doc.lineAt(block.from);
    const offsetInBlock = scrollTop - block.top;
    const lineRatio =
      block.height > 0
        ? Math.max(0, Math.min(1, offsetInBlock / block.height))
        : 0;
    fractionalLine = lineObj.number + lineRatio;
  } catch {
    fractionalLine = 1 + ratio * (totalLines - 1);
  }

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    ratio,
    fractionalLine,
    totalLines,
  };
}

function scrollToFractionalLine(targetLine: number, fallbackRatio?: number) {
  if (!view) return;
  const scroller = view.scrollDOM;
  const maxScroll = scroller.scrollHeight - scroller.clientHeight;
  if (maxScroll <= 0) return;

  if (targetLine <= 1) {
    isProgrammaticScroll = true;
    programmaticTargetTop = 0;
    scroller.scrollTop = 0;
    scheduleUnlock();
    return;
  }

  const totalLines = view.state.doc.lines;
  if (
    targetLine >= totalLines ||
    (fallbackRatio !== undefined && fallbackRatio >= 0.999)
  ) {
    isProgrammaticScroll = true;
    programmaticTargetTop = maxScroll;
    scroller.scrollTop = maxScroll;
    scheduleUnlock();
    return;
  }

  let targetScrollTop = 0;
  try {
    const intLine = Math.max(1, Math.min(totalLines, Math.floor(targetLine)));
    const remainder = targetLine - intLine;
    const lineObj = view.state.doc.line(intLine);
    const block = view.lineBlockAt(lineObj.from);
    targetScrollTop = block.top + remainder * block.height;
  } catch {
    if (fallbackRatio !== undefined) {
      targetScrollTop = fallbackRatio * maxScroll;
    }
  }

  targetScrollTop = Math.max(
    0,
    Math.min(maxScroll, Math.round(targetScrollTop)),
  );
  isProgrammaticScroll = true;
  programmaticTargetTop = targetScrollTop;
  scroller.scrollTop = targetScrollTop;
  scheduleUnlock();
}

function scrollToRatio(ratio: number) {
  if (!view) return;
  const scroller = view.scrollDOM;
  const maxScroll = scroller.scrollHeight - scroller.clientHeight;
  if (maxScroll <= 0) return;
  const targetScrollTop = Math.max(
    0,
    Math.min(maxScroll, Math.round(ratio * maxScroll)),
  );
  isProgrammaticScroll = true;
  programmaticTargetTop = targetScrollTop;
  scroller.scrollTop = targetScrollTop;
  scheduleUnlock();
}

function handleScroll() {
  if (!view) return;
  const currentTop = view.scrollDOM.scrollTop;
  if (isProgrammaticScroll) {
    if (
      programmaticTargetTop !== null &&
      Math.abs(currentTop - programmaticTargetTop) <= 2
    ) {
      programmaticTargetTop = null;
    }
    return;
  }
  if (
    programmaticTargetTop !== null &&
    Math.abs(currentTop - programmaticTargetTop) <= 2
  ) {
    programmaticTargetTop = null;
    return;
  }
  const info = getScrollInfo();
  if (info) {
    emit("scroll", info);
  }
}

function handleInteraction() {
  clearProgrammaticScrollLock();
  emit("user-interaction");
}

function extractCursorInfo(editorView: EditorView): CursorInfo {
  try {
    const selection = editorView.state.selection.main;
    const line = editorView.state.doc.lineAt(selection.head);
    const selectedChars = Math.abs(selection.to - selection.from);
    return {
      line: line.number,
      column: selection.head - line.from + 1,
      selectedChars,
      totalLines: editorView.state.doc.lines,
    };
  } catch {
    return {
      line: 1,
      column: 1,
      selectedChars: 0,
      totalLines: editorView.state.doc.lines || 1,
    };
  }
}

defineExpose({
  insertText,
  focus,
  jumpToLine,
  wrapSelection,
  toggleTransliteration,
  toggleIastTransliteration: () => toggleTransliteration("iast"),
  toggleHkTransliteration: () => toggleTransliteration("hk"),
  repeatLastCommand,
  getLastCommand: () => lastCommand,
  getText: () => view?.state.doc.toString() ?? "",
  setSelection: (anchor: number, head?: number) => {
    view?.dispatch({ selection: { anchor, head: head ?? anchor } });
  },
  undo: undoAction,
  redo: redoAction,
  resetHistoryStatus,
  canUndo: () => (view ? undoDepth(view.state) > 0 : false),
  canRedo: () => (view ? redoDepth(view.state) > 0 : false),
  canRepeat: () => lastCommand !== null,
  getScrollInfo,
  scrollToFractionalLine,
  scrollToRatio,
  getCursorInfo: () => (view ? extractCursorInfo(view) : null),
  getScrollerElement: () => view?.scrollDOM ?? null,
});

const container = ref<HTMLElement>();
let view: EditorView | null = null;
const vimCompartment = new Compartment();
const livePreviewCompartment = new Compartment();
const lineWrappingCompartment = new Compartment();

onMounted(() => {
  if (!container.value) return;

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      history(),
      keymap.of([
        {
          key: "Mod-y",
          run: () => repeatLastCommand(),
        },
        {
          key: "Mod-Y",
          run: () => repeatLastCommand(),
        },
        {
          key: "Mod-b",
          run: () => {
            wrapSelection("**", "**");
            return true;
          },
        },
        {
          key: "Mod-B",
          run: () => {
            wrapSelection("**", "**");
            return true;
          },
        },
        {
          key: "Mod-i",
          run: () => {
            wrapSelection("*", "*");
            return true;
          },
        },
        {
          key: "Mod-I",
          run: () => {
            wrapSelection("*", "*");
            return true;
          },
        },
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: "Mod-Alt-d",
          run: () => {
            toggleTransliteration("iast");
            return true;
          },
        },
        {
          key: "Mod-Alt-D",
          run: () => {
            toggleTransliteration("iast");
            return true;
          },
        },
        {
          key: "F4",
          run: () => {
            toggleTransliteration("iast");
            return true;
          },
        },
        {
          key: "Mod-Alt-h",
          run: () => {
            toggleTransliteration("hk");
            return true;
          },
        },
        {
          key: "Mod-Alt-H",
          run: () => {
            toggleTransliteration("hk");
            return true;
          },
        },
        {
          key: "Shift-F4",
          run: () => {
            toggleTransliteration("hk");
            return true;
          },
        },
      ]),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      highlightSelectionMatches({
        minSelectionLength: 2,
        wholeWords: true,
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "var(--app-bg)",
          color: "var(--app-text)",
        },
        ".cm-scroller": { overflow: "auto", fontFamily: "monospace" },
        ".cm-content": { caretColor: "var(--app-text) !important" },
        ".cm-gutters": {
          backgroundColor: "var(--app-bg-secondary)",
          color: "var(--app-text-muted)",
          borderRight: "1px solid var(--app-border)",
        },
        ".cm-activeLineGutter": { backgroundColor: "var(--app-bg-hover)" },
        ".cm-activeLine": { backgroundColor: "var(--app-bg-hover)" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor:
            "var(--editor-selection-bg, var(--app-bg-active)) !important",
          borderRadius: "3px",
        },
        ".cm-content ::selection": {
          backgroundColor:
            "var(--editor-selection-bg, var(--app-bg-active)) !important",
        },
        ".cm-selectionMatch": {
          backgroundColor:
            "var(--editor-selection-match-bg, rgba(234, 179, 8, 0.15)) !important",
          outline:
            "1px solid var(--editor-selection-match-border, rgba(234, 179, 8, 0.4))",
          borderRadius: "2px",
        },
        ".cm-cursor, &.cm-focused .cm-cursor, .cm-cursorLayer .cm-cursor, .cm-cursor-primary":
          {
            borderLeft: "2.5px solid var(--app-text) !important",
            borderLeftColor: "var(--app-text) !important",
          },
        ".cm-dropCursor": {
          borderLeft: "2.5px solid var(--app-text) !important",
        },
        ".cm-fat-cursor, &.cm-focused .cm-fat-cursor, div.cm-fat-cursor": {
          backgroundColor: "var(--app-text) !important",
          color: "var(--app-bg) !important",
          opacity: "0.85 !important",
        },
      }),

      vimCompartment.of(props.vimMode ? vim() : []),
      livePreviewCompartment.of(props.livePreview ? livePreviewExtension : []),
      lineWrappingCompartment.of(
        props.lineWrapping ? EditorView.lineWrapping : [],
      ),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit("update:modelValue", update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          emit("cursor-change", extractCursorInfo(update.view));
        }
        emitHistoryStatus();
      }),
      directiveGuidelines,
    ],
  });

  view = new EditorView({
    state,
    parent: container.value,
  });

  emit("cursor-change", extractCursorInfo(view));
  emitHistoryStatus();

  const scroller = view.scrollDOM;
  scroller.addEventListener("scroll", handleScroll, { passive: true });
  scroller.addEventListener("wheel", handleInteraction, { passive: true });
  scroller.addEventListener("pointerdown", handleInteraction, {
    passive: true,
  });
  scroller.addEventListener("touchstart", handleInteraction, { passive: true });
  scroller.addEventListener("keydown", handleInteraction, { passive: true });
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (view && view.state.doc.toString() !== newVal) {
      const currentSelection = view.state.selection.main;
      const targetAnchor = Math.min(currentSelection.anchor, newVal.length);
      const targetHead = Math.min(currentSelection.head, newVal.length);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newVal },
        selection: { anchor: targetAnchor, head: targetHead },
      });
      resetHistoryStatus();
    }
  },
);

watch(
  () => props.vimMode,
  (newVal) => {
    if (view) {
      view.dispatch({
        effects: vimCompartment.reconfigure(newVal ? vim() : []),
      });
    }
  },
);

watch(
  () => props.livePreview,
  (newVal) => {
    if (view) {
      view.dispatch({
        effects: livePreviewCompartment.reconfigure(
          newVal ? livePreviewExtension : [],
        ),
      });
    }
  },
);

watch(
  () => props.lineWrapping,
  (newVal) => {
    if (view) {
      view.dispatch({
        effects: lineWrappingCompartment.reconfigure(
          newVal ? EditorView.lineWrapping : [],
        ),
      });
    }
  },
);

onBeforeUnmount(() => {
  clearProgrammaticScrollLock();
  if (view) {
    const scroller = view.scrollDOM;
    scroller.removeEventListener("scroll", handleScroll);
    scroller.removeEventListener("wheel", handleInteraction);
    scroller.removeEventListener("pointerdown", handleInteraction);
    scroller.removeEventListener("touchstart", handleInteraction);
    scroller.removeEventListener("keydown", handleInteraction);
    view.destroy();
    view = null;
  }
});
</script>

<template>
  <div ref="container" class="h-full w-full bg-app-bg text-app-text" style="font-size: var(--editor-font-size, 16px);"></div>
</template>
