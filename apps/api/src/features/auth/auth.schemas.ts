// apps/api/src/features/auth/auth.schemas.ts

import { z } from "zod";

/** POST /api/v1/auth/firebase body */
export const firebaseAuthBodySchema = z.object({
  idToken: z.string().min(1, "Firebase ID token is required"),
});

export type FirebaseAuthBody = z.infer<typeof firebaseAuthBodySchema>;
