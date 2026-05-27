"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { RegistrationItem } from "@/types/admin";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RegistrationsPanel() {
  const [items, setItems] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const data = await adminService.loadRegistrations();
      setItems(data);
    } catch {
      toast.error("Errore durante il caricamento delle registrazioni.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function exportCsv(item: RegistrationItem) {
    try {
      const blob = await adminService.exportRegistrationCsv(item);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrazioni_${item.title.replaceAll(/\s+/g, "_")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Errore durante l'esportazione del CSV.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Registrazioni</CardTitle>
          <CardDescription>
            Visualizza le registrazioni per eventi e notizie temporizzate.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={load}>
          Aggiorna
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna registrazione disponibile.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={`${item.collection}-${item.docId}`}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.isTimed ? "Notizia temporizzata" : "Evento"} ·{" "}
                      {item.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Utenti registrati: {item.userCount}
                    </p>
                  </div>

                  <Button onClick={() => exportCsv(item)}>
                    Esporta CSV
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
