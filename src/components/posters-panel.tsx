"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { PosterItem } from "@/types/admin";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

type Tab = "generate" | "gallery";

export default function PostersPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");

  // Form fields
  const [titolo, setTitolo] = useState("");
  const [sottotitolo, setSottotitolo] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [oraEvento, setOraEvento] = useState("");
  const [tema, setTema] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [sede, setSede] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [assets, setAssets] = useState<
    Array<{ file: File; category: string; description: string }>
  >([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [posterName, setPosterName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Gallery state
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [loadingPosters, setLoadingPosters] = useState(true);

  useEffect(() => {
    adminService.fetchLocations().then(setLocations);
    loadPosters();
  }, []);

  async function loadPosters() {
    setLoadingPosters(true);
    try {
      const data = await adminService.fetchPosters();
      setPosters(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore sconosciuto";
      setMessage(`Errore galleria: ${msg}`);
      console.error("[loadPosters]", err);
    } finally {
      setLoadingPosters(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAssets((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, category: "other", description: "" })),
    ]);
    e.target.value = "";
  }

  function handleRemoveAsset(index: number) {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAsset(index: number, field: "category" | "description", value: string) {
    setAssets((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  }

  async function uploadAssets(): Promise<
    Array<{ imageUrl: string; category: string; description: string }>
  > {
    const uploaded: Array<{ imageUrl: string; category: string; description: string }> = [];
    for (const asset of assets) {
      const path = `posters/assets/${Date.now()}_${asset.file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, asset.file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({
        imageUrl: url,
        category: asset.category,
        description: asset.description,
      });
    }
    return uploaded;
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!titolo || !sede) {
      setMessage("Titolo e sede sono obbligatori.");
      return;
    }
    setGenerating(true);
    setMessage("");
    setPreviewUrl(null);
    setPreviewBlob(null);

    try {
      let uploadedAssets: Array<{
        imageUrl: string;
        category: string;
        description: string;
      }> = [];
      if (assets.length > 0) {
        setMessage("Caricamento immagini di riferimento...");
        uploadedAssets = await uploadAssets();
      }

      const resp = await fetch("/api/posters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titolo,
          sottotitolo: sottotitolo || undefined,
          dataEvento: dataEvento || undefined,
          oraEvento: oraEvento || undefined,
          tema: tema || undefined,
          aspectRatio,
          sede,
          assets: uploadedAssets.length ? uploadedAssets : undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Errore durante la generazione.");
      }

      const blob = await resp.blob();
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      const suggestedName = `locandina_${titolo.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.png`;
      setPosterName(suggestedName);
      setMessage("Locandina generata! Ora puoi salvarla su Firebase.");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Errore durante la generazione.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!previewBlob || !posterName.trim()) {
      setMessage("Nessuna locandina da salvare o nome mancante.");
      return;
    }
    setSaving(true);
    setMessage("");

    try {
      const storageRef = ref(storage, `posters/${posterName.trim()}`);
      await uploadBytes(storageRef, previewBlob);
      const imageUrl = await getDownloadURL(storageRef);

      await adminService.savePosterMetadata({
        title: titolo,
        subtitle: sottotitolo || undefined,
        eventDate: dataEvento || undefined,
        eventTime: oraEvento || undefined,
        theme: tema || undefined,
        aspectRatio,
        location: sede,
        imageUrl,
        storagePath: `posters/${posterName.trim()}`,
      });

      setMessage("Locandina salvata con successo su Firebase.");
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPosterName("");
      setTitolo("");
      setSottotitolo("");
      setDataEvento("");
      setOraEvento("");
      setTema("");
      setAssets([]);
      await loadPosters();
      setActiveTab("gallery");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    if (!previewBlob) return;
    const url = URL.createObjectURL(previewBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = posterName || "locandina.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  const aspectOptions = useMemo(
    () => ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Locandine</h2>
        <p className="text-sm text-neutral-500">
          Genera locandine per i tuoi eventi e salvale su Firebase.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("generate")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "generate"
              ? "bg-red-600 text-white"
              : "border border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          Genera
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "gallery"
              ? "bg-red-600 text-white"
              : "border border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          Galleria
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          {message}
        </div>
      )}

      {activeTab === "generate" && (
        <div className="space-y-6">
          <form onSubmit={handleGenerate} className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">Nuova locandina</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Titolo evento *</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  placeholder="Es. Serata Live"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Sottotitolo</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={sottotitolo}
                  onChange={(e) => setSottotitolo(e.target.value)}
                  placeholder="Es. Special Guest DJ Marco"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Data evento</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Ora evento</label>
                <input
                  type="time"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={oraEvento}
                  onChange={(e) => setOraEvento(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Tema / Descrizione</label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Descrivi l'atmosfera o il tema dell'evento..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Aspect ratio</label>
                <select
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  {aspectOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Sede *</label>
                <select
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                >
                  <option value="">Seleziona una sede</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium">Immagini di riferimento</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-xl file:border-0 file:bg-red-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Carica foto di ospiti, oggetti, loghi collaborazione, ecc.
              </p>

              {assets.length > 0 && (
                <div className="mt-4 space-y-3">
                  {assets.map((asset, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-center"
                    >
                      <span className="flex-1 truncate text-sm font-medium text-neutral-700">
                        {asset.file.name}
                      </span>
                      <select
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        value={asset.category}
                        onChange={(e) => updateAsset(idx, "category", e.target.value)}
                      >
                        <option value="guest">Ospite speciale</option>
                        <option value="object">Oggetto / Elemento</option>
                        <option value="logo_collab">Logo collaborazione</option>
                        <option value="other">Altro</option>
                      </select>
                      <input
                        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        placeholder="Descrizione (opzionale)"
                        value={asset.description}
                        onChange={(e) => updateAsset(idx, "description", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(idx)}
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={generating}
                className="rounded-xl bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {generating ? "Generazione in corso (30-90s)..." : "Genera locandina"}
              </button>
            </div>
          </form>

          {previewUrl && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold">Anteprima</h3>
              <img
                src={previewUrl}
                alt="Anteprima locandina"
                className="mb-4 max-h-[60vh] w-auto rounded-xl border border-neutral-200 object-contain"
              />

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  className="flex-1 rounded-xl border border-neutral-300 px-4 py-3"
                  value={posterName}
                  onChange={(e) => setPosterName(e.target.value)}
                  placeholder="Nome file per Firebase..."
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Salva su Firebase"}
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-xl border border-neutral-300 px-5 py-3 hover:bg-neutral-50"
                >
                  Scarica PNG
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "gallery" && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Galleria locandine</h3>
            <button
              onClick={loadPosters}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Aggiorna
            </button>
          </div>

          {loadingPosters ? (
            <p className="text-sm text-neutral-500">Caricamento...</p>
          ) : posters.length === 0 ? (
            <p className="text-sm text-neutral-500">Nessuna locandina salvata.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posters.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="mb-3 aspect-video w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                  <h4 className="font-medium text-sm">{p.title}</h4>
                  <p className="text-xs text-neutral-500">
                    {p.location} · {p.aspectRatio}
                  </p>
                  {p.eventDate && (
                    <p className="text-xs text-neutral-500">
                      {p.eventDate} {p.eventTime}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
