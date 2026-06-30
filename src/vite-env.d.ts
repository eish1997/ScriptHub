/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HERMES_BASE_URL?: string;
  readonly VITE_TOOL_BRIDGE_PROVIDER?: 'mock' | 'mcp' | 'http';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
