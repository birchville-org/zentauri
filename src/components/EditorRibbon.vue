<script setup lang="ts">
import { CHEAT_SHEET, type SyntaxItem } from "../lib/syntax-cheatsheet";

const emit = defineEmits<{
  (e: "insert-snippet", item: SyntaxItem): void;
  (e: "toggle-transliteration", scheme: "iast" | "hk"): void;
}>();

function insert(before: string, after = "", label = "", desc = "") {
  emit("insert-snippet", { label: label || before, before, after, desc });
}

function handleSelectSnippet(event: Event) {
  const target = event.target as HTMLSelectElement;
  if (target.value) {
    try {
      const item: SyntaxItem = JSON.parse(target.value);
      emit("insert-snippet", item);
    } catch (e) {
      console.error("Failed to parse selected snippet:", e);
    }
  }
  target.value = "";
}

// Common formatting actions
const typographyActions = [
  {
    label: "B",
    before: "**",
    after: "**",
    desc: "Fett (Bold)",
    class: "font-bold font-serif text-sm",
  },
  {
    label: "I",
    before: "*",
    after: "*",
    desc: "Kursiv (Italic)",
    class: "italic font-serif text-sm",
  },
  {
    label: "S",
    before: "~~",
    after: "~~",
    desc: "Durchgestrichen (Strikethrough)",
    class: "line-through text-xs font-mono",
  },
  {
    label: "`c`",
    before: "`",
    after: "`",
    desc: "Inline-Code",
    class: "font-mono text-xs px-1",
  },
];

const headingActions = [
  { label: "H1", before: "# ", after: "", desc: "Überschrift 1" },
  { label: "H2", before: "## ", after: "", desc: "Überschrift 2" },
  { label: "H3", before: "### ", after: "", desc: "Überschrift 3" },
];

const boxSnippets = [
  {
    label: "Grammar",
    before: "\n::: grammar-box\n",
    after: "\n:::",
    desc: "Grammar Box",
    class: "text-amber-600 dark:text-amber-400 font-semibold",
  },
  {
    label: "Warning",
    before: "\n::: warning-box\n",
    after: "\n:::",
    desc: "Warning Box",
    class: "text-orange-600 dark:text-orange-400 font-semibold",
  },
  {
    label: "Verse",
    before: "\n::: verse-box\n",
    after: "\n:::",
    desc: "Verse Box",
    class: "text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  {
    label: "Note",
    before: "\n::: note-box\n",
    after: "\n:::",
    desc: "Note Box",
    class: "text-blue-600 dark:text-blue-400 font-semibold",
  },
];
</script>

