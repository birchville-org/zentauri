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

    expect(wrapper.text()).toContain("DUAL PDF QA");
    expect(wrapper.text()).toContain("Sync: %");
    expect(wrapper.text()).toContain("[1] Reference");
    expect(wrapper.text()).toContain("[2] Comparison");
    expect(wrapper.text()).toContain("Load Reference PDF");
    expect(wrapper.text()).toContain("Load Comparison PDF");
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
});
