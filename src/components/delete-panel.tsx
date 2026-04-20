"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { EventItem, NewsItem, TimedNewsItem } from "@/types/admin";

type DeleteType = "news" | "event" | "timedNews";

export default function DeletePanel() {
  const [type, setType] = useState<DeleteType>("news");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<NewsItem | EventItem | TimedNewsItem>>([]);
  const [message, setMessage] = useState("");

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

  async function removeAt(index: number) {
    const confirmed = window.confirm("Vuoi eliminare questo elemento?");
    if (!confirmed) return;

    try {
      await adminService.deleteItemAt({
        deleteSelectedType: type,
        index,
      });
      await loadItems();
      setMessage("Elemento eliminato correttamente.");
    } catch {
      setMessage("Errore durante l'eliminazione.");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">Tipo di contenuto</label>
          <select
            className="w-full rounded-xl border border-neutral-300 px-4 py-3"
            value={type}
            onChange={(e) => setType(e.target.value as DeleteType)}
          >
            <option value="news">News</option>
            <option value="event">Eventi</option>
            <option value="timedNews">Notizie temporizzate</option>
          </select>
        </div>

        <button
          onClick={loadItems}
          className="rounded-xl border border-neutral-300 px-4 py-3 hover:bg-neutral-50"
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
        <p className="text-sm text-neutral-500">Nessun elemento disponibile.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item: any, index) => (
            <div
              key={`${type}-${index}`}
              className="flex items-start justify-between rounded-xl border border-neutral-200 p-4"
            >
              <div>
                <h3 className="font-semibold">{item.title ?? "Senza titolo"}</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {item.description ?? item.location ?? ""}
                </p>
              </div>

              <button
                onClick={() => removeAt(index)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}