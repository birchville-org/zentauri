import katexCss from "katex/dist/katex.min.css?raw";
import payerThemeCss from "../payer-theme.css?raw";
import { renderMarkdown } from "./markdown";

export interface HtmlExportOptions {
  title?: string;
  theme?: "light" | "dark" | "payer-day" | "payer-night";
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a self-contained, offline-ready HTML5 document containing
 * the rendered markdown with embedded Birchville Scholarly Synthesis styles
 * and KaTeX math stylesheet.
 */
export function generateStandaloneHtml(
  content: string,
  options: HtmlExportOptions = {},
): string {
  const isDark = options.theme === "dark" || options.theme === "payer-night";
  const themeAttr = isDark ? "payer-night" : "payer-day";
  const htmlClass = isDark ? ' class="dark"' : "";
  const pageTitle = escapeHtml(options.title || "ZenTauri Document");

  const renderedBody = renderMarkdown(content);

  return `<!DOCTYPE html>
<html lang="de" data-theme="${themeAttr}"${htmlClass}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
${payerThemeCss}
${katexCss}

/* Standalone container & typography layout */
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

body {
  padding: 2.5rem 1.5rem;
  background-color: var(--vp-c-bg, #fcf9f2);
  color: var(--vp-c-text-1, #03192e);
  font-family: var(--vp-font-family-base, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  line-height: 1.6;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

.standalone-container {
  max-width: 54rem;
  margin: 0 auto;
}

@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
  }
  .standalone-container {
    max-width: 100% !important;
  }
}
  </style>
</head>
<body>
  <main class="standalone-container vp-doc">
${renderedBody}
  </main>
</body>
</html>`;
}

/**
 * Copies the rendered HTML to the clipboard.
 * Supports both rich-text pasting (via text/html) and raw HTML pasting (via text/plain).
 */
export async function copyHtmlToClipboard(
  htmlContent: string,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  if (typeof ClipboardItem !== "undefined") {
    try {
      const wrappedHtml = `<div class="vp-doc">${htmlContent}</div>`;
      const htmlBlob = new Blob([wrappedHtml], { type: "text/html" });
      const textBlob = new Blob([htmlContent], { type: "text/plain" });

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      return true;
    } catch (e) {
      console.warn("ClipboardItem write failed, falling back to writeText:", e);
    }
  }

  try {
    await navigator.clipboard.writeText(htmlContent);
    return true;
  } catch (err) {
    console.error("Failed to copy HTML to clipboard:", err);
    return false;
  }
}
