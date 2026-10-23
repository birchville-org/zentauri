import { describe, expect, it, vi } from "vitest";
import {
  copyHtmlToClipboard,
  escapeHtml,
  generateStandaloneHtml,
} from "./htmlExporter";

describe("htmlExporter", () => {
  describe("escapeHtml", () => {
    it("escapes special HTML characters", () => {
      expect(escapeHtml("<script>alert('xss') & \"safe\"</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;) &amp; &quot;safe&quot;&lt;/script&gt;",
      );
    });
  });

  describe("generateStandaloneHtml", () => {
    it("generates full HTML5 document with title, embedded CSS, and vp-doc wrapper", () => {
      const markdown = "# Test Title\n\nThis is a paragraph.";
      const html = generateStandaloneHtml(markdown, {
        title: "My Custom Doc",
        theme: "light",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="de" data-theme="payer-day">');
      expect(html).toContain("<title>My Custom Doc</title>");
      expect(html).toContain('<main class="standalone-container vp-doc">');
      expect(html).toContain("<h1");
      expect(html).toContain("Test Title</h1>");
      expect(html).toContain("--vp-c-bg: #fcf9f2;");
      expect(html).toContain(".katex");
    });

    it("supports dark theme and marks class dark with data-theme payer-night", () => {
      const html = generateStandaloneHtml("# Dark Mode", {
        title: "Dark Doc",
        theme: "dark",
      });

      expect(html).toContain(
        '<html lang="de" data-theme="payer-night" class="dark">',
      );
      expect(html).toContain("<title>Dark Doc</title>");
      expect(html).toContain("--vp-c-bg: #0a1628;");
    });
  });

  describe("copyHtmlToClipboard", () => {
    it("copies to clipboard via navigator.clipboard.write when ClipboardItem is available", async () => {
      const writeMock = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;

      // Mock navigator.clipboard & ClipboardItem
      const mockClipboard = {
        write: writeMock,
        writeText: vi.fn(),
      };
      Object.defineProperty(navigator, "clipboard", {
        value: mockClipboard,
        configurable: true,
      });

      // Mock ClipboardItem in global scope
      (globalThis as any).ClipboardItem = class MockClipboardItem {
        data: Record<string, any>;
        constructor(data: Record<string, any>) {
          this.data = data;
        }
      };

      const success = await copyHtmlToClipboard("<p>Hello World</p>");
      expect(success).toBe(true);
      expect(writeMock).toHaveBeenCalled();

      // Cleanup
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
      (globalThis as any).ClipboardItem = undefined;
    });

    it("falls back to writeText if ClipboardItem fails or is unavailable", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;

      const mockClipboard = {
        write: vi.fn().mockRejectedValue(new Error("Permission denied")),
        writeText: writeTextMock,
      };
      Object.defineProperty(navigator, "clipboard", {
        value: mockClipboard,
        configurable: true,
      });

      (globalThis as any).ClipboardItem = class MockClipboardItem {
        data: Record<string, any>;
        constructor(data: Record<string, any>) {
          this.data = data;
        }
      };

      const success = await copyHtmlToClipboard("<p>Fallback</p>");
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith("<p>Fallback</p>");

      // Cleanup
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
      (globalThis as any).ClipboardItem = undefined;
    });
  });
});
