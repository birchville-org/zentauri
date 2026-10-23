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
      desc: "Überschrift 1",
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
      desc: "Fett (Bold)",
    });
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
});
