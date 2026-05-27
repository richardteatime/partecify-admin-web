"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { EventItem, NewsItem, TimedNewsItem } from "@/types/admin";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type DeleteType = "news" | "event" | "timedNews";

export default function DeletePanel() {
  const [type, setType] = useState<DeleteType>("news");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<NewsItem | EventItem | TimedNewsItem>>([]);
  const [message, setMessage] = useState("");
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  async function loadItems() {
    setLoading(true);
    setMessage("");

    try {
      if (type === "news") setItems(await adminService.loadDeletableNews());
      if (type === "event") setItems(await adminService.loadDeletableEvents());
      if (type === "timedNews") setItems(await adminService.loadDeletableTimedNews());
    } catch {
      setMessage("Errore durante il caricamento degli elementi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [type]);

  async function confirmDelete() {
    if (itemToDelete === null) return;

    try {
      await adminService.deleteItemAt({
        deleteSelectedType: type,
        index: itemToDelete,
      });
      await loadItems();
      setMessage("Elemento eliminato correttamente.");
    } catch {
      setMessage("Errore durante l'eliminazione.");
    } finally {
      setItemToDelete(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elimina contenuti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Tipo di contenuto</label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as DeleteType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="event">Eventi</SelectItem>
                <SelectItem value="timedNews">Notizie temporizzate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={loadItems}>
            Aggiorna
          </Button>
        </div>

        {message && (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun elemento disponibile.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item: any, index) => (
              <div
                key={`${type}-${index}`}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-semibold">{item.title ?? "Senza titolo"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description ?? item.location ?? ""}
                  </p>
                </div>

                <AlertDialog
                  open={itemToDelete === index}
                  onOpenChange={(open) => {
                    if (!open) setItemToDelete(null);
                  }}
                >
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setItemToDelete(index)}
                      />
                    }
                  >
                    Elimina
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vuoi eliminare questo elemento? Questa azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmDelete}>
                        Conferma
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
