import { describe, expect, it } from "vitest";
import { convertMarkdownToTypst, latexToTypstMath } from "./typstConverter";

describe("typstConverter math handling", () => {
  describe("latexToTypstMath", () => {
    it("auto-quotes currency and unknown multi-letter identifiers", () => {
      expect(latexToTypstMath("100 USD")).toBe('100 "USD"');
      expect(latexToTypstMath("USD")).toBe('"USD"');
      expect(latexToTypstMath("50 EUR")).toBe('50 "EUR"');
      expect(latexToTypstMath("Total = 100")).toBe('"Total" = 100');
    });

    it("converts \\text, \\mathrm, \\operatorname and other text macros to quotes", () => {
      expect(latexToTypstMath("\\text{USD}")).toBe('"USD"');
      expect(latexToTypstMath("\\mathrm{USD}")).toBe('"USD"');
      expect(latexToTypstMath("\\operatorname{Price}")).toBe('"Price"');
      expect(latexToTypstMath("\\mbox{kg}")).toBe('"kg"');
    });

    it("preserves single-letter math variables without quotes", () => {
      expect(latexToTypstMath("x + y = z")).toBe("x + y = z");
      expect(latexToTypstMath("a^2 + b^2 = c^2")).toBe("a^2 + b^2 = c^2");
    });

    it("preserves Typst math builtins such as functions, Greek letters, and symbols", () => {
      expect(latexToTypstMath("\\sin(x) + \\cos(y) = \\alpha")).toBe(
        "sin(x) + cos(y) = alpha",
      );
      expect(latexToTypstMath("\\sum_{i=1}^n i = \\frac{n(n+1)}{2}")).toBe(
        " sum _(i=1)^n i = (n(n+1))/(2)",
      );
      expect(latexToTypstMath("\\sqrt{x^2 + y^2}")).toBe("sqrt(x^2 + y^2)");
    });

    it("cleans up \\left and \\right delimiters", () => {
      expect(latexToTypstMath("\\left( \\frac{a}{b} \\right)")).toBe(
        "( (a)/(b) )",
      );
      expect(latexToTypstMath("\\left[ x \\right]")).toBe("[ x ]");
    });

    it("handles subscript with multi-letter identifiers or text", () => {
      expect(latexToTypstMath("T_{USD} = 10")).toBe('T_("USD") = 10');
      expect(latexToTypstMath("x_{\\text{max}} = 5")).toBe('x_("max") = 5');
    });

    it("handles fractions containing text macros and roots", () => {
      expect(latexToTypstMath("\\frac{\\mathrm{USD}}{100}")).toBe(
        '("USD")/(100)',
      );
      expect(latexToTypstMath("\\frac{\\sqrt{x}}{2}")).toBe("(sqrt(x))/(2)");
    });
  });

  describe("convertMarkdownToTypst", () => {
    it("correctly converts inline and block math containing USD and other units", () => {
      const md =
        "Der Preis beträgt $100 USD$ oder $Total = 50 EUR$.\n\n$$ \\mathrm{USD} = 1.05 \\text{ CHF} $$\n";
      const typst = convertMarkdownToTypst(md);

      expect(typst).toContain('$100 "USD"$');
      expect(typst).toContain('$"Total" = 50 "EUR"$');
      expect(typst).toContain('$ "USD" = 1.05 " CHF" $');
    });

    it("converts standard LaTeX equations into valid Typst math syntax", () => {
      const md = "$$ e^{i \\pi} + 1 = 0 $$\n";
      const typst = convertMarkdownToTypst(md);

      expect(typst).toContain("$ e^(i pi) + 1 = 0 $");
    });
  });
});
