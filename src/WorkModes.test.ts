import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import SynopticView from "./components/SynopticView.vue";

const activeWrappers: Array<ReturnType<typeof mount>> = [];

afterEach(() => {
  for (const w of activeWrappers) {
    w.unmount();
  }
  activeWrappers.length = 0;
  localStorage.clear();
});

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
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: vi.fn().mockReturnValue({
    onDragDropEvent: vi.fn().mockResolvedValue(() => {}),
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
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("App Component - 3 Work-Modes System", () => {
  it("defaults to Modus 1 (Authoring) on fresh startup", async () => {
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
          PdfDualViewer: true,
          SynopticView: true,
        },
      },
    });
    activeWrappers.push(wrapper);

    // Header switcher should have Authoring active
    const authoringBtn = wrapper.find("button[aria-label='Modus 1: Markdown Authoring']");
    expect(authoringBtn.exists()).toBe(true);
    expect(authoringBtn.classes()).toContain("font-semibold");

    // SynopticView should be hidden in Modus 1 (v-show preserves state across modes)
    expect(wrapper.findComponent(SynopticView).isVisible()).toBe(false);
  });

  it("switches to Modus 2 (Synoptic Edition) and renders SynopticView", async () => {
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
          PdfDualViewer: true,
          SynopticView: true,
        },
      },
    });
    activeWrappers.push(wrapper);

    const synopseBtn = wrapper.find("button[aria-label='Modus 2: Synoptische Edition']");
    expect(synopseBtn.exists()).toBe(true);
    await synopseBtn.trigger("click");

    expect(wrapper.findComponent(SynopticView).isVisible()).toBe(true);
    expect(localStorage.getItem("zentauri-work-mode")).toBe("synoptic");
  });

  it("switches to Modus 3 (Dual PDF QA) when clicking PDF QA button", async () => {
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
          PdfDualViewer: true,
          SynopticView: true,
        },
      },
    });
    activeWrappers.push(wrapper);

    const pdfQaBtn = wrapper.find("button[aria-label='Dual PDF QA Mode']");
    expect(pdfQaBtn.exists()).toBe(true);
    await pdfQaBtn.trigger("click");

    expect(localStorage.getItem("zentauri-work-mode")).toBe("pdf-qa");
  });

  it("renders contextual mode-specific tabs depending on active work mode", async () => {
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
          PdfDualViewer: true,
          SynopticView: true,
        },
      },
    });
    activeWrappers.push(wrapper);

    (wrapper.vm as any).tabs = [
      {
        id: "1",
        title: "USER_INTRO.md",
        path: "/workspace/USER_INTRO.md",
        content: "# Intro",
        isDirty: false,
      },
    ];
    (wrapper.vm as any).activeTabIndex = 0;
    await nextTick();

    // Modus 1 (Default): Markdown tabs are visible in tab bar
    const tabBar = () => wrapper.find("[data-testid='mode-tab-bar']");
    expect(tabBar().text()).toContain("USER_INTRO.md");
    expect(tabBar().text()).not.toContain("+ Scan-PDF zuordnen");
    expect(tabBar().text()).not.toContain("+ Original-PDF (Links)");

    // Switch to Modus 2: Markdown tabs disappear from tab bar, Synoptic tabs appear
    const synopseBtn = wrapper.find("button[aria-label='Modus 2: Synoptische Edition']");
    await synopseBtn.trigger("click");

    expect(tabBar().text()).not.toContain("USER_INTRO.md");
    expect(tabBar().text()).toContain("book.json");
    expect(tabBar().text()).toContain("+ Scan-PDF zuordnen");

    // Switch to Modus 3: Synoptic tabs disappear, Dual PDF QA tabs appear
    const pdfQaBtn = wrapper.find("button[aria-label='Dual PDF QA Mode']");
    await pdfQaBtn.trigger("click");

    expect(tabBar().text()).not.toContain("USER_INTRO.md");
    expect(tabBar().text()).not.toContain("book.json");
    expect(tabBar().text()).toContain("+ Referenz-Dokument (Links) öffnen");
    expect(tabBar().text()).toContain("+ Vergleichs-Dokument (Rechts) öffnen");
  });

  it("updates FileTree view context when switching between modes, hiding PDFs in Editor mode", async () => {
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
          PdfDualViewer: true,
          SynopticView: true,
        },
      },
    });
    activeWrappers.push(wrapper);

    (wrapper.vm as any).tabs = [
      {
        id: "1",
        title: "Lesson1.md",
        path: "/workspace/Lesson1.md",
        content: "# Lesson 1",
        isDirty: false,
      },
    ];
    (wrapper.vm as any).openPdfList = [
      {
        slot: "left",
        slotLabel: "[1] Ref",
        name: "scan_source.pdf",
        path: "/workspace/scan_source.pdf",
      },
    ];
    await nextTick();

    const fileTree = () => wrapper.findComponent({ name: "FileTree" });

    // In Modus 1 (Authoring / Markdown): Open Editors is visible, Vergleichs-Dokumente is hidden
    expect(fileTree().text()).toContain("Open Editors");
    expect(fileTree().text()).toContain("Lesson1.md");
    expect(fileTree().text()).not.toContain("Vergleichs-Dokumente");
    expect(fileTree().text()).not.toContain("scan_source.pdf");

    // Switch to Modus 3 (Vergleich & QA): Vergleichs-Dokumente becomes visible, Open Editors is hidden
    const pdfQaBtn = wrapper.find("button[aria-label='Dual PDF QA Mode']");
    await pdfQaBtn.trigger("click");
    await nextTick();

    expect(fileTree().text()).toContain("Vergleichs-Dokumente");
    expect(fileTree().text()).toContain("scan_source.pdf");
    expect(fileTree().text()).not.toContain("Open Editors");
    expect(fileTree().text()).not.toContain("Lesson1.md");

    // Switch back to Modus 1: PDFs must disappear immediately and Editor file view returns
    const authoringBtn = wrapper.find(
      "button[aria-label='Modus 1: Markdown Authoring']",
    );
    await authoringBtn.trigger("click");
    await nextTick();

    expect(fileTree().text()).toContain("Open Editors");
    expect(fileTree().text()).toContain("Lesson1.md");
    expect(fileTree().text()).not.toContain("Vergleichs-Dokumente");
    expect(fileTree().text()).not.toContain("scan_source.pdf");
  });
});
