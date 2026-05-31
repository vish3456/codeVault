// apps/api/src/lib/firebase.ts

import admin from "firebase-admin";
import { loadEnv } from "../config/env.js";

let initialized = false;

/**
 * Initializes Firebase Admin SDK (idempotent).
 */
export function initFirebase(): void {
  if (initialized) {
    return;
  }

  const env = loadEnv();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  });

  initialized = true;
}

/**
 * Verifies a Firebase ID token from the client.
 * @param idToken - Firebase Auth ID token
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<admin.auth.DecodedIdToken> {
  initFirebase();
  return admin.auth().verifyIdToken(idToken);
}
