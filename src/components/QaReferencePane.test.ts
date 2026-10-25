import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import QaReferencePane from "./QaReferencePane.vue";

describe("QaReferencePane", () => {
  it("renders reference pane with title, language code and swap button", () => {
    const wrapper = mount(QaReferencePane, {
      props: {
        title: "lektion01.md",
        content: "# Lektion 01\nText in German.",
        langCode: "de",
      },
    });

    expect(wrapper.text()).toContain("lektion01.md");
    expect(wrapper.text()).toContain("DE");
    expect(wrapper.text()).toContain("SWAP");
  });

  it("disables swap button when no file is loaded, and emits swap when file is loaded", async () => {
    // 1. Without filePath -> disabled
    const wrapperWithoutFile = mount(QaReferencePane, {
      props: {
        title: "Reference (Choose...)",
        content: "# No file",
        langCode: "de",
      },
    });
    const disabledSwapBtn = wrapperWithoutFile.find('button[title*="SWAP"]');
    expect(disabledSwapBtn.exists()).toBe(true);
    expect(disabledSwapBtn.attributes("disabled")).toBeDefined();
    await disabledSwapBtn.trigger("click");
    expect(wrapperWithoutFile.emitted("swap")).toBeFalsy();

    // 2. With filePath -> enabled
    const wrapperWithFile = mount(QaReferencePane, {
      props: {
        title: "lektion01.md",
        filePath: "/path/to/lektion01.md",
        content: "# Lektion 01",
        langCode: "de",
      },
    });

    const swapBtn = wrapperWithFile.find('button[title*="SWAP"]');
    expect(swapBtn.exists()).toBe(true);
    expect(swapBtn.attributes("disabled")).toBeUndefined();
    await swapBtn.trigger("click");
    expect(wrapperWithFile.emitted("swap")).toBeTruthy();
  });

  it("toggles between rendered preview and raw text view", async () => {
    const wrapper = mount(QaReferencePane, {
      props: {
        title: "test.md",
        content: "# Header\nSome raw markdown",
      },
    });

    const rawBtn = wrapper.findAll("button").find((b) => b.text() === "Source");
    expect(rawBtn).toBeDefined();
    await rawBtn?.trigger("click");

    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);
    expect(textarea.element.value).toContain("# Header");
  });
});