<template>
  <div
    class="flex-none flex items-center justify-between gap-1.5 px-2 py-1 bg-app-bg-secondary border-b border-app-border text-xs select-none overflow-x-auto"
    role="toolbar"
    aria-label="Editor Formatting Ribbon"
  >
    <!-- Left Ribbon Tool Groups -->
    <div class="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto py-0.5">
      <!-- Group 1: Headings -->
      <div class="flex items-center gap-0.5 shrink-0 bg-app-bg rounded p-0.5 border border-app-border/60">
        <button
          v-for="h in headingActions"
          :key="h.label"
          type="button"
          @click="insert(h.before, h.after, h.label, h.desc)"
          :title="h.desc"
          class="h-6 px-1.5 rounded hover:bg-app-bg-hover text-app-text text-[11px] font-bold font-mono transition-colors"
        >
          {{ h.label }}
        </button>
      </div>

      <div class="w-px h-4 bg-app-border shrink-0 mx-0.5"></div>

      <!-- Group 2: Typography (B, I, S, Code) -->
      <div class="flex items-center gap-0.5 shrink-0 bg-app-bg rounded p-0.5 border border-app-border/60">
        <button
          v-for="t in typographyActions"
          :key="t.label"
          type="button"
          @click="insert(t.before, t.after, t.label, t.desc)"
          :title="t.desc"
          class="h-6 w-6 rounded hover:bg-app-bg-hover text-app-text flex items-center justify-center transition-colors"
          :class="t.class"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="w-px h-4 bg-app-border shrink-0 mx-0.5"></div>

      <!-- Group 3: Structure (Quote, Bullet List, Ordered List, Task List, Table) -->
      <div class="flex items-center gap-0.5 shrink-0 bg-app-bg rounded p-0.5 border border-app-border/60">
        <!-- Quote -->
        <button
          type="button"
          @click="insert('\n> ', '', 'Quote', 'Blockquote')"
          title="Blockquote (>)"
          class="h-6 w-6 rounded hover:bg-app-bg-hover text-app-text flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
          </svg>
        </button>

        <!-- Bullet List -->
        <button
          type="button"
          @click="insert('\n- ', '', 'List', 'Aufzählungsliste (-)')"
          title="Aufzählungsliste (-)"
          class="h-6 w-6 rounded hover:bg-app-bg-hover text-app-text flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>

        <!-- Numbered List -->
        <button
          type="button"
          @click="insert('\n1. ', '', 'Numbered List', 'Nummerierte Liste (1.)')"
          title="Nummerierte Liste (1.)"
          class="h-6 w-6 rounded hover:bg-app-bg-hover text-app-text flex items-center justify-center transition-colors font-mono font-bold text-[11px]"
        >
          1.
        </button>

        <!-- Task List -->
        <button
          type="button"
          @click="insert('\n- [ ] ', '', 'Task', 'Aufgabenliste (- [ ])')"
          title="Aufgabenliste (- [ ])"
          class="h-6 w-6 rounded hover:bg-app-bg-hover text-app-text flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </button>

        <!-- Table -->
        <button
          type="button"
          @click="insert('\n| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n', '', 'Table', 'Tabelle')"
          title="Tabelle (| Spalte 1 | Spalte 2 |)"
          class="h-6 w-6 rounded hover:bg-app-bg-hover text-app-text flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
        </button>
      </div>

      <div class="w-px h-4 bg-app-border shrink-0 mx-0.5"></div>

      <!-- Group 4: Scholarly Callouts & Math -->
      <div class="flex items-center gap-1 shrink-0">
        <!-- Box Buttons -->
        <div class="hidden md:flex items-center gap-1 bg-app-bg rounded p-0.5 border border-app-border/60">
          <button
            v-for="box in boxSnippets"
            :key="box.label"
            type="button"
            @click="insert(box.before, box.after, box.label, box.desc)"
            :title="box.desc"
            class="h-6 px-1.5 rounded hover:bg-app-bg-hover text-[11px] transition-colors whitespace-nowrap"
            :class="box.class"
          >
            {{ box.label }}
          </button>
        </div>

        <!-- Sanskrit Chevrons & Inline Directives -->
        <div class="flex items-center gap-0.5 bg-app-bg rounded p-0.5 border border-app-border/60">
          <button
            type="button"
            @click="insert('《', '》', '《Skt》', 'Sanskrit-Zitate (《...》)')"
            title="Sanskrit-Klammern (《...》)"
            class="h-6 px-1.5 rounded hover:bg-app-bg-hover text-red-600 dark:text-red-400 font-bold text-xs transition-colors"
          >
            《Skt》
          </button>
          <button
            type="button"
            @click="insert(':sig[', ']', ':sig', 'Signalrot-Highlight')"
            title="Signalrot-Highlight (:sig[...])"
            class="h-6 px-1 rounded hover:bg-app-bg-hover text-red-600 dark:text-red-400 font-mono text-[11px] transition-colors"
          >
            :sig
          </button>
          <button
            type="button"
            @click="insert('$', '$', '$Math$', 'KaTeX Inline-Formel ($...$)')"
            title="KaTeX Formel ($...$)"
            class="h-6 px-1.5 rounded hover:bg-app-bg-hover text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-xs transition-colors"
          >
            $x$
          </button>
        </div>
      </div>

      <div class="w-px h-4 bg-app-border shrink-0 mx-0.5"></div>

      <!-- Group 5: Dynamic Dropdown Select (All Syntax Reference Items) -->
      <div class="flex items-center shrink-0 min-w-[170px] max-w-[240px]">
        <select
          @change="handleSelectSnippet"
          title="Vollständige Syntax-Referenz (Cheat Sheet)"
          class="w-full bg-app-bg text-app-text text-[11px] border border-app-border/80 rounded px-2 py-0.5 focus:outline-none focus:border-amber-500 cursor-pointer font-sans shadow-2xs h-6"
        >
          <option value="" disabled selected>-- Syntax-Katalog --</option>
          <optgroup v-for="cat in CHEAT_SHEET" :key="cat.id" :label="cat.title">
            <option
              v-for="item in cat.items"
              :key="item.label"
              :value="JSON.stringify(item)"
            >
              {{ item.label }} ({{ item.desc }})
            </option>
          </optgroup>
        </select>
      </div>
    </div>

    <!-- Right Ribbon: Transliteration Toggles -->
    <div class="flex items-center gap-1 shrink-0 ml-auto pl-1 border-l border-app-border/60">
      <button
        type="button"
        @click="$emit('toggle-transliteration', 'iast')"
        title="IAST ⇄ Devanāgarī Umschalter (Cmd+Alt+D / F4)"
        class="flex items-center gap-1 h-6 px-2 rounded bg-app-bg hover:bg-app-bg-hover border border-app-border/80 text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer shadow-2xs active:scale-95 text-app-text"
      >
        <span class="text-amber-600 dark:text-amber-400 font-semibold">IAST</span>
        <span class="text-app-text-muted">⇄</span>
        <span class="text-[#b22222] dark:text-[#ff6b6b] font-bold">देव</span>
        <span class="hidden xl:inline text-[9px] text-app-text-muted opacity-80">(⌥⌘D)</span>
      </button>

      <button
        type="button"
        @click="$emit('toggle-transliteration', 'hk')"
        title="Harvard-Kyoto ⇄ Devanāgarī Umschalter (Cmd+Alt+H / Shift+F4)"
        class="flex items-center gap-1 h-6 px-2 rounded bg-app-bg hover:bg-app-bg-hover border border-app-border/80 text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer shadow-2xs active:scale-95 text-app-text"
      >
        <span class="text-emerald-600 dark:text-emerald-400 font-semibold">HK</span>
        <span class="text-app-text-muted">⇄</span>
        <span class="text-[#b22222] dark:text-[#ff6b6b] font-bold">देव</span>
        <span class="hidden xl:inline text-[9px] text-app-text-muted opacity-80">(⌥⌘H)</span>
      </button>
    </div>
  </div>
</template>
