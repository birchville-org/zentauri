/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: string;

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@indic-transliteration/sanscript" {
  export interface SanscriptStatic {
    t(
      text: string,
      from: string,
      to: string,
      options?: Record<string, unknown>,
    ): string;
  }
  const Sanscript: SanscriptStatic;
  export default Sanscript;
}
