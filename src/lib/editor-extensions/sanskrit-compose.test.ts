import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  SANSKRIT_COMPOSE_MAP,
  sanskritComposeExtension,
} from "./sanskrit-compose";

function triggerInput(
  view: EditorView,
  from: number,
  to: number,
  text: string,
): boolean {
  for (const handler of view.state.facet(EditorView.inputHandler)) {
    if (handler(view, from, to, text)) return true;
  }
  return false;
}

describe("Sanskrit Compose Key Extension", () => {
  it("defines standard scholarly transliteration shortcuts", () => {
    expect(SANSKRIT_COMPOSE_MAP[".r"]).toBe("ṛ");
    expect(SANSKRIT_COMPOSE_MAP[".R"]).toBe("Ṛ");
    expect(SANSKRIT_COMPOSE_MAP["-a"]).toBe("ā");
    expect(SANSKRIT_COMPOSE_MAP["-A"]).toBe("Ā");
    expect(SANSKRIT_COMPOSE_MAP["-i"]).toBe("ī");
    expect(SANSKRIT_COMPOSE_MAP["-u"]).toBe("ū");
    expect(SANSKRIT_COMPOSE_MAP["~n"]).toBe("ñ");
    expect(SANSKRIT_COMPOSE_MAP["'s"]).toBe("ś");
    expect(SANSKRIT_COMPOSE_MAP[".s"]).toBe("ṣ");
    expect(SANSKRIT_COMPOSE_MAP[".m"]).toBe("ṃ");
    expect(SANSKRIT_COMPOSE_MAP[".h"]).toBe("ḥ");
    expect(SANSKRIT_COMPOSE_MAP[".t"]).toBe("ṭ");
    expect(SANSKRIT_COMPOSE_MAP[".d"]).toBe("ḍ");
    expect(SANSKRIT_COMPOSE_MAP[".n"]).toBe("ṇ");
  });

  it("replaces .r with ṛ via inputHandler", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: "k.",
      extensions: [sanskritComposeExtension()],
    });
    const view = new EditorView({ state, parent });

    const handled = triggerInput(view, 2, 2, "r");
    expect(handled).toBe(true);
    expect(view.state.doc.toString()).toBe("kṛ");
    expect(view.state.selection.main.head).toBe(2);

    view.destroy();
    parent.remove();
  });

  it("replaces -a with ā via inputHandler", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: "r-",
      extensions: [sanskritComposeExtension()],
    });
    const view = new EditorView({ state, parent });

    const handled = triggerInput(view, 2, 2, "a");
    expect(handled).toBe(true);
    expect(view.state.doc.toString()).toBe("rā");

    view.destroy();
    parent.remove();
  });

  it("does not interfere when no compose pattern matches", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: "ab",
      extensions: [sanskritComposeExtension()],
    });
    const view = new EditorView({ state, parent });

    const handled = triggerInput(view, 2, 2, "c");
    expect(handled).toBe(false);
    expect(view.state.doc.toString()).toBe("ab");

    view.destroy();
    parent.remove();
  });

  it("does not trigger at the beginning of document (from === 0)", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const state = EditorState.create({
      doc: "",
      extensions: [sanskritComposeExtension()],
    });
    const view = new EditorView({ state, parent });

    const handled = triggerInput(view, 0, 0, "r");
    expect(handled).toBe(false);

    view.destroy();
    parent.remove();
  });
});
