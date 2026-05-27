"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { PosterItem } from "@/types/admin";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getStorageInstance } from "@/lib/firebase";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostersPanel() {
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
      const storageRef = ref(getStorageInstance(), path);
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
      const storageRef = ref(getStorageInstance(), `posters/${posterName.trim()}`);
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

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">Genera</TabsTrigger>
          <TabsTrigger value="gallery">Galleria</TabsTrigger>
        </TabsList>

        {message && (
          <div className="mt-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        <TabsContent value="generate" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nuova locandina</CardTitle>
              <CardDescription>
                Compila i dettagli dell&apos;evento per generare una locandina.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="poster-form" onSubmit={handleGenerate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="titolo">Titolo evento *</Label>
                    <Input
                      id="titolo"
                      value={titolo}
                      onChange={(e) => setTitolo(e.target.value)}
                      placeholder="Es. Serata Live"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="sottotitolo">Sottotitolo</Label>
                    <Input
                      id="sottotitolo"
                      value={sottotitolo}
                      onChange={(e) => setSottotitolo(e.target.value)}
                      placeholder="Es. Special Guest DJ Marco"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataEvento">Data evento</Label>
                    <Input
                      id="dataEvento"
                      type="date"
                      value={dataEvento}
                      onChange={(e) => setDataEvento(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oraEvento">Ora evento</Label>
                    <Input
                      id="oraEvento"
                      type="time"
                      value={oraEvento}
                      onChange={(e) => setOraEvento(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tema">Tema / Descrizione</Label>
                    <Textarea
                      id="tema"
                      value={tema}
                      onChange={(e) => setTema(e.target.value)}
                      placeholder="Descrivi l'atmosfera o il tema dell'evento..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio">Aspect ratio</Label>
                    <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v ?? "")}>
                      <SelectTrigger id="aspectRatio">
                        <SelectValue placeholder="Seleziona aspect ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        {aspectOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sede">Sede *</Label>
                    <Select value={sede} onValueChange={(v) => setSede(v ?? "")}>
                      <SelectTrigger id="sede">
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
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="assets">Immagini di riferimento</Label>
                  <Input
                    id="assets"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Carica foto di ospiti, oggetti, loghi collaborazione, ecc.
                  </p>

                  {assets.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {assets.map((asset, idx) => (
                        <Card
                          key={idx}
                          className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                        >
                          <span className="flex-1 truncate text-sm font-medium text-neutral-700">
                            {asset.file.name}
                          </span>
                          <Select
                            value={asset.category}
                            onValueChange={(v) => updateAsset(idx, "category", v ?? "")}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="guest">Ospite speciale</SelectItem>
                              <SelectItem value="object">Oggetto / Elemento</SelectItem>
                              <SelectItem value="logo_collab">Logo collaborazione</SelectItem>
                              <SelectItem value="other">Altro</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            className="flex-1"
                            placeholder="Descrizione (opzionale)"
                            value={asset.description}
                            onChange={(e) => updateAsset(idx, "description", e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAsset(idx)}
                          >
                            Rimuovi
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                form="poster-form"
                disabled={generating}
              >
                {generating ? "Generazione in corso (30-90s)..." : "Genera locandina"}
              </Button>
            </CardFooter>
          </Card>

          {previewUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Anteprima</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Anteprima locandina"
                  className="max-h-[60vh] w-auto rounded-lg border object-contain"
                />
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    className="flex-1"
                    value={posterName}
                    onChange={(e) => setPosterName(e.target.value)}
                    placeholder="Nome file per Firebase..."
                  />
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvataggio..." : "Salva su Firebase"}
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    Scarica PNG
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Galleria locandine</CardTitle>
                <CardDescription>
                  Tutte le locandine generate e salvate.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={loadPosters}>
                Aggiorna
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPosters ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-video w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : posters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessuna locandina salvata.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {posters.map((p) => (
                    <Card key={p.id} className="overflow-hidden">
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="aspect-video w-full object-cover"
                        loading="lazy"
                      />
                      <CardContent className="space-y-1 pt-4">
                        <CardTitle className="text-sm">{p.title}</CardTitle>
                        <CardDescription>
                          {p.location} · {p.aspectRatio}
                        </CardDescription>
                        {p.eventDate && (
                          <CardDescription>
                            {p.eventDate} {p.eventTime}
                          </CardDescription>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
