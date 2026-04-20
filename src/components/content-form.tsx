"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { StorageImageEntry } from "@/types/admin";

type ContentType = "news" | "event" | "timedNews" | "notify";

export default function ContentForm() {
  const [selectedType, setSelectedType] = useState<ContentType>("news");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newsLink, setNewsLink] = useState("");
  const [eventOnlineUrl, setEventOnlineUrl] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [notifyOnSave, setNotifyOnSave] = useState(false);

  const [locations, setLocations] = useState<string[]>([]);
  const [images, setImages] = useState<StorageImageEntry[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminService.fetchLocations().then(setLocations);
  }, []);

  async function loadImages() {
    const folder = selectedType === "news" ? "News" : "Events";
    const result = await adminService.listImagesInFolder(folder);
    setImages(result);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      if (selectedType === "news") {
        await adminService.saveNews({
          title,
          description,
          imageUrl: selectedImageUrl,
          linkUrl: newsLink,
        });

        if (notifyOnSave) {
          await adminService.queueNotification({
            title,
            body: description,
            topic: "all",
            data: {
              type: "news",
              title,
              imageUrl: selectedImageUrl,
              linkUrl: newsLink,
            },
          });
        }
      }

      if (selectedType === "event") {
        await adminService.saveEvent({
          title,
          description,
          imageUrl: selectedImageUrl,
          location: selectedLocation,
          eventDateTime: new Date(eventDateTime),
          onlineEventUrl: eventOnlineUrl,
        });

        if (notifyOnSave) {
          await adminService.queueNotification({
            title,
            body: `${selectedLocation} · ${eventDateTime}`,
            topic: "all",
            data: {
              type: "event",
              title,
              location: selectedLocation,
              dateTime: new Date(eventDateTime).toISOString(),
              imageUrl: selectedImageUrl,
              onlineEventUrl: eventOnlineUrl,
            },
          });
        }
      }

      if (selectedType === "timedNews") {
        await adminService.saveTimedNews({
          title,
          description,
          imageUrl: selectedImageUrl,
          location: selectedLocation,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
        });

        if (notifyOnSave) {
          await adminService.queueNotification({
            title,
            body: `${selectedLocation} · ${startAt} → ${endAt}`,
            topic: "all",
            data: {
              type: "timedNews",
              title,
              location: selectedLocation,
              startAt: new Date(startAt).toISOString(),
              endAt: new Date(endAt).toISOString(),
              imageUrl: selectedImageUrl,
            },
          });
        }
      }

      if (selectedType === "notify") {
        await adminService.queueNotification({
          title,
          body: description,
          topic: "all",
          data: {
            type: "custom",
          },
        });
      }

      setMessage("Operazione completata con successo.");
      setTitle("");
      setDescription("");
      setNewsLink("");
      setEventOnlineUrl("");
      setSelectedLocation("");
      setStartAt("");
      setEndAt("");
      setEventDateTime("");
      setSelectedImageUrl("");
      setNotifyOnSave(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Errore durante il salvataggio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Gestione contenuti</h2>
        <p className="text-sm text-neutral-500">
          Crea news, eventi, notizie temporizzate o notifiche.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Tipo di contenuto</label>
          <select
            className="w-full rounded-xl border border-neutral-300 px-4 py-3"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ContentType)}
          >
            <option value="news">News</option>
            <option value="event">Evento</option>
            <option value="timedNews">Notizia temporizzata</option>
            <option value="notify">Notifica</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Titolo</label>
          <input
            className="w-full rounded-xl border border-neutral-300 px-4 py-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Descrizione</label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-neutral-300 px-4 py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {selectedType === "news" && (
          <div>
            <label className="mb-2 block text-sm font-medium">Link opzionale</label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={newsLink}
              onChange={(e) => setNewsLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {selectedType === "event" && (
          <div>
            <label className="mb-2 block text-sm font-medium">URL evento online opzionale</label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={eventOnlineUrl}
              onChange={(e) => setEventOnlineUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {selectedType !== "notify" && (
          <div>
            <label className="mb-2 block text-sm font-medium">Immagine</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={loadImages}
                className="rounded-xl border border-neutral-300 px-4 py-3 hover:bg-neutral-50"
              >
                Carica immagini disponibili
              </button>

              <select
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-3"
                value={selectedImageUrl}
                onChange={(e) => setSelectedImageUrl(e.target.value)}
              >
                <option value="">Seleziona un'immagine</option>
                {images.map((image) => (
                  <option key={image.url} value={image.url}>
                    {image.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {(selectedType === "event" || selectedType === "timedNews") && (
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
        )}

        {selectedType === "event" && (
          <div>
            <label className="mb-2 block text-sm font-medium">Data e ora evento</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={eventDateTime}
              onChange={(e) => setEventDateTime(e.target.value)}
            />
          </div>
        )}

        {selectedType === "timedNews" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Data e ora inizio</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Data e ora fine</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedType !== "notify" && (
          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3">
            <input
              type="checkbox"
              checked={notifyOnSave}
              onChange={(e) => setNotifyOnSave(e.target.checked)}
            />
            <span className="text-sm">Invia una notifica dopo il salvataggio</span>
          </label>
        )}

        {message && (
          <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? "Salvataggio in corso..." : "Salva"}
        </button>
      </form>
    </div>
  );
}