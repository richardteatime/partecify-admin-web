"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { adminService } from "@/services/admin-service";
import { buildQrString, decodeQrMeta, isQrForDate } from "@/lib/qr";

function QrCard({ raw }: { raw: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(raw, { width: 200, margin: 2 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
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
    <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-start">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Codice QR"
          className="h-40 w-40 rounded-lg border border-neutral-100"
        />
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 text-xs text-neutral-400">
          Caricamento...
        </div>
      )}
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-semibold">{meta.title}</h3>
        <pre className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
          {meta.subtitle}
        </pre>
        {dataUrl && (
          <button
            onClick={handleDownload}
            className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Scarica PNG
          </button>
        )}
      </div>
    </div>
  );
}

export default function QrPanel() {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [points, setPoints] = useState("");
  const [todayCodes, setTodayCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminService.fetchLocations().then(setLocations);
    refreshTodayCodes();
  }, []);

  async function refreshTodayCodes() {
    const data = await adminService.loadTodayQrCodes(new Date(), isQrForDate);
    setTodayCodes(data);
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
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Creazione codici QR</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Sede</label>
            <select
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">Seleziona una sede</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Punti</label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Es. 10 o -5"
            />
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        <button
          onClick={createQr}
          disabled={creating}
          className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {creating ? "Creazione in corso..." : "Crea codice QR"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Codici QR di oggi</h2>
          <button
            onClick={refreshTodayCodes}
            className="rounded-xl border border-neutral-300 px-4 py-2 hover:bg-neutral-50"
          >
            Aggiorna
          </button>
        </div>

        {todayCodes.length === 0 ? (
          <p className="text-sm text-neutral-500">Nessun codice QR disponibile oggi.</p>
        ) : (
          <div className="space-y-3">
            {todayCodes.map((raw) => (
              <QrCard key={raw} raw={raw} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}