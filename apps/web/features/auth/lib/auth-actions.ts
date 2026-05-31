"use client";

import {
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirebaseAuth,
  googleAuthProvider,
  githubAuthProvider,
} from "@/lib/firebase";

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
  return result.user;
}

export async function signInWithGithub(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), githubAuthProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}
