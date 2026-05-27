"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!firebaseUser || !profile) return null;

  return <>{children}</>;
}
