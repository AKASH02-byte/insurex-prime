import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export async function signInWithGoogle() {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in is only available in a browser.");
  }

  const result = await signInWithPopup(auth, googleProvider);
  return {
    auth,
    user: result.user,
    idToken: await result.user.getIdToken(),
  };
}

export async function signOutFromGoogle() {
  if (typeof window === "undefined") return;
  await signOut(auth);
}
