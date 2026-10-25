import DefaultTheme from "vitepress/theme";
import "markdown-it-extensible/css";
import "./custom.css";
import type { Theme } from "vitepress";

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    if (typeof window !== "undefined") {
      import("pele")
        .then(({ render }) => {
          const renderMermaid = () => {
            const els = document.querySelectorAll(
              "pre.language-mermaid, div.language-mermaid pre",
            );
            for (const el of els) {
              const code = el.textContent || "";
              if (!code.trim()) continue;
              try {
                const { svg } = render(code);
                const container = document.createElement("div");
                container.className = "mermaid-container";
                container.style.display = "flex";
                container.style.justifyContent = "center";
                container.style.margin = "2rem 0";
                container.innerHTML = svg;
                el.parentElement?.replaceChild(container, el);
              } catch (err) {
                console.error("Pele render error in docs:", err);
              }
            }
          };

          router.onAfterRouteChanged = () => {
            setTimeout(renderMermaid, 50);
          };
          setTimeout(renderMermaid, 50);
        })
        .catch((err) => {
          console.warn("Could not load pele in docs:", err);
        });
    }
  },
} satisfies Theme;
