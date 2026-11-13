import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PdfDualViewer from "./PdfDualViewer.vue";

// Mock Tauri invoke & dialog
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("PdfDualViewer", () => {
  it("renders dual PDF viewer with toolbar and initial empty states", () => {
    const wrapper = mount(PdfDualViewer);

    expect(wrapper.text()).toContain("VERGLEICH & QA");
    expect(wrapper.text()).toContain("Sync: %");
    expect(wrapper.text()).toContain("[1] Reference");
    expect(wrapper.text()).toContain("[2] Comparison");
    expect(wrapper.text()).toContain("Load Document...");
    expect(wrapper.text()).toContain("Dokument auswählen...");
  });

  it("emits close event when close button is clicked", async () => {
    const wrapper = mount(PdfDualViewer);
    const closeBtn = wrapper.find('button[title*="Close"]');
    expect(closeBtn.exists()).toBe(true);

    await closeBtn.trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("cycles sync mode between percentage, page, and off", async () => {
    const wrapper = mount(PdfDualViewer);
    const syncBtn = wrapper.find('button[title*="Scroll-Sync"]');
    expect(syncBtn.exists()).toBe(true);
    expect(syncBtn.text()).toContain("Sync: %");

    await syncBtn.trigger("click");
    expect(syncBtn.text()).toContain("Sync: Page");

    await syncBtn.trigger("click");
    expect(syncBtn.text()).toContain("Sync: Off");

    await syncBtn.trigger("click");
    expect(syncBtn.text()).toContain("Sync: %");
  });

  it("toggles fit-width mode and adjusts zoom", async () => {
    const wrapper = mount(PdfDualViewer);
    const fitBtn = wrapper.find('button[title*="Fit to Width"]');
    expect(fitBtn.exists()).toBe(true);

    const zoomInBtn = wrapper.find('button[title*="Zoom In"]');
    await zoomInBtn.trigger("click");
    expect(wrapper.text()).toContain("115%");

    const zoomOutBtn = wrapper.find('button[title*="Zoom Out"]');
    await zoomOutBtn.trigger("click");
    expect(wrapper.text()).toContain("100%");
  });

  it("toggles layout mode between single page and continuous scroll", async () => {
    const wrapper = mount(PdfDualViewer);
    const layoutBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Single") || b.text().includes("Scroll"));
    expect(layoutBtn).toBeDefined();
    expect(layoutBtn!.text()).toContain("Single");

    await layoutBtn!.trigger("click");
    expect(layoutBtn!.text()).toContain("Scroll");

    await layoutBtn!.trigger("click");
    expect(layoutBtn!.text()).toContain("Single");
  });

  it("loads PDF documents, emits update-docs, and unloads documents properly", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "get_pdf_info") {
        return {
          page_count: 5,
          file_name: "sample.pdf",
          file_size: 1024,
        };
      }
      if (cmd === "render_pdf_page_svg") {
        return "<svg><rect width='100' height='100'/></svg>";
      }
      return undefined;
    });

    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    // Load PDF in left slot
    await vm.loadPdf("left", "/path/to/sample.pdf");
    expect(vm.leftPdfName).toBe("sample.pdf");
    expect(vm.leftPageCount).toBe(5);

    // Verify update-docs was emitted
    const updateEvents = wrapper.emitted("update-docs");
    expect(updateEvents).toBeTruthy();
    const lastDocs = updateEvents![updateEvents!.length - 1][0] as any[];
    expect(lastDocs.length).toBe(1);
    expect(lastDocs[0]).toEqual({
      slot: "left",
      slotLabel: "[1] Ref",
      name: "sample.pdf",
      path: "/path/to/sample.pdf",
      pageCount: 5,
      currentPage: 1,
      kind: "pdf",
      content: "",
    });

    // Unload PDF
    vm.unloadPdf("left");
    expect(vm.leftPdfPath).toBe("");
    expect(vm.leftPdfName).toBe("");
    const afterUnload = wrapper.emitted("update-docs");
    const emptyDocs = afterUnload![afterUnload!.length - 1][0] as any[];
    expect(emptyDocs.length).toBe(0);
  });

  it("loads PDF pair correctly with 1 PDF and 2 PDFs", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockImplementation(async (cmd: string, args?: any) => {
      if (cmd === "get_pdf_info") {
        const path = args?.path || "sample.pdf";
        const name = path.split("/").pop() || "sample.pdf";
        return {
          page_count: name === "second.pdf" ? 10 : 5,
          file_name: name,
          file_size: 2048,
        };
      }
      return undefined;
    });

    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    // 1. Load pair with 2 PDFs
    await vm.loadPdfPair("/docs/first.pdf", "/docs/second.pdf");
    expect(vm.leftPdfPath).toBe("/docs/first.pdf");
    expect(vm.leftPdfName).toBe("first.pdf");
    expect(vm.rightPdfPath).toBe("/docs/second.pdf");
    expect(vm.rightPdfName).toBe("second.pdf");

    // 2. Load pair with only 1 PDF -> left is loaded, right is unloaded
    await vm.loadPdfPair("/docs/solo.pdf");
    expect(vm.leftPdfPath).toBe("/docs/solo.pdf");
    expect(vm.leftPdfName).toBe("solo.pdf");
    expect(vm.rightPdfPath).toBe("");
    expect(vm.rightPdfName).toBe("");
  });

  it("toggles annotation mode via button and hotkey A", async () => {
    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    expect(vm.isAnnotateMode).toBe(false);

    // Button click
    const annoBtn = wrapper.find("button[title*='Annotation-Modus']");
    expect(annoBtn.exists()).toBe(true);
    await annoBtn.trigger("click");
    expect(vm.isAnnotateMode).toBe(true);
    expect(annoBtn.text()).toContain("Annotieren: An");

    // Toggle back
    await annoBtn.trigger("click");
    expect(vm.isAnnotateMode).toBe(false);

    // Via hotkey A
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(vm.isAnnotateMode).toBe(true);

    // Via Escape
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(vm.isAnnotateMode).toBe(false);
  });

  it("adds, selects, and deletes bounding box annotations", async () => {
    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    vm.addAnnotation({
      id: "test-anno-1",
      slot: "right",
      pageIndex: 0,
      x: 10,
      y: 20,
      width: 30,
      height: 15,
      type: "typo",
      note: "Missing macron on a in Sanskrit text",
      createdAt: Date.now(),
    });

    expect(vm.annotations.length).toBe(1);

    // Open drawer to see list and text
    vm.showProofingDrawer = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Missing macron on a in Sanskrit text");

    // Select annotation
    vm.selectAnnotation(vm.annotations[0]);
    expect(vm.selectedAnnotationId).toBe("test-anno-1");

    // Delete annotation via hotkey Backspace
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));
    expect(vm.annotations.length).toBe(0);
  });

  it("generates and copies structured AI review prompt to clipboard", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    vm.leftPdfName = "original_scan.pdf";
    vm.leftPageCount = 10;
    vm.leftCurrentPage = 2;
    vm.rightPdfName = "typeset_vector.pdf";
    vm.rightPageCount = 12;
    vm.rightCurrentPage = 2;

    vm.addAnnotation({
      id: "anno-ai-1",
      slot: "right",
      pageIndex: 1,
      x: 25,
      y: 40,
      width: 20,
      height: 5,
      type: "diacritic",
      note: "samskrtam should be saṃskṛtam",
      createdAt: Date.now(),
    });

    await vm.copyAiReviewPrompt();

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("# Dual Document QA & Proofing Review Report (PDF ⇄ PDF)");
    expect(copiedText).toContain("original_scan.pdf");
    expect(copiedText).toContain("typeset_vector.pdf");
    expect(copiedText).toContain("Diakritikum (Makron/Akzent)");
    expect(copiedText).toContain("samskrtam should be saṃskṛtam");
    expect(copiedText).toContain("Korrektur-Anweisung für die KI");
  });

  it("toggles proofing drawer and exports annotations as JSON", async () => {
    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    expect(vm.showProofingDrawer).toBe(false);

    const drawerBtn = wrapper.find("button[title*='Proofing-Seitenleiste']");
    expect(drawerBtn.exists()).toBe(true);
    await drawerBtn.trigger("click");
    expect(vm.showProofingDrawer).toBe(true);
    expect(wrapper.text()).toContain("Proofing & QA");

    // Add annotation and check export JSON
    vm.addAnnotation({
      id: "anno-export-1",
      slot: "left",
      pageIndex: 0,
      x: 5,
      y: 10,
      width: 20,
      height: 8,
      type: "ocr",
      note: "Smudged ligature",
      createdAt: Date.now(),
    });

    // Mock createObjectURL & revokeObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    vm.exportAnnotationsJson();
    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it("uses HTML5 file input in browser mode when not running in Tauri", async () => {
    const clickSpy = vi.fn();
    const createElementOrig = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = createElementOrig(tag);
      if (tag === "input") {
        el.click = clickSpy;
      }
      return el;
    });

    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    await vm.pickPdf("left");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("loads and renders Markdown documents in comparison slots strictly read-only", async () => {
    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    const mdContent = "# Scholarly Chapter\n\nSanskrit saṃskṛtam text with **bold** formatting.";
    await vm.loadMarkdown("left", "/path/to/chapter1.md", mdContent);

    expect(vm.leftDocKind).toBe("markdown");
    expect(vm.leftPdfName).toBe("chapter1.md");
    expect(vm.leftMarkdownContent).toBe(mdContent);
    expect(vm.leftMarkdownHtml).toContain("Scholarly Chapter");
    expect(vm.leftMarkdownHtml).toContain("saṃskṛtam");

    // Verify update-docs emits markdown kind
    const updateEvents = wrapper.emitted("update-docs");
    expect(updateEvents).toBeTruthy();
    const lastDocs = updateEvents![updateEvents!.length - 1][0] as any[];
    expect(lastDocs.length).toBe(1);
    expect(lastDocs[0].kind).toBe("markdown");
    expect(lastDocs[0].name).toBe("chapter1.md");

    // Toggle between rendered and raw view
    expect(vm.leftViewType).toBe("rendered");
    vm.leftViewType = "raw";
    expect(vm.leftViewType).toBe("raw");

    // Load another markdown in right slot
    await vm.loadMarkdown("right", "/path/to/chapter2.md", "## Secondary Notes");
    expect(vm.rightDocKind).toBe("markdown");
    expect(vm.rightPdfName).toBe("chapter2.md");
    expect(vm.rightMarkdownHtml).toContain("Secondary Notes");

    // Add an annotation so prompt can be generated
    vm.addAnnotation({
      id: "anno-md-1",
      slot: "left",
      pageIndex: 0,
      x: 10,
      y: 10,
      width: 20,
      height: 5,
      type: "typo",
      note: "check transcription",
      createdAt: Date.now(),
    });

    // Verify pair review prompt correctly reports Markdown ⇄ Markdown
    const writeTextMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    await vm.copyAiReviewPrompt();
    expect(writeTextMock).toHaveBeenCalled();
    const copied = writeTextMock.mock.calls[0][0];
    expect(copied).toContain("Markdown ⇄ Markdown");
  });

  it("activates philological collation diff mode and highlights diacritic changes", async () => {
    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    await vm.loadMarkdown(
      "left",
      "/docs/edition_a.md",
      "# Lektion 1\n\nDas Wort samskrtam ist schön und uralt."
    );
    await vm.loadMarkdown(
      "right",
      "/docs/edition_b.md",
      "# Lektion 1\n\nDas Wort saṃskṛtam ist schön und alt."
    );

    expect(vm.canShowDiff).toBe(true);
    expect(vm.isDiffActive).toBe(false);

    // Toggle Diff mode on
    vm.isDiffActive = true;
    await wrapper.vm.$nextTick();

    expect(vm.diffResult).toBeDefined();
    expect(vm.diffResult.stats.totalDiffs).toBeGreaterThan(0);
    expect(vm.diffResult.stats.modifications).toBeGreaterThan(0);

    // Verify rendered HTML contains diff tags
    expect(vm.diffResult.leftRenderedHtml).toContain("diff-substitution");
    expect(vm.diffResult.rightRenderedHtml).toContain("diff-substitution");
    expect(vm.diffResult.leftRenderedHtml).toContain("diff-char-del");
    expect(vm.diffResult.rightRenderedHtml).toContain("diff-char-ins");

    // Verify diff toggle button in toolbar
    const diffBtn = wrapper.find("button[title*='Philologische Kollation']");
    expect(diffBtn.exists()).toBe(true);
    expect(diffBtn.text()).toContain("Diff");

    // Copy AI Review Prompt without manual annotations includes collation stats
    const writeTextMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    await vm.copyAiReviewPrompt();
    expect(writeTextMock).toHaveBeenCalled();
    const prompt = writeTextMock.mock.calls[0][0];
    expect(prompt).toContain("Kollations-Abweichungen");
  });

  it("swaps Markdown and PDF state cleanly and resets docKind on PDF load", async () => {
    const wrapper = mount(PdfDualViewer);
    const vm = wrapper.vm as any;

    await vm.loadMarkdown("left", "/docs/left.md", "# Links");
    await vm.loadBrowserPdfFile("right", new File(["%PDF-1.4"], "right.pdf", { type: "application/pdf" }));

    expect(vm.leftDocKind).toBe("markdown");
    expect(vm.rightDocKind).toBe("pdf");

    vm.handleSwap();
    await wrapper.vm.$nextTick();

    expect(vm.leftDocKind).toBe("pdf");
    expect(vm.leftPdfName).toBe("right.pdf");
    expect(vm.rightDocKind).toBe("markdown");
    expect(vm.rightMarkdownContent).toBe("# Links");

    // Loading a PDF into the Markdown slot resets docKind back to pdf
    await vm.loadBrowserPdfFile("right", new File(["%PDF-1.4"], "override.pdf", { type: "application/pdf" }));
    expect(vm.rightDocKind).toBe("pdf");
    expect(vm.rightMarkdownContent).toBe("");
    expect(vm.rightMarkdownHtml).toBe("");
  });
});
