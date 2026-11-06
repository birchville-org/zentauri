import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Editor from "./Editor.vue";

describe("Editor Component - repeatLastCommand", () => {
  it("mounts and exposes repeatLastCommand and getLastCommand", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Hello world",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    expect(typeof vm.repeatLastCommand).toBe("function");
    expect(typeof vm.getLastCommand).toBe("function");
    expect(typeof vm.undo).toBe("function");
    expect(typeof vm.redo).toBe("function");
    expect(vm.getLastCommand()).toBeNull();

    wrapper.unmount();
  });

  it("records and repeats wrapSelection at a newly marked location", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "first second third",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // 1. Select "first" (0..5) and perform bold wrap
    vm.setSelection(0, 5);
    vm.wrapSelection("**", "**");
    expect(vm.getText()).toBe("**first** second third");
    expect(vm.getLastCommand()).toEqual({
      type: "wrap",
      before: "**",
      after: "**",
    });

    // 2. Select "third" at the newly marked location (17..22)
    vm.setSelection(17, 22);
    const result = vm.repeatLastCommand();
    expect(result).toBe(true);
    // Verifies the wrap happened at the NEW location, not at the old one
    expect(vm.getText()).toBe("**first** second **third**");

    // 3. Cmd-Z / undo reverts the repeat on "third"
    expect(vm.undo()).toBe(true);
    expect(vm.getText()).toBe("**first** second third");

    // 4. Even with an undo in history, repeatLastCommand on "second" applies to "second", not redoing "third"
    vm.setSelection(10, 16);
    expect(vm.repeatLastCommand()).toBe(true);
    expect(vm.getText()).toBe("**first** **second** third");

    wrapper.unmount();
  });

  it("records and repeats insertText", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "start ",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    vm.insertText("[snippet]");
    expect(vm.getLastCommand()).toEqual({
      type: "insert",
      text: "[snippet]",
    });

    const result = vm.repeatLastCommand();
    expect(result).toBe(true);
    expect(vm.getLastCommand()?.text).toBe("[snippet]");

    // Test undo reverting repeatLastCommand
    const undone = vm.undo();
    expect(undone).toBe(true);

    // Test redo reapplying it
    const redone = vm.redo();
    expect(redone).toBe(true);

    // Test canUndo and canRedo methods
    expect(vm.canUndo()).toBe(true);
    expect(vm.canRedo()).toBe(false);

    vm.undo();
    expect(vm.canUndo()).toBe(false); // Undone back to initial state
    expect(vm.canRedo()).toBe(true);

    wrapper.unmount();
  });

  it("defaults to lineWrapping enabled and can be toggled", async () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Long line of text that wraps automatically to window size",
        lineWrapping: true,
      },
      attachTo: document.body,
    });

    const el = wrapper.find(".cm-content");
    expect(el.exists()).toBe(true);
    expect(el.classes()).toContain("cm-lineWrapping");

    await wrapper.setProps({ lineWrapping: false });
    expect(el.classes()).not.toContain("cm-lineWrapping");

    wrapper.unmount();
  });

  it("inserts container with [] by default and positions cursor inside brackets on empty selection", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    vm.wrapSelection("\n::: grammar-box []\n", "\n:::");
    expect(vm.getText()).toBe("\n::: grammar-box []\n\n:::");
    const cursor = vm.getCursorInfo();
    // In "\n::: grammar-box []\n\n:::", bracket '[' is at index 17, inside is index 18 (line 2, column 18)
    expect(cursor.line).toBe(2);
    expect(cursor.column).toBe(18);

    wrapper.unmount();
  });

  it("toggles Sanskrit citation 《...》 on and off without duplicating", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Sanskrit dharma text",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // Select "dharma" (9..15)
    vm.setSelection(9, 15);

    // 1. First wrap -> 《dharma》
    vm.wrapSelection("《", "》");
    expect(vm.getText()).toBe("Sanskrit 《dharma》 text");

    // 2. Wrap again on the wrapped text or inner selection -> toggles off to dharma
    vm.wrapSelection("《", "》");
    expect(vm.getText()).toBe("Sanskrit dharma text");

    // 3. Wrap again -> 《dharma》
    vm.wrapSelection("《", "》");
    expect(vm.getText()).toBe("Sanskrit 《dharma》 text");

    // 4. Never creates 《《dharma》》 even if outer 《dharma》 is selected
    vm.setSelection(9, 17); // "《dharma》"
    vm.wrapSelection("《", "》");
    expect(vm.getText()).toBe("Sanskrit dharma text");

    wrapper.unmount();
  });

  it("toggles Signal Highlight :sig[...] on and off without duplicating", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Wort kṛṣṇaḥ hier",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // Select "kṛṣṇaḥ" (5..11)
    vm.setSelection(5, 11);

    // 1. Wrap -> :sig[kṛṣṇaḥ]
    vm.wrapSelection(":sig[", "]");
    expect(vm.getText()).toBe("Wort :sig[kṛṣṇaḥ] hier");

    // 2. Wrap again -> toggles off to kṛṣṇaḥ
    vm.wrapSelection(":sig[", "]");
    expect(vm.getText()).toBe("Wort kṛṣṇaḥ hier");

    // 3. Wrap again -> :sig[kṛṣṇaḥ]
    vm.wrapSelection(":sig[", "]");
    expect(vm.getText()).toBe("Wort :sig[kṛṣṇaḥ] hier");

    // 4. When full :sig[kṛṣṇaḥ] is selected, toggles off to kṛṣṇaḥ
    vm.setSelection(5, 17);
    vm.wrapSelection(":sig[", "]");
    expect(vm.getText()).toBe("Wort kṛṣṇaḥ hier");

    wrapper.unmount();
  });

  it("toggles 《...》 and :sig[...] on collapsed cursor without manual selection", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Ein vidyā Wort",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // Position cursor inside "vidyā" (index 6: between 'i' and 'd')
    vm.setSelection(6, 6);

    // 1. Toggle on -> 《vidyā》
    vm.wrapSelection("《", "》");
    expect(vm.getText()).toBe("Ein 《vidyā》 Wort");

    // 2. Cursor inside 《vidyā》 -> Toggle off -> vidyā
    vm.wrapSelection("《", "》");
    expect(vm.getText()).toBe("Ein vidyā Wort");

    // 3. Toggle on :sig -> :sig[vidyā]
    vm.wrapSelection(":sig[", "]");
    expect(vm.getText()).toBe("Ein :sig[vidyā] Wort");

    // 4. Toggle off :sig -> vidyā
    vm.wrapSelection(":sig[", "]");
    expect(vm.getText()).toBe("Ein vidyā Wort");

    wrapper.unmount();
  });

  it("handles non-closing snippets without triggering inline toggle unwraps", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Heading text",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // Cursor at index 0
    vm.setSelection(0, 0);
    vm.wrapSelection("# ", "");
    expect(vm.getText()).toBe("# Heading text");

    wrapper.unmount();
  });

  it("toggles symmetrical delimiters (math $ and bold **) with collapsed cursor and selections", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "Formel x und **fett** hier",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // Select "x" (7..8)
    vm.setSelection(7, 8);
    // 1. Wrap in $ -> $x$
    vm.wrapSelection("$", "$");
    expect(vm.getText()).toBe("Formel $x$ und **fett** hier");

    // 2. Cursor inside $x$ (index 8) -> unwraps
    vm.setSelection(8, 8);
    vm.wrapSelection("$", "$");
    expect(vm.getText()).toBe("Formel x und **fett** hier");

    // 3. Cursor inside **fett** (index 17) -> unwraps to fett
    vm.setSelection(17, 17);
    vm.wrapSelection("**", "**");
    expect(vm.getText()).toBe("Formel x und fett hier");

    // 4. Cursor on "fett" (index 15) -> wraps to **fett**
    vm.setSelection(15, 15);
    vm.wrapSelection("**", "**");
    expect(vm.getText()).toBe("Formel x und **fett** hier");

    wrapper.unmount();
  });
});
