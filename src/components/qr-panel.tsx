"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminService } from "@/services/admin-service";
import { buildQrString, decodeQrMeta } from "@/lib/qr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const qrSchema = z.object({
  location: z.string().min(1, "Seleziona una sede."),
  points: z.string().regex(/^-?\d+$/, "Inserisci un numero intero valido."),
});

type QrFormData = z.infer<typeof qrSchema>;

function QrCard({ raw }: { raw: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    QRCode.toDataURL(raw, { width: 200, margin: 2 })
      .then((url) => {
        setDataUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setDataUrl(null);
        setLoading(false);
      });
  }, [raw]);

  const meta = decodeQrMeta(raw);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr_${raw.replaceAll("|", "_")}.png`;
    a.click();
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start pt-6">
        {loading ? (
          <Skeleton className="h-40 w-40 rounded-lg" />
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt="Codice QR"
            className="h-40 w-40 rounded-lg border"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
            Errore
          </div>
        )}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-semibold">{meta.title}</h3>
          <pre className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {meta.subtitle}
          </pre>
          {dataUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="mt-3"
            >
              Scarica PNG
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function QrPanel() {
  const [locations, setLocations] = useState<string[]>([]);
  const [qrCodes, setQrCodes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QrFormData>({
    resolver: zodResolver(qrSchema),
    defaultValues: { location: "", points: "" },
  });

  const selectedLocation = watch("location");

  useEffect(() => {
    setLoadingLocations(true);
    adminService
      .fetchLocations()
      .then(setLocations)
      .finally(() => setLoadingLocations(false));
    refreshQrCodes();
  }, []);

  async function refreshQrCodes() {
    setLoadingCodes(true);
    try {
      const data = await adminService.loadAllQrCodes();
      setQrCodes(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore caricamento QR."
      );
    } finally {
      setLoadingCodes(false);
    }
  }

  async function onSubmit(data: QrFormData) {
    const value = Number.parseInt(data.points, 10);

    setCreating(true);
    try {
      const rawQr = buildQrString({
        date: new Date(),
        location: data.location,
        points: value,
      });

      await adminService.createQrCode(rawQr);
      await refreshQrCodes();

      reset({ location: "", points: "" });
      toast.success(`Codice QR creato correttamente: ${rawQr}`);
    } catch {
      toast.error("Errore durante la creazione del codice QR.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Creazione codici QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Sede</Label>
                {loadingLocations ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <Select
                    value={selectedLocation}
                    onValueChange={(v) => setValue("location", v ?? "", { shouldValidate: true })}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Seleziona una sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Punti</Label>
                <Input
                  id="points"
                  placeholder="Es. 10 o -5"
                  {...register("points")}
                />
                {errors.points && (
                  <p className="text-sm text-destructive">{errors.points.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? "Creazione in corso..." : "Crea codice QR"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Codici QR</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshQrCodes}>
            Aggiorna
          </Button>
        </CardHeader>
        <CardContent>
          {loadingCodes ? (
            <div className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : qrCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun codice QR disponibile.
            </p>
          ) : (
            <div className="space-y-3">
              {qrCodes.map((raw) => (
                <QrCard key={raw} raw={raw} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
