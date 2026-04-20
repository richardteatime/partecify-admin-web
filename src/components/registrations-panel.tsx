"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { RegistrationItem } from "@/types/admin";

export default function RegistrationsPanel() {
  const [items, setItems] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const data = await adminService.loadRegistrations();
      setItems(data);
    } catch {
      setMessage("Errore durante il caricamento delle registrazioni.");
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
      setMessage("Errore durante l'esportazione del CSV.");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Registrazioni</h2>
          <p className="text-sm text-neutral-500">
            Visualizza le registrazioni per eventi e notizie temporizzate.
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-xl border border-neutral-300 px-4 py-2 hover:bg-neutral-50"
        >
          Aggiorna
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Caricamento in corso...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nessuna registrazione disponibile.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.collection}-${item.docId}`}
              className="rounded-xl border border-neutral-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {item.isTimed ? "Notizia temporizzata" : "Evento"} · {item.location}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Utenti registrati: {item.userCount}
                  </p>
                </div>

                <button
                  onClick={() => exportCsv(item)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Esporta CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}