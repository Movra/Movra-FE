/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VISUAL_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
