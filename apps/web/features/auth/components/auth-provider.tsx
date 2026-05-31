"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { isEnvConfigured } from "@/lib/env";
import { apiClient } from "@/lib/api-client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isEnvConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      if (nextUser) {
        try {
          const idToken = await nextUser.getIdToken();
          await apiClient("/auth/firebase", {
            method: "POST",
            body: JSON.stringify({ idToken }),
          });
          setUser(nextUser);
        } catch (err) {
          console.error("Failed to sync auth with backend:", err);
          setUser(null);
          try {
            await getFirebaseAuth().signOut();
          } catch (signOutErr) {
            console.error("Firebase signout failed:", signOutErr);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setUser((prev) => {
          if (prev) {
            apiClient("/auth/logout", { method: "POST" }).catch((err) => {
              console.warn("Backend logout failed:", err);
            });
          }
          return null;
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [configured]);

  const value = useMemo(
    () => ({ user, loading, configured }),
    [user, loading, configured],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
