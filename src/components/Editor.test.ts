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
    expect(vm.getLastCommand()).toBeNull();

    wrapper.unmount();
  });

  it("records and repeats wrapSelection", () => {
    const wrapper = mount(Editor, {
      props: {
        modelValue: "first second third",
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as any;
    // Perform bold wrap
    vm.wrapSelection("**", "**");
    expect(vm.getLastCommand()).toEqual({
      type: "wrap",
      before: "**",
      after: "**",
    });

    // Repeating repeats wrapSelection with the same boundaries
    const result = vm.repeatLastCommand();
    expect(result).toBe(true);
    expect(vm.getLastCommand()).toEqual({
      type: "wrap",
      before: "**",
      after: "**",
    });

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

    wrapper.unmount();
  });
});
