"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { AdminStats } from "@/types/admin";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .fetchStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Panoramica</h2>
        <p className="text-neutral-500">Caricamento statistiche...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Panoramica</h2>
        <p className="text-neutral-500">Impossibile caricare le statistiche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Panoramica</h2>
        <p className="text-neutral-500">
          Dati aggiornati in tempo reale dalla piattaforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utenti registrati" value={stats.totalUsers} />
        <StatCard label="Punti totali" value={stats.totalGamePoints} />
        <StatCard label="Media punti" value={stats.avgGamePoints} />
        <StatCard label="Registrazioni" value={stats.totalRegistrations} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="News" value={stats.totalNews} />
        <StatCard label="Eventi" value={stats.totalEvents} />
        <StatCard label="Notizie temporizzate" value={stats.totalTimedNews} />
      </div>

      {Object.keys(stats.usersBySede).length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Utenti per sede</h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Object.entries(stats.usersBySede)
              .sort((a, b) => b[1] - a[1])
              .map(([sede, count]) => (
                <div
                  key={sede}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3"
                >
                  <span className="text-sm font-medium text-neutral-700">
                    {sede}
                  </span>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}
