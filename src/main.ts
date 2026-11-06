import { createApp } from "vue";
import App from "./App.vue";
import { initTheme } from "./lib/theme";
import "katex/dist/katex.min.css";
import "@fontsource/stix-two-text/400.css";
import "@fontsource/stix-two-text/400-italic.css";
import "@fontsource/stix-two-text/600.css";
import "@fontsource/stix-two-text/600-italic.css";
import "@fontsource/stix-two-text/700.css";
import "@fontsource/stix-two-text/700-italic.css";
import "./styles.css";

initTheme();

createApp(App).mount("#app");
