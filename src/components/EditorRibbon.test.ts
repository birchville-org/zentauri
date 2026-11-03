import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EditorRibbon from "./EditorRibbon.vue";

describe("EditorRibbon", () => {
  it("renders typography, headings, structure buttons, and transliteration", () => {
    const wrapper = mount(EditorRibbon);
    expect(wrapper.text()).toContain("H1");
    expect(wrapper.text()).toContain("H2");
    expect(wrapper.text()).toContain("H3");
    expect(wrapper.text()).toContain("B");
    expect(wrapper.text()).toContain("I");
    expect(wrapper.text()).toContain("S");
    expect(wrapper.text()).toContain("IAST");
    expect(wrapper.text()).toContain("HK");
    expect(wrapper.text()).toContain("देव");
  });

  it("emits insert-snippet when typography or heading button is clicked", async () => {
    const wrapper = mount(EditorRibbon);

    // Click H1
    const h1Btn = wrapper
      .findAll("button")
      .find((b) => b.text().trim() === "H1");
    expect(h1Btn).toBeDefined();
    await h1Btn?.trigger("click");

    expect(wrapper.emitted("insert-snippet")).toBeTruthy();
    expect(wrapper.emitted("insert-snippet")?.[0][0]).toEqual({
      label: "H1",
      before: "# ",
      after: "",
      desc: "Heading 1 (#)",
    });

    // Click Bold
    const boldBtn = wrapper
      .findAll("button")
      .find((b) => b.text().trim() === "B");
    expect(boldBtn).toBeDefined();
    await boldBtn?.trigger("click");

    expect(wrapper.emitted("insert-snippet")?.[1][0]).toEqual({
      label: "B",
      before: "**",
      after: "**",
      desc: "Bold (**) · ⌘B / Ctrl+B",
    });
  });

  it("renders exactly two history buttons (Undo & Redo/Repeat) with disabled/enabled states and emits events", async () => {
    // 1. Initially disabled when canUndo, canRedo, and canRepeat are false
    const wrapper = mount(EditorRibbon, {
      props: {
        canUndo: false,
        canRedo: false,
        canRepeat: false,
      },
    });

    const undoBtn = wrapper.find("button[aria-label='Rückgängig']");
    const redoBtn = wrapper.find("button[aria-label='Wiederholen']");

    // Exactly two history buttons exist
    expect(undoBtn.exists()).toBe(true);
    expect(redoBtn.exists()).toBe(true);
    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(true);
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(true);
    expect(undoBtn.classes()).toContain("opacity-35");
    expect(redoBtn.classes()).toContain("opacity-35");

    // 2. Redo mode: when canRedo is true, forward button is active and emits redo
    await wrapper.setProps({ canUndo: true, canRedo: true, canRepeat: false });
    expect((undoBtn.element as HTMLButtonElement).disabled).toBe(false);
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(false);
    expect(undoBtn.classes()).toContain("cursor-pointer");
    expect(redoBtn.classes()).toContain("cursor-pointer");

    await undoBtn.trigger("click");
    expect(wrapper.emitted("undo")).toBeTruthy();

    await redoBtn.trigger("click");
    expect(wrapper.emitted("redo")).toBeTruthy();

    // 3. Repeat mode: when canRedo is false but canRepeat is true, forward button emits repeat-last-command
    await wrapper.setProps({ canUndo: true, canRedo: false, canRepeat: true });
    expect((redoBtn.element as HTMLButtonElement).disabled).toBe(false);
    await redoBtn.trigger("click");
    expect(wrapper.emitted("repeat-last-command")).toBeTruthy();
  });

  it("emits toggle-transliteration on transliteration buttons", async () => {
    const wrapper = mount(EditorRibbon);

    const iastBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("IAST"));
    expect(iastBtn).toBeDefined();
    await iastBtn?.trigger("click");

    expect(wrapper.emitted("toggle-transliteration")?.[0][0]).toBe("iast");

    const hkBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("HK"));
    expect(hkBtn).toBeDefined();
    await hkBtn?.trigger("click");

    expect(wrapper.emitted("toggle-transliteration")?.[1][0]).toBe("hk");
  });

  it("emits insert-snippet on select change", async () => {
    const wrapper = mount(EditorRibbon);
    const select = wrapper.find("select");

    const option = select
      .findAll("option")
      .find((o) => (o.element as HTMLOptionElement).value !== "");
    expect(option).toBeDefined();

    const expectedValue = (option!.element as HTMLOptionElement).value;
    await select.setValue(expectedValue);

    expect(wrapper.emitted("insert-snippet")).toBeTruthy();
    expect(wrapper.emitted("insert-snippet")?.[0][0]).toEqual(
      JSON.parse(expectedValue),
    );
  });

  it("emits box snippet with [] by default", async () => {
    const wrapper = mount(EditorRibbon);
    const grammarBtn = wrapper
      .findAll("button")
      .find((b) => b.text().trim() === "Grammar");
    expect(grammarBtn).toBeDefined();
    await grammarBtn?.trigger("click");

    expect(wrapper.emitted("insert-snippet")).toBeTruthy();
    const emitted = wrapper.emitted("insert-snippet")?.at(-1)?.[0];
    expect(emitted).toEqual({
      label: "Grammar",
      before: "\n::: grammar-box []\n",
      after: "\n:::",
      desc: "Grammar Box (::: grammar-box [])",
    });
  });
});
