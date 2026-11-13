import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import SynopticView from "./SynopticView.vue";

// Mock Tauri modules
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args: any) => {
    if (cmd === "transliterate_sanskrit") {
      return "आत्मैवेदमग्र आसीत्पुरुषविधः";
    }
    if (cmd === "get_pdf_info") {
      return { page_count: 5, file_name: "test.pdf", file_size: 102400 };
    }
    if (cmd === "render_pdf_page_svg") {
      return "<svg viewBox='0 0 100 100'><text>Page</text></svg>";
    }
    return null;
  }),
  isTauri: vi.fn(() => false),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(async () => "/mock/path/book.json"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

describe("SynopticView Component (Mode 2: Synoptic Edition & Master-JSON)", () => {
  it("renders the split-pane layout with scan pane left and segment editor right", () => {
    const wrapper = mount(SynopticView, {
      props: {
        currentWorkspace: "TestWorkspace",
      },
    });

    expect(wrapper.text()).toContain("Modus 2");
    expect(wrapper.text()).toContain("Scan-Quelle (Originaldruck)");
    expect(wrapper.text()).toContain("Sanskrit Umschrift (IAST)");
    expect(wrapper.text()).toContain("Deutsche Übersetzung");
    expect(wrapper.text()).toContain("Snippets:");
  });

  it("navigates between segments using previous and next controls", async () => {
    const wrapper = mount(SynopticView);

    // Initial segment is 1.4.1
    expect(wrapper.text()).toContain("Der Ur-Mensch (ātman)");

    // Click next button
    const nextBtn = wrapper.find("button[title*='Nächstes Segment']");
    expect(nextBtn.exists()).toBe(true);
    await nextBtn.trigger("click");

    // Second segment is 1.4.2
    expect(wrapper.text()).toContain("Die Überwindung der Furcht");

    // Click prev button
    const prevBtn = wrapper.find("button[title*='Vorheriges Segment']");
    await prevBtn.trigger("click");
    expect(wrapper.text()).toContain("Der Ur-Mensch (ātman)");
  });

  it("supports adding and deleting segments", async () => {
    const wrapper = mount(SynopticView);

    const addBtn = wrapper.find("button[title*='Neues Segment']");
    expect(addBtn.exists()).toBe(true);
    await addBtn.trigger("click");

    // Total verses should now be 3
    const options = wrapper.findAll("select option");
    expect(options.length).toBe(3);

    // Delete segment
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteBtn = wrapper.find(
      "button[title*='Aktuelles Segment löschen']",
    );
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger("click");

    const updatedOptions = wrapper.findAll("select option");
    expect(updatedOptions.length).toBe(2);
  });

  it("inserts diacritic snippet characters into the focused textarea", async () => {
    const wrapper = mount(SynopticView, {
      attachTo: document.body,
    });

    const iastTextarea = wrapper.find("textarea[placeholder*='IAST-Text']");
    expect(iastTextarea.exists()).toBe(true);

    const el = iastTextarea.element as HTMLTextAreaElement;
    el.focus();
    await iastTextarea.trigger("focus");

    // Find snippet button for 'ā'
    const aSnippetBtn = wrapper
      .findAll("button")
      .find((b) => b.text().trim() === "ā");
    expect(aSnippetBtn?.exists()).toBe(true);

    await aSnippetBtn!.trigger("click");
    expect(el.value).toContain("ā");

    wrapper.unmount();
  });

  it("performs Sanskrit transliteration from IAST to Devanagari", async () => {
    const wrapper = mount(SynopticView);

    const translitBtn = wrapper.find(
      "button[title*='IAST via Rust Vidyut-Lipi']",
    );
    expect(translitBtn.exists()).toBe(true);
    await translitBtn.trigger("click");

    const devanagariTextarea = wrapper.find("textarea[placeholder*='देवनागरी']");
    expect(
      (devanagariTextarea.element as HTMLTextAreaElement).value,
    ).toBeTruthy();
  });

  it("triggers silent auto-repair feedback on save", async () => {
    const wrapper = mount(SynopticView);

    const saveBtn = wrapper.find("button[title*='Master-JSON speichern']");
    expect(saveBtn.exists()).toBe(true);

    await saveBtn.trigger("click");
    expect(wrapper.text()).toContain("Auto-Repaired & Gespeichert");
  });
});
