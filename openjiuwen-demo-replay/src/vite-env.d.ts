/// <reference types="vite/client" />

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_LIVE_BASE?: string;
  }

  const __OPENJIUWEN_LIVE_BASE__: string | undefined;
}
