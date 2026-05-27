"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { adminService } from "@/services/admin-service";
import { buildQrString, decodeQrMeta, isQrForDate } from "@/lib/qr";
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
  const [selectedLocation, setSelectedLocation] = useState("");
  const [points, setPoints] = useState("");
  const [todayCodes, setTodayCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(true);

  useEffect(() => {
    setLoadingLocations(true);
    adminService
      .fetchLocations()
      .then(setLocations)
      .finally(() => setLoadingLocations(false));
    refreshTodayCodes();
  }, []);

  async function refreshTodayCodes() {
    setLoadingCodes(true);
    try {
      const data = await adminService.loadTodayQrCodes(new Date(), isQrForDate);
      setTodayCodes(data);
    } finally {
      setLoadingCodes(false);
    }
  }

  async function createQr() {
    if (!selectedLocation || !points.trim()) {
      setMessage("Compila sede e punti.");
      return;
    }

    const value = Number.parseInt(points, 10);
    if (Number.isNaN(value)) {
      setMessage("Inserisci un valore numerico valido.");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const rawQr = buildQrString({
        date: new Date(),
        location: selectedLocation,
        points: value,
      });

      await adminService.createQrCode(rawQr);
      await refreshTodayCodes();

      setPoints("");
      setMessage(`Codice QR creato correttamente: ${rawQr}`);
    } catch {
      setMessage("Errore durante la creazione del codice QR.");
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Sede</Label>
              {loadingLocations ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <Select
                  value={selectedLocation}
                  onValueChange={(v) => setSelectedLocation(v ?? "")}
                >
                  <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>Punti</Label>
              <Input
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="Es. 10 o -5"
              />
            </div>
          </div>

          {message && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          <Button onClick={createQr} disabled={creating}>
            {creating ? "Creazione in corso..." : "Crea codice QR"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Codici QR di oggi</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshTodayCodes}>
            Aggiorna
          </Button>
        </CardHeader>
        <CardContent>
          {loadingCodes ? (
            <div className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : todayCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun codice QR disponibile oggi.
            </p>
          ) : (
            <div className="space-y-3">
              {todayCodes.map((raw) => (
                <QrCard key={raw} raw={raw} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
