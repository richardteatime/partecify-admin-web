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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RegistrationsPanel() {
  const [items, setItems] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingItem, setViewingItem] = useState<RegistrationItem | null>(null);

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

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setViewingItem(item)}
                    >
                      Visualizza
                    </Button>
                    <Button onClick={() => exportCsv(item)}>
                      Esporta CSV
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={!!viewingItem}
          onOpenChange={(open) => !open && setViewingItem(null)}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Partecipanti</DialogTitle>
              <DialogDescription>
                {viewingItem?.title} · {viewingItem?.location} ·{" "}
                {viewingItem?.userCount} iscritti
              </DialogDescription>
            </DialogHeader>

            {viewingItem && (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingItem.users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground"
                        >
                          Nessun partecipante
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewingItem.users.map((u, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {String(u.name ?? "")}
                          </TableCell>
                          <TableCell>
                            {String(u.email ?? "")}
                          </TableCell>
                          <TableCell>
                            {String(u.phone ?? "")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
