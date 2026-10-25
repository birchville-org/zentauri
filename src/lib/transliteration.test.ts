import { describe, expect, it, vi } from "vitest";
import {
  containsDevanagari,
  devanagariToHk,
  devanagariToIast,
  findSanskritWordRange,
  hkToDevanagari,
  iastToDevanagari,
  toggleHkTransliteration,
  toggleSchemeTransliteration,
  toggleTransliteration,
} from "./transliteration";

const iastMap: Record<string, string> = {
  dharmaḥ: "धर्मः",
  kṛṣṇaḥ: "कृष्णः",
  saṃskṛtam: "संस्कृतम्",
  saṁskṛtam: "संस्कृतम्",
  śāntiḥ: "शान्तिः",
  vidyā: "विद्या",
  dharma: "धर्म",
  kṛṣṇa: "कृष्ण",
};

const hkMap: Record<string, string> = {
  dharmaH: "धर्मः",
  kRSNaH: "कृष्णः",
  saMskRtam: "संस्कृतम्",
  zAntiH: "शान्तिः",
  dharmakSetre: "धर्मक्षेत्रे",
  dharma: "धर्म",
  kRSNa: "कृष्ण",
};

const devaToIast: Record<string, string> = {};
for (const [k, v] of Object.entries(iastMap)) {
  devaToIast[v] = k.replace("ṁ", "ṃ");
}
const devaToHk: Record<string, string> = {};
for (const [k, v] of Object.entries(hkMap)) {
  devaToHk[v] = k;
}

function mockTransliterate(text: string, from: string, to: string): string {
  if (text.includes(":sig[") || text.includes(":mark[")) {
    const parts = text.split(/(:(?:sig|mark)\[[\s\S]*?\])/g);
    return parts
      .map((part) => {
        const match = part.match(/^(:(?:sig|mark)\[)([\s\S]*?)(\])$/);
        if (match) {
          return match[1] + mockTransliterate(match[2], from, to) + match[3];
        }
        return part
          ? part
              .split(/(\s+)/)
              .map((w) => mockTransliterate(w, from, to))
              .join("")
          : "";
      })
      .join("");
  }
  if (text.startsWith("《") && text.endsWith("》")) {
    return `《${mockTransliterate(text.slice(1, -1), from, to)}》`;
  }
  if (text.startsWith("⟪") && text.endsWith("⟫")) {
    return `⟪${mockTransliterate(text.slice(1, -1), from, to)}⟫`;
  }
  if (from === "iast" && to === "devanagari") {
    return iastMap[text] || text;
  }
  if (from === "devanagari" && to === "iast") {
    return devaToIast[text] || text;
  }
  if (from === "hk" && to === "devanagari") {
    return hkMap[text] || text;
  }
  if (from === "devanagari" && to === "hk") {
    return devaToHk[text] || text;
  }
  return text;
}

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args: any) => {
    if (cmd === "transliterate_sanskrit") {
      return mockTransliterate(args.text, args.from, args.to);
    }
    if (cmd === "toggle_transliteration_scheme") {
      const isDeva = /[\u0900-\u097F]/.test(args.text);
      if (args.scheme === "hk") {
        return isDeva
          ? mockTransliterate(args.text, "devanagari", "hk")
          : mockTransliterate(args.text, "hk", "devanagari");
      }
      return isDeva
        ? mockTransliterate(args.text, "devanagari", "iast")
        : mockTransliterate(args.text, "iast", "devanagari");
    }
    return "";
  }),
}));

