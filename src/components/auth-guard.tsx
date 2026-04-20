"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, profile, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && (!firebaseUser || error || !profile)) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, error, profile, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-sm text-neutral-600">Verifica dei permessi in corso...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !profile) return null;

  return <>{children}</>;
}