"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getVisibleSedes } from "@/lib/admin-helpers";
import { adminService } from "@/services/admin-service";
import { AdminStats, RegistrationItem, TimedNewsItem, WheelItem } from "@/types/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, Calendar, CircleDot, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const visibleSedes = getVisibleSedes(profile);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [wheels, setWheels] = useState<WheelItem[]>([]);
  const [timedNews, setTimedNews] = useState<TimedNewsItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminService.fetchStats(),
      adminService.fetchUsers(),
      adminService.fetchWheels(),
      adminService.loadDeletableTimedNews(),
      adminService.loadRegistrations(),
    ])
      .then(([statsData, usersData, wheelsData, timedNewsData, regsData]) => {
        const filteredUsers = visibleSedes
          ? usersData.filter((u) => visibleSedes.includes(u.sede))
          : usersData;

        const usersBySede: Record<string, number> = {};
        let totalGamePoints = 0;
        for (const u of filteredUsers) {
          usersBySede[u.sede] = (usersBySede[u.sede] || 0) + 1;
          totalGamePoints += u.gamePoints;
        }

        setStats({
          totalUsers: filteredUsers.length,
          usersBySede,
          totalGamePoints,
          avgGamePoints: filteredUsers.length
            ? Math.round(totalGamePoints / filteredUsers.length)
            : 0,
          totalNews: statsData.totalNews,
          totalEvents: statsData.totalEvents,
          totalTimedNews: visibleSedes
            ? timedNewsData.filter((t) => visibleSedes.includes(t.location)).length
            : statsData.totalTimedNews,
          totalRegistrations: visibleSedes
            ? regsData.filter((r) => visibleSedes.includes(r.location)).length
            : statsData.totalRegistrations,
        });

        setWheels(
          wheelsData
            .filter((w) => !visibleSedes || visibleSedes.includes(w.location))
            .slice(0, 5)
        );
        setTimedNews(
          timedNewsData
            .filter((t) => !visibleSedes || visibleSedes.includes(t.location))
            .slice(-5)
            .reverse()
        );
        setRegistrations(
          regsData
            .filter(
              (r) =>
                (!visibleSedes || visibleSedes.includes(r.location)) && r.isTimed
            )
            .slice(0, 5)
        );
      })
      .finally(() => setLoading(false));
  }, [profile?.uid]);

  const chartData = stats
    ? Object.entries(stats.usersBySede)
        .map(([sede, count]) => ({ sede, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const chartConfig = {
    count: { label: "Utenti", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl md:col-span-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Panoramica della piattaforma in tempo reale.</p>
      </div>

      {/* Top row: Total users + Users by location chart */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utenti registrati</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalUsers ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Totale utenti sulla piattaforma</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Utenti per sede</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="sede" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Latest wheels + Latest events */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                Ultime ruote create
              </CardTitle>
              <CardDescription>Le ruote della fortuna generate di recente</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {wheels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna ruota creata.</p>
            ) : (
              wheels.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">{w.location} · {w.participants.length} partecipanti</p>
                  </div>
                  <Badge variant="outline">{w.settings.mode}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Ultimi eventi
              </CardTitle>
              <CardDescription>Gli ultimi timed news creati</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {timedNews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun evento creato.</p>
            ) : (
              timedNews.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                  <Badge variant="secondary">
                    {t.startAt.toLocaleDateString("it-IT")}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Latest registrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Ultime partecipazioni
            </CardTitle>
            <CardDescription>Registrazioni agli eventi con numero di partecipanti</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna registrazione trovata.</p>
          ) : (
            registrations.map((r) => (
              <div key={r.docId} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.location}</p>
                </div>
                <Badge>{r.userCount} partecipanti</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
