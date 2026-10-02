/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

declare namespace NodeJS {
  // Server-only variables; never expose these through VITE_*.
  interface ProcessEnv {
    readonly NODE_ENV?: string;
    readonly FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_API_KEY: string;
    readonly AUTH_ADMIN_EMAILS?: string;
    readonly AUTH_SESSION_SECRET?: string;
  }
}
