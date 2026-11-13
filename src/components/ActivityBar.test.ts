import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ActivityBar from "./ActivityBar.vue";

describe("ActivityBar Component - Workspace Tools & Actions", () => {
  it("renders workspace tool buttons and actions", () => {
    const wrapper = mount(ActivityBar, {
      props: {
        activeView: "explorer",
      },
    });

    const explorerBtn = wrapper.find("button[title*='File Explorer']");
    const searchBtn = wrapper.find("button[title*='Search in File']");
    const cheatsheetBtn = wrapper.find("button[title*='Markdown Cheatsheet']");
    const helpBtn = wrapper.find("button[title*='Help']");
    const settingsBtn = wrapper.find("button[title*='Settings']");

    expect(explorerBtn.exists()).toBe(true);
    expect(searchBtn.exists()).toBe(true);
    expect(cheatsheetBtn.exists()).toBe(true);
    expect(helpBtn.exists()).toBe(true);
    expect(settingsBtn.exists()).toBe(true);
  });

  it("emits toggle-view when clicking workspace tools", async () => {
    const wrapper = mount(ActivityBar, {
      props: {
        activeView: null,
      },
    });

    const explorerBtn = wrapper.find("button[title*='File Explorer']");
    await explorerBtn.trigger("click");
    expect(wrapper.emitted("toggle-view")?.[0]).toEqual(["explorer"]);

    const searchBtn = wrapper.find("button[title*='Search in File']");
    await searchBtn.trigger("click");
    expect(wrapper.emitted("toggle-view")?.[1]).toEqual(["search"]);

    const cheatsheetBtn = wrapper.find("button[title*='Markdown Cheatsheet']");
    await cheatsheetBtn.trigger("click");
    expect(wrapper.emitted("toggle-view")?.[2]).toEqual(["cheatsheet"]);

    const helpBtn = wrapper.find("button[title*='Help']");
    await helpBtn.trigger("click");
    expect(wrapper.emitted("toggle-view")?.[3]).toEqual(["help"]);
  });

  it("highlights active tool view with indicator bar", () => {
    const wrapper = mount(ActivityBar, {
      props: {
        activeView: "explorer",
      },
    });

    const explorerBtn = wrapper.find("button[title*='File Explorer']");
    const indicator = explorerBtn.find("div.bg-amber-600");
    expect(indicator.exists()).toBe(true);

    const searchBtn = wrapper.find("button[title*='Search in File']");
    expect(searchBtn.find("div.bg-amber-600").exists()).toBe(false);
  });

  it("emits action events for bottom export/print tools", async () => {
    const wrapper = mount(ActivityBar, {
      props: {
        activeView: null,
      },
    });

    const exportPdfBtn = wrapper.find("button[aria-label='Export PDF']");
    await exportPdfBtn.trigger("click");
    expect(wrapper.emitted("action")?.[0]).toEqual(["export-pdf"]);

    const exportHtmlBtn = wrapper.find(
      "button[aria-label='Export Standalone HTML']",
    );
    await exportHtmlBtn.trigger("click");
    expect(wrapper.emitted("action")?.[1]).toEqual(["export-html"]);

    const printBtn = wrapper.find("button[aria-label='Print Document']");
    await printBtn.trigger("click");
    expect(wrapper.emitted("action")?.[2]).toEqual(["print"]);
  });
});
