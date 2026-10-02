import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Publishable Firebase web config. Environment variables take precedence;
// the literals are safe fallbacks (this config is public by design).
const firebaseConfig = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] || "AIzaSyDo5TIAxPmyGhPYOtRA5hRIr0Oc5vLzKPg",
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] || "insurex-2.firebaseapp.com",
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"] || "insurex-2",
  storageBucket:
    import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] || "insurex-2.firebasestorage.app",
  messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] || "310812229075",
  appId:
    import.meta.env["VITE_FIREBASE_APP_ID"] || "1:310812229075:web:30c43c6d1a0accd9508326",
};

if (Object.values(firebaseConfig).some((value) => !value)) {
  throw new Error("Firebase web configuration is missing from the environment.");
}

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
