import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import App from "./App.vue";
import Editor from "./components/Editor.vue";
import FileTree from "./components/FileTree.vue";

const listeners: Record<string, (event: any) => void> = {};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation(async (cmd) => {
    if (cmd === "read_workspace_tree") return [];
    if (cmd === "get_app_cwd") return null;
    if (cmd === "is_directory_path") return false;
    if (cmd === "get_pending_open_files") return [];
    return [];
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi
    .fn()
    .mockImplementation((name: string, handler: (event: any) => void) => {
      listeners[name] = handler;
      return Promise.resolve(() => {});
    }),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn().mockResolvedValue([]),
  readTextFile: vi.fn().mockResolvedValue(""),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
  message: vi.fn().mockResolvedValue("Save"),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("App Component Integration", () => {
  it("mounts Editor and FileTree as real components on startup", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          Editor: true, // we verify Editor resolves as a component, not unresolvable custom element
          Preview: true,
          Cheatsheet: true,
          HelpSystem: true,
          Settings: true,
          SearchPanel: true,
          UpdateNotification: true,
          StatusBar: true,
        },
      },
    });

    // Verify FileTree component is mounted and rendered in the explorer pane
    const fileTree = wrapper.findComponent(FileTree);
    expect(fileTree.exists()).toBe(true);

    // Verify Editor component is mounted
    const editor = wrapper.findComponent(Editor);
    expect(editor.exists()).toBe(true);
  });

  it("toggles Vim mode when clicking the toolbar Vim button", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          Editor: true,
          Preview: true,
          Cheatsheet: true,
          HelpSystem: true,
          Settings: true,
          SearchPanel: true,
          UpdateNotification: true,
          StatusBar: true,
        },
      },
    });

    const vimBtn = wrapper.find("button[aria-label='Vim Mode']");
    expect(vimBtn.exists()).toBe(true);
    expect(vimBtn.attributes("title")).toBe("Vim Mode: Inactive");

    await vimBtn.trigger("click");
    expect(vimBtn.attributes("title")).toBe("Vim Mode: Active");
  });

  it("enforces maximum width constraint of 480px on sidebar container", () => {
    localStorage.setItem("zentauri-sidebar-width", "999");
    const wrapper = mount(App, {
      global: {
        stubs: {
          Editor: true,
          Preview: true,
          Cheatsheet: true,
          HelpSystem: true,
          Settings: true,
          SearchPanel: true,
          UpdateNotification: true,
          StatusBar: true,
        },
      },
    });

    const fileTreeContainer =
      wrapper.findComponent(FileTree).element.parentElement;
    expect(fileTreeContainer).not.toBeNull();
    expect(fileTreeContainer?.classList.contains("max-w-[480px]")).toBe(true);
    expect(fileTreeContainer?.classList.contains("min-w-[160px]")).toBe(true);
    // Width style should be clamped to 480px even if 999 was stored in localStorage
    expect(fileTreeContainer?.getAttribute("style")).toContain("width: 480px");
    localStorage.removeItem("zentauri-sidebar-width");
  });

  describe("Scroll Synchronization in Split View", () => {
    it("synchronizes scroll from Editor to Preview in header and percentage modes", async () => {
      const editorScrollToFractionalLine = vi.fn();
      const editorScrollToRatio = vi.fn();
      const previewScrollToFractionalLine = vi.fn();
      const previewScrollToRatio = vi.fn();

      const MockEditor = {
        name: "Editor",
        template: "<div class='mock-editor'></div>",
        methods: {
          scrollToFractionalLine: editorScrollToFractionalLine,
          scrollToRatio: editorScrollToRatio,
        },
      };

      const MockPreview = {
        name: "Preview",
        template: "<div class='mock-preview'></div>",
        methods: {
          scrollToFractionalLine: previewScrollToFractionalLine,
          scrollToRatio: previewScrollToRatio,
        },
      };

      localStorage.setItem(
        "zentauri-settings",
        JSON.stringify({ syncMode: "header" }),
      );
      const wrapper = mount(App, {
        global: {
          stubs: {
            Editor: MockEditor,
            Preview: MockPreview,
            Cheatsheet: true,
            HelpSystem: true,
            Settings: true,
            SearchPanel: true,
            UpdateNotification: true,
            StatusBar: true,
          },
        },
      });

      const editor = wrapper.findComponent(MockEditor);
      const preview = wrapper.findComponent(MockPreview);
      expect(editor.exists()).toBe(true);
      expect(preview.exists()).toBe(true);

      // In header mode, Editor scroll propagates scrollToFractionalLine to Preview
      await editor.vm.$emit("scroll", {
        fractionalLine: 5.5,
        ratio: 0.35,
        totalLines: 100,
      });

      // Await requestAnimationFrame
      await new Promise((r) => requestAnimationFrame(r));
      expect(previewScrollToFractionalLine).toHaveBeenCalledWith(
        5.5,
        0.35,
        100,
      );

      // While editor is activeScroller, echo scrolls from preview are blocked
      previewScrollToFractionalLine.mockClear();
      editorScrollToFractionalLine.mockClear();
      await preview.vm.$emit("scroll", {
        fractionalLine: 5.5,
        ratio: 0.35,
      });
      await new Promise((r) => requestAnimationFrame(r));
      expect(editorScrollToFractionalLine).not.toHaveBeenCalled();

      // Cycle sync mode to percentage mode
      const syncBtn = wrapper.find("button[title*='Scroll-Sync']");
      expect(syncBtn.exists()).toBe(true);
      await syncBtn.trigger("click"); // header -> percentage

      await editor.vm.$emit("scroll", {
        fractionalLine: 10,
        ratio: 0.6,
        totalLines: 100,
      });
      await new Promise((r) => requestAnimationFrame(r));
      expect(previewScrollToRatio).toHaveBeenCalledWith(0.6);

      // Cycle sync mode to off
      await syncBtn.trigger("click"); // percentage -> off
      previewScrollToRatio.mockClear();
      await editor.vm.$emit("scroll", {
        fractionalLine: 20,
        ratio: 0.8,
        totalLines: 100,
      });
      await new Promise((r) => requestAnimationFrame(r));
      expect(previewScrollToRatio).not.toHaveBeenCalled();

      localStorage.removeItem("zentauri-settings");
    });
  });

  it("routes incoming PDFs into pdf-qa mode with 1, 2, and >2 files", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    const loadPdfPairMock = vi.fn();
    const MockPdfDualViewer = defineComponent({
      name: "PdfDualViewer",
      setup(_, { expose }) {
        expose({
          loadPdfPair: loadPdfPairMock,
          loadPdf: vi.fn(),
          loadPdfFromExternal: vi.fn(),
          unloadPdf: vi.fn(),
          revealInFinder: vi.fn(),
          leftPdfPath: ref(""),
          rightPdfPath: ref(""),
        });
        return () => h("div", { class: "mock-pdf-dual-viewer" });
      },
    });

    const wrapper = mount(App, {
      global: {
        stubs: {
          Editor: true,
          Preview: true,
          Cheatsheet: true,
          HelpSystem: true,
          Settings: true,
          SearchPanel: true,
          UpdateNotification: true,
          StatusBar: true,
          PdfDualViewer: MockPdfDualViewer,
        },
      },
    });

    const batchHandler = listeners["open-files-batch"];
    expect(batchHandler).toBeDefined();

    // 1. Single PDF -> 1st into left, right undefined
    batchHandler({ payload: ["/path/single.pdf"] });
    await nextTick();
    await nextTick();
    expect(loadPdfPairMock).toHaveBeenLastCalledWith(
      "/path/single.pdf",
      undefined,
    );

    // 2. Two PDFs -> 1st into left, 2nd into right
    batchHandler({ payload: ["/path/left.pdf", "/path/right.pdf"] });
    await nextTick();
    await nextTick();
    expect(loadPdfPairMock).toHaveBeenLastCalledWith(
      "/path/left.pdf",
      "/path/right.pdf",
    );

    // 3. Three PDFs (>2) -> 1st into left, 2nd into right, 3rd ignored
    batchHandler({
      payload: ["/path/first.pdf", "/path/second.pdf", "/path/third.pdf"],
    });
    await nextTick();
    await nextTick();
    expect(loadPdfPairMock).toHaveBeenLastCalledWith(
      "/path/first.pdf",
      "/path/second.pdf",
    );

    (window as any).__TAURI_INTERNALS__ = undefined;
  });
});
