import { describe, expect, it } from "vitest";
import { adjustContainerNesting, autoRepairMarkdown } from "./auto-repair";

describe("autoRepairMarkdown", () => {
  it("should return unchanged text when no repair needed", () => {
    const input = "# Heading\n\n::: important[Title]\nContent\n:::";
    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(false);
    expect(result.repaired).toBe(input);
    expect(result.repairedCount).toBe(0);
  });

  it("should auto-close unclosed container directives (:::)", () => {
    const input = "::: grammar-box\nSome grammar notes";
    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toContain(
      "::: grammar-box\nSome grammar notes\n:::",
    );
    expect(result.repairedCount).toBe(1);
  });

  it("should auto-close unclosed Sanskrit double angle brackets 《...》", () => {
    const input = "This is Sanskrit 《rāmah";
    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe("This is Sanskrit 《rāmah》");
    expect(result.repairedCount).toBe(1);
  });

  it("should auto-close unclosed special angle brackets ⟪...⟫", () => {
    const input = "Special brackets ⟪test";
    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe("Special brackets ⟪test⟫");
    expect(result.repairedCount).toBe(1);
  });

  it("should elevate outer container colons when an inner container is nested inside it", () => {
    const input = `::: note-box [Notiz]
Hier ist ein wichtiger Hinweis.

::: grammar-box [Sanskrit Grammatik]
a + i = e
:::

Weiterer Text.
:::`;

    const expected = `:::: note-box [Notiz]
Hier ist ein wichtiger Hinweis.

::: grammar-box [Sanskrit Grammatik]
a + i = e
:::

Weiterer Text.
::::`;

    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(expected);
  });

  it("should handle 3-level deep container nesting with progressive colon counts", () => {
    const input = `::: outer-box
::: middle-box
::: inner-box
Inner content
:::
:::
:::`;

    const expected = `::::: outer-box
:::: middle-box
::: inner-box
Inner content
:::
::::
:::::`;

    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(expected);
  });

  it("should elevate outer container colons when it contains multiple sibling containers", () => {
    const input = `::: note-box
Text
::: grammar-box
Grammar 1
:::
Middle text
::: warning-box
Warning 2
:::
Ending
:::`;

    const expected = `:::: note-box
Text
::: grammar-box
Grammar 1
:::
Middle text
::: warning-box
Warning 2
:::
Ending
::::`;

    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(expected);
  });

  it("should not count ::: inside code blocks as containers", () => {
    const input = `::: note-box
Hier ist Beispielcode:
\`\`\`markdown
::: grammar-box
inner code
:::
\`\`\`
Text
:::`;

    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(false);
    expect(result.repaired).toBe(input);
  });

  it("should auto-close unclosed nested containers with matching colon counts", () => {
    const input = `::: note-box
::: grammar-box
Text`;

    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(`:::: note-box
::: grammar-box
Text
:::
::::`);
  });

  it("should repair mismatched closing colons for elevated containers", () => {
    const input = `:::: note-box
::: grammar-box
Text
:::
:::`;

    const expected = `:::: note-box
::: grammar-box
Text
:::
::::`;

    const result = autoRepairMarkdown(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(expected);
  });

  it("should preserve CRLF line endings when adjusting containers", () => {
    const input = "::: note-box\r\n::: grammar-box\r\nText\r\n:::\r\n:::\r\n";
    const expected =
      ":::: note-box\r\n::: grammar-box\r\nText\r\n:::\r\n::::\r\n";
    const result = adjustContainerNesting(input);
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(expected);
  });

  it("should handle single-line inline code fences without desynchronizing fence state", () => {
    const input =
      "```markdown ::: not-a-box ```\n\n::: note-box\nReal container\n:::";
    const result = adjustContainerNesting(input);
    expect(result.didRepair).toBe(false);
    expect(result.repaired).toBe(input);
  });

  it("should not let an unknown container opener pop an outer known container when names filter is used", () => {
    const input =
      "::: note-box\n::: unknown-box\nInhalt\n:::\nWeiterer Text\n:::";
    const expected =
      ":::: note-box\n::: unknown-box\nInhalt\n:::\nWeiterer Text\n::::";
    const result = adjustContainerNesting(input, { names: ["note-box"] });
    expect(result.didRepair).toBe(true);
    expect(result.repaired).toBe(expected);
  });
});
