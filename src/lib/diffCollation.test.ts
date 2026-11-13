import { describe, expect, it } from "vitest";
import { computeCollationDiff, tokenizeWords } from "./diffCollation";

describe("diffCollation", () => {
  describe("tokenizeWords", () => {
    it("tokenizes German, Latin Extended, Sanskrit IAST, and Devanagari words correctly", () => {
      const text = "Das Wort saṃskṛtam (संस्कृतम्) ist schön und alt.";
      const tokens = tokenizeWords(text);
      expect(tokens).toContain("saṃskṛtam");
      expect(tokens).toContain("संस्कृतम्");
      expect(tokens).toContain("schön");
      expect(tokens).toContain("Das");
      expect(tokens).toContain("(");
      expect(tokens).toContain(")");
    });

    it("handles empty or whitespace-only strings gracefully", () => {
      expect(tokenizeWords("")).toEqual([]);
      expect(tokenizeWords("   \n\t ")).toEqual(["   \n\t "]);
    });
  });

  describe("computeCollationDiff", () => {
    it("returns zero diffs for identical documents", () => {
      const doc = "# Kapitel 1\n\nDies ist ein unveränderter Text.";
      const res = computeCollationDiff(doc, doc);

      expect(res.stats.totalDiffs).toBe(0);
      expect(res.stats.additions).toBe(0);
      expect(res.stats.deletions).toBe(0);
      expect(res.stats.modifications).toBe(0);
      expect(res.leftRenderedHtml).toContain("Kapitel 1");
      expect(res.rightRenderedHtml).toContain("Kapitel 1");
    });

    it("detects single word deletion and insertion", () => {
      const textA = "Hier ist ein altes Wort im Text.";
      const textB = "Hier ist ein neues Wort im Text.";

      const res = computeCollationDiff(textA, textB);
      expect(res.stats.modifications).toBe(1);
      expect(res.leftRenderedHtml).toContain('title="Variante im Vergleich: neues"');
      expect(res.rightRenderedHtml).toContain('title="Referenzfassung: altes"');
      expect(res.leftRenderedHtml).toContain("diff-substitution");
      expect(res.rightRenderedHtml).toContain("diff-substitution");
    });

    it("performs intra-word character-level diff on Sanskrit IAST diacritic differences", () => {
      const textA = "Das saṃskṛtam Manuskript.";
      const textB = "Das samskrtam Manuskript.";

      const res = computeCollationDiff(textA, textB);
      expect(res.stats.modifications).toBe(1);
      expect(res.stats.totalDiffs).toBe(1);

      // Character level highlights inside word
      expect(res.leftRenderedHtml).toContain("diff-char-del");
      expect(res.rightRenderedHtml).toContain("diff-char-ins");
      expect(res.leftRenderedHtml).toContain("sa");
      expect(res.rightRenderedHtml).toContain("sa");
    });

    it("identifies standalone deletions and additions", () => {
      const textA = "Erster Satz. Zweiter Satz.";
      const textB = "Erster Satz. Eingefügter Teil. Zweiter Satz.";

      const res = computeCollationDiff(textA, textB);
      expect(res.stats.additions).toBe(3); // 'Eingefügter', 'Teil', '.'
      expect(res.rightRenderedHtml).toContain("diff-addition");
    });

    it("safely escapes HTML characters in diff content", () => {
      const textA = "Compare <script>alert(1)</script>";
      const textB = "Compare <b>alert(2)</b>";

      const res = computeCollationDiff(textA, textB);
      expect(res.leftRenderedHtml).not.toContain("<script>");
      expect(res.leftRawHtml).toContain("&lt;");
      expect(res.leftRawHtml).toContain("&gt;");
    });

    it("preserves Markdown block/heading syntax when '#' or heading level changes", () => {
      const textA = "# Titel\n\n**Fett**";
      const textB = "## Titel\n\nFett";

      const res = computeCollationDiff(textA, textB);
      expect(res.leftRenderedHtml).toContain("<h1");
      expect(res.rightRenderedHtml).toContain("<h2");
      expect(res.leftRenderedHtml).toContain("<strong>");
    });
  });
});
