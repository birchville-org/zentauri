import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings.vue";

const mockOpenReleasePage = vi.fn();

vi.mock("../lib/updater", () => ({
  openReleasePage: (...args: unknown[]) => mockOpenReleasePage(...args),
  GITHUB_RELEASES_URL:
    "https://github.com/birchville-org/zentauri/releases/latest",
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("1.1.23"),
}));

describe("Settings Component - Update Flow & Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders settings modal when isOpen is true", () => {
    const wrapper = mount(Settings, {
      props: { isOpen: true },
    });
    expect(wrapper.find("h2").text()).toBe("Settings");
    expect(wrapper.text()).toContain("Check for Updates");
  });

  it("emits check-updates event when Check for Updates button is clicked", async () => {
    const wrapper = mount(Settings, {
      props: { isOpen: true },
    });

    const checkBtnEl = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Check for Updates"));
    expect(checkBtnEl).toBeDefined();

    await checkBtnEl!.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("check-updates")).toBeTruthy();
    expect(wrapper.emitted("check-updates")?.length).toBe(1);
  });

  it("triggers manual download page when Downloads link is clicked", async () => {
    const wrapper = mount(Settings, {
      props: { isOpen: true },
    });

    const manualBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Downloads ↗"));
    expect(manualBtn).toBeDefined();

    await manualBtn!.trigger("click");
    expect(mockOpenReleasePage).toHaveBeenCalledWith(
      "https://github.com/birchville-org/zentauri/releases/latest",
    );
  });

  it("allows selecting Payer-Day and Payer-Night palettes and applies them", async () => {
    const wrapper = mount(Settings, {
      props: { isOpen: true },
    });

    const themeSelect = wrapper.find<HTMLSelectElement>("select#theme");
    expect(themeSelect.exists()).toBe(true);

    const options = themeSelect
      .findAll("option")
      .map((opt) => opt.attributes("value"));
    expect(options).toContain("payer-day");
    expect(options).toContain("payer-night");

    await themeSelect.setValue("payer-day");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "payer-day",
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await themeSelect.setValue("payer-night");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "payer-night",
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
