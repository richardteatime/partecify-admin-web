"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { AdminStats } from "@/types/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy, BarChart3, ClipboardList, Newspaper, Calendar, Clock } from "lucide-react";

const statMeta = [
  { key: "totalUsers" as const, label: "Utenti registrati", icon: Users },
  { key: "totalGamePoints" as const, label: "Punti totali", icon: Trophy },
  { key: "avgGamePoints" as const, label: "Media punti", icon: BarChart3 },
  { key: "totalRegistrations" as const, label: "Registrazioni", icon: ClipboardList },
  { key: "totalNews" as const, label: "News", icon: Newspaper },
  { key: "totalEvents" as const, label: "Eventi", icon: Calendar },
  { key: "totalTimedNews" as const, label: "Notizie temporizzate", icon: Clock },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .fetchStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Panoramica</h2>
        <p className="text-muted-foreground mt-1">
          Dati aggiornati in tempo reale dalla piattaforma.
        </p>
      </div>

      {loading || !stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statMeta.map(({ key, label, icon: Icon }) => (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats[key]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {Object.keys(stats.usersBySede).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Utenti per sede</CardTitle>
                <CardDescription>Distribuzione degli utenti sulle sedi attive</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {Object.entries(stats.usersBySede)
                    .sort((a, b) => b[1] - a[1])
                    .map(([sede, count]) => (
                      <div
                        key={sede}
                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                      >
                        <span className="text-sm font-medium">{sede}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
