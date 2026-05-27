"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { toast } from "sonner";

const posterSchema = z.object({
  titolo: z.string().min(1, "Il titolo è obbligatorio."),
  sottotitolo: z.string().optional(),
  dataEvento: z.string().optional(),
  oraEvento: z.string().optional(),
  tema: z.string().optional(),
  aspectRatio: z.string().min(1, "Seleziona un aspect ratio."),
  sede: z.string().min(1, "Seleziona una sede."),
});

type PosterFormData = z.infer<typeof posterSchema>;

export default function PostersPanel() {
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

  // Gallery state
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [loadingPosters, setLoadingPosters] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PosterFormData>({
    resolver: zodResolver(posterSchema),
    defaultValues: {
      titolo: "",
      sottotitolo: "",
      dataEvento: "",
      oraEvento: "",
      tema: "",
      aspectRatio: "16:9",
      sede: "",
    },
  });

  const titolo = watch("titolo");
  const sottotitolo = watch("sottotitolo");
  const dataEvento = watch("dataEvento");
  const oraEvento = watch("oraEvento");
  const tema = watch("tema");
  const aspectRatio = watch("aspectRatio");
  const sede = watch("sede");

  useEffect(() => {
    adminService.fetchLocations()
      .then(setLocations)
      .catch(() => toast.error("Errore caricamento sedi."));
    loadPosters();
  }, []);

  async function loadPosters() {
    setLoadingPosters(true);
    try {
      const data = await adminService.fetchPosters();
      setPosters(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error(`Errore galleria: ${msg}`);
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

  async function onSubmit(data: PosterFormData) {
    setGenerating(true);
    setPreviewUrl(null);
    setPreviewBlob(null);

    try {
      let uploadedAssets: Array<{
        imageUrl: string;
        category: string;
        description: string;
      }> = [];
      if (assets.length > 0) {
        toast.info("Caricamento immagini di riferimento...");
        uploadedAssets = await uploadAssets();
      }

      const resp = await fetch("/api/posters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titolo: data.titolo,
          sottotitolo: data.sottotitolo || undefined,
          dataEvento: data.dataEvento || undefined,
          oraEvento: data.oraEvento || undefined,
          tema: data.tema || undefined,
          aspectRatio: data.aspectRatio,
          sede: data.sede,
          assets: uploadedAssets.length ? uploadedAssets : undefined,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "Errore durante la generazione.");
      }

      const blob = await resp.blob();
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      const suggestedName = `locandina_${data.titolo.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.png`;
      setPosterName(suggestedName);
      toast.success("Locandina generata! Ora puoi salvarla su Firebase.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore durante la generazione.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!previewBlob || !posterName.trim()) {
      toast.error("Nessuna locandina da salvare o nome mancante.");
      return;
    }
    setSaving(true);

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

      toast.success("Locandina salvata con successo su Firebase.");
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPosterName("");
      reset({
        titolo: "",
        sottotitolo: "",
        dataEvento: "",
        oraEvento: "",
        tema: "",
        aspectRatio: "16:9",
        sede: "",
      });
      setAssets([]);
      await loadPosters();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio.");
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

        <TabsContent value="generate" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nuova locandina</CardTitle>
              <CardDescription>
                Compila i dettagli dell&apos;evento per generare una locandina.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="poster-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="titolo">Titolo evento *</Label>
                    <Input
                      id="titolo"
                      placeholder="Es. Serata Live"
                      {...register("titolo")}
                    />
                    {errors.titolo && (
                      <p className="text-sm text-destructive">{errors.titolo.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="sottotitolo">Sottotitolo</Label>
                    <Input
                      id="sottotitolo"
                      placeholder="Es. Special Guest DJ Marco"
                      {...register("sottotitolo")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataEvento">Data evento</Label>
                    <Input
                      id="dataEvento"
                      type="date"
                      {...register("dataEvento")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oraEvento">Ora evento</Label>
                    <Input
                      id="oraEvento"
                      type="time"
                      {...register("oraEvento")}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tema">Tema / Descrizione</Label>
                    <Textarea
                      id="tema"
                      placeholder="Descrivi l'atmosfera o il tema dell'evento..."
                      {...register("tema")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio">Aspect ratio</Label>
                    <Select value={aspectRatio} onValueChange={(v) => setValue("aspectRatio", v ?? "", { shouldValidate: true })}>
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
                    {errors.aspectRatio && (
                      <p className="text-sm text-destructive">{errors.aspectRatio.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sede">Sede *</Label>
                    <Select value={sede} onValueChange={(v) => setValue("sede", v ?? "", { shouldValidate: true })}>
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
                    {errors.sede && (
                      <p className="text-sm text-destructive">{errors.sede.message}</p>
                    )}
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
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="aspect-video w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                          Immagine non disponibile
                        </div>
                      )}
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
