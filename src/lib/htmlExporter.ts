import katexCss from "katex/dist/katex.min.css?raw";
import payerThemeCss from "../payer-theme.css?raw";
import { renderMarkdown } from "./markdown";

export interface HtmlExportOptions {
  title?: string;
  theme?: "light" | "dark" | "payer-day" | "payer-night";
  lang?: string;
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
 * Generates a self-contained, offline-ready HTML5 document adhering to
 * modern web standards (AGY modern-web-guidance) containing the rendered markdown
 * with embedded Birchville Scholarly Synthesis styles and KaTeX math stylesheet.
 */
export function generateStandaloneHtml(
  content: string,
  options: HtmlExportOptions = {},
): string {
  const isDark = options.theme === "dark" || options.theme === "payer-night";
  const themeAttr = isDark ? "payer-night" : "payer-day";
  const htmlClass = isDark ? ' class="dark"' : "";
  const pageTitle = escapeHtml(options.title || "ZenTauri Document");
  const docLang = escapeHtml(options.lang || "de");
  const colorScheme = isDark ? "dark" : "light";
  const brandAccent = isDark ? "#eab308" : "#b45309";

  const renderedBody = renderMarkdown(content);

  return `<!DOCTYPE html>
<html lang="${docLang}" data-theme="${themeAttr}"${htmlClass}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob: https:; script-src 'none'; object-src 'none'; base-uri 'none';">
  <title>${pageTitle}</title>
  <style>
${payerThemeCss}
${katexCss}

/* Modern Web Guidance Standards: Root & Theme Setup */
:root {
  color-scheme: ${colorScheme};
  accent-color: var(--vp-c-brand-1, ${brandAccent});
}

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

/* Modern Web Guidance (Typography): Heading balance & readable line wrapping */
.vp-doc h1,
.vp-doc h2,
.vp-doc h3,
.vp-doc h4,
.vp-doc th {
  text-wrap: balance;
}

.vp-doc p,
.vp-doc li,
.vp-doc blockquote {
  text-wrap: pretty;
  overflow-wrap: break-word;
}

/* Modern Web Guidance (Accessibility): Scrollable containers with focus indication */
.vp-doc pre,
.vp-doc table {
  overflow-x: auto;
  scrollbar-color: var(--vp-c-divider, #d8d2c6) transparent;
}

.vp-doc pre:focus-visible,
.vp-doc table:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, ${brandAccent});
  outline-offset: 2px;
}

/* Modern Web Guidance (Media): Responsive image scaling & layout shift prevention */
.vp-doc img {
  max-width: 100%;
  height: auto;
}

/* Modern Web Guidance (Print): Paged media pagination & orphan prevention */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
  }
  .standalone-container {
    max-width: 100% !important;
  }
  .vp-doc pre,
  .vp-doc table,
  .vp-doc blockquote,
  .vp-doc img,
  .vp-doc .custom-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .vp-doc h1,
  .vp-doc h2,
  .vp-doc h3 {
    break-after: avoid;
    page-break-after: avoid;
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