describe("transliteration", () => {
  it("detects Devanagari characters accurately", () => {
    expect(containsDevanagari("धर्म")).toBe(true);
    expect(containsDevanagari("dharma")).toBe(false);
    expect(containsDevanagari("kṛṣṇa")).toBe(false);
    expect(containsDevanagari("कृष्ण")).toBe(true);
  });

  it("converts IAST to Devanagari", async () => {
    expect(await iastToDevanagari("dharmaḥ")).toBe("धर्मः");
    expect(await iastToDevanagari("kṛṣṇaḥ")).toBe("कृष्णः");
    expect(await iastToDevanagari("saṃskṛtam")).toBe("संस्कृतम्");
    expect(await iastToDevanagari("saṁskṛtam")).toBe("संस्कृतम्");
    expect(await iastToDevanagari("śāntiḥ")).toBe("शान्तिः");
    expect(await iastToDevanagari("vidyā")).toBe("विद्या");
  });

  it("converts Devanagari to IAST", async () => {
    expect(await devanagariToIast("धर्मः")).toBe("dharmaḥ");
    expect(await devanagariToIast("कृष्णः")).toBe("kṛṣṇaḥ");
    expect(await devanagariToIast("संस्कृतम्")).toBe("saṃskṛtam");
    expect(await devanagariToIast("शान्तिः")).toBe("śāntiḥ");
  });

  it("toggles IAST bidirectionally back and forth", async () => {
    const original = "dharmaḥ";
    const dev = await toggleTransliteration(original);
    expect(dev).toBe("धर्मः");

    const back = await toggleTransliteration(dev);
    expect(back).toBe(original);
  });

  it("converts Harvard-Kyoto to Devanagari", async () => {
    expect(await hkToDevanagari("dharmaH")).toBe("धर्मः");
    expect(await hkToDevanagari("kRSNaH")).toBe("कृष्णः");
    expect(await hkToDevanagari("saMskRtam")).toBe("संस्कृतम्");
    expect(await hkToDevanagari("zAntiH")).toBe("शान्तिः");
    expect(await hkToDevanagari("dharmakSetre")).toBe("धर्मक्षेत्रे");
  });

  it("converts Devanagari to Harvard-Kyoto", async () => {
    expect(await devanagariToHk("धर्मः")).toBe("dharmaH");
    expect(await devanagariToHk("कृष्णः")).toBe("kRSNaH");
    expect(await devanagariToHk("संस्कृतम्")).toBe("saMskRtam");
    expect(await devanagariToHk("शान्तिः")).toBe("zAntiH");
    expect(await devanagariToHk("धर्मक्षेत्रे")).toBe("dharmakSetre");
  });

  it("toggles Harvard-Kyoto bidirectionally back and forth", async () => {
    const original = "dharmakSetre";
    const dev = await toggleHkTransliteration(original);
    expect(dev).toBe("धर्मक्षेत्रे");

    const back = await toggleHkTransliteration(dev);
    expect(back).toBe(original);
  });

  it("supports toggleSchemeTransliteration for both schemes", async () => {
    expect(await toggleSchemeTransliteration("kṛṣṇaḥ", "iast")).toBe("कृष्णः");
    expect(await toggleSchemeTransliteration("कृष्णः", "iast")).toBe("kṛṣṇaḥ");
    expect(await toggleSchemeTransliteration("kRSNaH", "hk")).toBe("कृष्णः");
    expect(await toggleSchemeTransliteration("कृष्णः", "hk")).toBe("kRSNaH");
  });

  it("preserves brackets 《...》 and ⟪...⟫ in both schemes", async () => {
    expect(await toggleTransliteration("《dharma》")).toBe("《धर्म》");
    expect(await toggleTransliteration("《धर्म》")).toBe("《dharma》");
    expect(await toggleTransliteration("⟪kṛṣṇa⟫")).toBe("⟪कृष्ण⟫");
    expect(await toggleTransliteration("⟪कृष्ण⟫")).toBe("⟪kṛṣṇa⟫");

    expect(await toggleHkTransliteration("《dharma》")).toBe("《धर्म》");
    expect(await toggleHkTransliteration("《धर्म》")).toBe("《dharma》");
    expect(await toggleHkTransliteration("⟪kRSNa⟫")).toBe("⟪कृष्ण⟫");
    expect(await toggleHkTransliteration("⟪कृष्ण⟫")).toBe("⟪kRSNa⟫");
  });

  it("preserves :sig[...] directives in both schemes", async () => {
    expect(await toggleTransliteration(":sig[kṛṣṇaḥ]")).toBe(":sig[कृष्णः]");
    expect(await toggleTransliteration(":sig[कृष्णः]")).toBe(":sig[kṛṣṇaḥ]");

    expect(await toggleHkTransliteration(":sig[kRSNaH]")).toBe(":sig[कृष्णः]");
    expect(await toggleHkTransliteration(":sig[कृष्णः]")).toBe(":sig[kRSNaH]");
  });

  it("converts mixed text with directives correctly without corrupting tags or dropping outer text", async () => {
    expect(await iastToDevanagari("dharmaḥ :sig[kṛṣṇaḥ] śāntiḥ")).toBe(
      "धर्मः :sig[कृष्णः] शान्तिः",
    );
    expect(await devanagariToIast("धर्मः :sig[कृष्णः] शान्तिः")).toBe(
      "dharmaḥ :sig[kṛṣṇaḥ] śāntiḥ",
    );
    expect(await hkToDevanagari("dharmaH :mark[kRSNaH] zAntiH")).toBe(
      "धर्मः :mark[कृष्णः] शान्तिः",
    );
    expect(await devanagariToHk("धर्मः :mark[कृष्णः] शान्तिः")).toBe(
      "dharmaH :mark[kRSNaH] zAntiH",
    );
  });

  it("finds Sanskrit/IAST/Devanagari word range around cursor", () => {
    const doc = "Text mit kṛṣṇaḥ und रामः hier.";
    // Cursor at 'ṛ' in kṛṣṇaḥ (index 10)
    const range1 = findSanskritWordRange(doc, 10);
    expect(range1).toEqual({ from: 9, to: 15 });
    expect(doc.slice(range1!.from, range1!.to)).toBe("kṛṣṇaḥ");

    // Cursor at 'म' in रामः (index 21)
    const range2 = findSanskritWordRange(doc, 21);
    expect(range2).not.toBeNull();
    expect(doc.slice(range2!.from, range2!.to)).toBe("रामः");

    // Cursor at punctuation / whitespace
    const range3 = findSanskritWordRange(doc, doc.length - 1); // '.'
    expect(range3).toBeNull();
  });
});
