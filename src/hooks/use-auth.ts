"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { requireAdminUser } from "@/services/auth-service";
import { UserModel } from "@/types/user";

type AuthState = {
  firebaseUser: User | null;
  profile: UserModel | null;
  loading: boolean;
  error: string | null;
};

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        setError(null);
        setFirebaseUser(user);

        if (!user) {
          setProfile(null);
          return;
        }

        const adminProfile = await requireAdminUser(user.uid);
        setProfile(adminProfile);
      } catch (err) {
        setProfile(null);
        setError(err instanceof Error ? err.message : "Errore di autenticazione.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { firebaseUser, profile, loading, error };
}