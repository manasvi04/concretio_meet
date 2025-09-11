/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CREATE_ROOM_PASSWORD: string
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
