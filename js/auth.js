// js/auth.js
// Handles: Sign Up, Log In, Log Out, and auth state watching

import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Sign Up ──────────────────────────────────────────────────
export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Log In ───────────────────────────────────────────────────
export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Log Out ──────────────────────────────────────────────────
export async function logOut() {
  await signOut(auth);
  window.location.href = "index.html";
}

// ── Watch auth state (call this on every page) ────────────────
// onLoggedIn  → callback when user IS signed in
// onLoggedOut → callback when user is NOT signed in
export function watchAuth(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onLoggedIn(user);
    } else {
      onLoggedOut();
    }
  });
}
