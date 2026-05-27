"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminService } from "@/services/admin-service";
import { RegistrationItem, WheelItem, WheelSettings, WheelSpin } from "@/types/admin";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const wheelSchema = z.object({
  selectedRegistration: z.string().min(1, "Seleziona una registrazione."),
  title: z.string().optional(),
  theme: z.enum(["base", "neon", "gold", "party"]),
  mode: z.enum(["single", "sequence"]),
  spinCount: z.number().min(1, "Almeno 1 spin."),
});

type WheelFormData = z.infer<typeof wheelSchema>;

export default function WheelPanel() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [wheels, setWheels] = useState<WheelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WheelFormData>({
    resolver: zodResolver(wheelSchema),
    defaultValues: {
      selectedRegistration: "",
      title: "",
      theme: "party",
      mode: "single",
      spinCount: 5,
    },
  });

  const selectedRegistration = watch("selectedRegistration");
  const theme = watch("theme");
  const mode = watch("mode");
  const spinCount = watch("spinCount");
  const [creating, setCreating] = useState(false);

  // Winners modal
  const [viewingWheel, setViewingWheel] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState("");
  const [spins, setSpins] = useState<WheelSpin[]>([]);
  const [loadingSpins, setLoadingSpins] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [regs, wls] = await Promise.all([
        adminService.loadRegistrations(),
        adminService.fetchWheels(),
      ]);
      setRegistrations(regs.filter((r) => r.isTimed && r.userCount > 0));
      setWheels(wls);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore caricamento dati.");
    } finally {
      setLoading(false);
    }
  }

  function handleRegistrationChange(docId: string | null) {
    if (!docId) return;
    setValue("selectedRegistration", docId, { shouldValidate: true });
    const reg = registrations.find((r) => r.docId === docId);
    if (reg) {
      setValue("title", `Ruota ${reg.title} - ${reg.location}`);
    }
  }

  async function onSubmit(data: WheelFormData) {
    const reg = registrations.find((r) => r.docId === data.selectedRegistration);
    if (!reg) return;

    const participants = reg.users
      .map((u) => String(u.name ?? ""))
      .filter(Boolean);

    if (participants.length === 0) {
      toast.error("Nessun partecipante trovato nella registrazione selezionata.");
      return;
    }

    setCreating(true);

    const sequenceSteps = Array.from({ length: data.spinCount }, (_, i) => ({
      id: `step-${i}`,
      type: "random" as const,
      winnerName: null as string | null,
    }));

    const settings: WheelSettings = {
      theme: data.theme,
      mode: data.mode,
      forcedWinner: null,
      soundEnabled: true,
      sequenceSteps: data.mode === "sequence" ? sequenceSteps : [],
    };

    try {
      const id = await adminService.createWheel({
        title: data.title?.trim() || reg.title,
        location: reg.location,
        participants,
        sourceRegistrationId: reg.docId,
        settings,
      });
      toast.success(`Ruota creata! Link: ${origin}/wheel/${id}`);
      reset({
        selectedRegistration: "",
        title: "",
        theme: "party",
        mode: "single",
        spinCount: 5,
      });
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore creazione ruota.");
    } finally {
      setCreating(false);
    }
  }

  async function viewWinners(wheel: WheelItem) {
    setViewingWheel(wheel.id);
    setViewingTitle(wheel.title);
    setLoadingSpins(true);
    try {
      const data = await adminService.fetchWheelSpins(wheel.id);
      setSpins(data);
    } catch {
      setSpins([]);
    } finally {
      setLoadingSpins(false);
    }
  }

  function copyLink(id: string) {
    const url = `${origin}/wheel/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copiato negli appunti!");
    });
  }

  const themeOptions = useMemo(() => ["base", "neon", "gold", "party"] as WheelSettings["theme"][], []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Ruota della Fortuna</h2>
        <p className="text-sm text-neutral-500">
          Crea ruote dai partecipanti registrati e gestisci i vincitori.
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create">Crea</TabsTrigger>
          <TabsTrigger value="list">Lista ruote</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nuova ruota da registrazione</CardTitle>
              <CardDescription>
                Seleziona una timed news con partecipanti per creare una ruota.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="wheel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registration">Registrazione *</Label>
                  <Select
                    value={selectedRegistration}
                    onValueChange={handleRegistrationChange}
                  >
                    <SelectTrigger id="registration">
                      <SelectValue placeholder="Seleziona una timed news con partecipanti" />
                    </SelectTrigger>
                    <SelectContent>
                      {registrations.map((reg) => (
                        <SelectItem key={reg.docId} value={reg.docId}>
                          {reg.title} ({reg.location}) — {reg.userCount} partecipanti
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.selectedRegistration && (
                    <p className="text-sm text-destructive">{errors.selectedRegistration.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titolo ruota</Label>
                  <Input
                    id="title"
                    placeholder="Es. Ruota Serata Live"
                    {...register("title")}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select
                      value={theme}
                      onValueChange={(v) => setValue("theme", v as WheelSettings["theme"])}
                    >
                      <SelectTrigger id="theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {themeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mode">Modalità</Label>
                    <Select
                      value={mode}
                      onValueChange={(v) => setValue("mode", v as WheelSettings["mode"])}
                    >
                      <SelectTrigger id="mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Singolo spin</SelectItem>
                        <SelectItem value="sequence">Sequenza multi-spin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {mode === "sequence" && (
                  <div className="space-y-2">
                    <Label>Numero di spin</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setValue("spinCount", Math.max(1, spinCount - 1))}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-mono font-bold">{spinCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setValue("spinCount", spinCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                    {errors.spinCount && (
                      <p className="text-sm text-destructive">{errors.spinCount.message}</p>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
            <CardFooter>
              <Button type="submit" form="wheel-form" disabled={creating}>
                {creating ? "Creazione in corso..." : "Crea ruota"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ruote create</CardTitle>
                <CardDescription>
                  Gestisci le ruote esistenti e visualizza i vincitori.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={loadData}>
                Aggiorna
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : wheels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessuna ruota creata.
                </p>
              ) : (
                <div className="space-y-3">
                  {wheels.map((w) => (
                    <Card
                      key={w.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-sm">{w.title}</CardTitle>
                        <CardDescription>
                          {w.location} · {w.participants.length} partecipanti · {w.settings.theme}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(w.id)}
                        >
                          Copia link
                        </Button>
                        <Button
                          size="sm"
                          className="inline-flex items-center justify-center"
                          onClick={() => window.open(`${origin}/wheel/${w.id}`, "_blank", "noopener,noreferrer")}
                        >
                          Apri ruota
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewWinners(w)}
                        >
                          Vedi vincitori
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Winners Dialog */}
      <Dialog
        open={viewingWheel !== null}
        onOpenChange={(open) => {
          if (!open) setViewingWheel(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincitori — {viewingTitle}</DialogTitle>
            <DialogDescription>
              Elenco degli spin effettuati su questa ruota.
            </DialogDescription>
          </DialogHeader>

          {loadingSpins ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : spins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuno spin effettuato.
            </p>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 pr-4">
                {spins.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <span className="font-medium">
                      #{s.spinIndex + 1} — {s.winnerName}
                    </span>
                    <Badge variant="secondary">
                      {s.timestamp.toLocaleString("it-IT")}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingWheel(null)}
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
