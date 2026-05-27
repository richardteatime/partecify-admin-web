"use client";

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import { StorageImageEntry } from "@/types/admin";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

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
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    setLoadingLocations(true);
    adminService
      .fetchLocations()
      .then(setLocations)
      .finally(() => setLoadingLocations(false));
  }, []);

  async function loadImages() {
    const folder = selectedType === "news" ? "News" : "Events";
    setLoadingImages(true);
    try {
      const result = await adminService.listImagesInFolder(folder);
      setImages(result);
    } finally {
      setLoadingImages(false);
    }
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
      setMessage(
        err instanceof Error ? err.message : "Errore durante il salvataggio."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const commonFields = (
    <>
      <div className="space-y-2">
        <Label>Titolo</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Inserisci il titolo"
        />
      </div>

      <div className="space-y-2">
        <Label>Descrizione</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Inserisci la descrizione"
          className="min-h-28"
        />
      </div>
    </>
  );

  const imageField = (
    <div className="space-y-2">
      <Label>Immagine</Label>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={loadImages}
          disabled={loadingImages}
        >
          {loadingImages ? "Caricamento..." : "Carica immagini disponibili"}
        </Button>

        <Select
          value={selectedImageUrl}
          onValueChange={(v) => setSelectedImageUrl(v ?? "")}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Seleziona un'immagine" />
          </SelectTrigger>
          <SelectContent>
            {images.map((image) => (
              <SelectItem key={image.url} value={image.url}>
                {image.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loadingImages && (
        <Skeleton className="h-8 w-full" />
      )}
    </div>
  );

  const locationField = (
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
  );

  const notifySwitch = (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Switch
        checked={notifyOnSave}
        onCheckedChange={setNotifyOnSave}
        id="notify-on-save"
      />
      <Label htmlFor="notify-on-save" className="mb-0">
        Invia una notifica dopo il salvataggio
      </Label>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione contenuti</CardTitle>
        <CardDescription>
          Crea news, eventi, notizie temporizzate o notifiche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedType}
          onValueChange={(v) => setSelectedType(v as ContentType)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="event">Evento</TabsTrigger>
            <TabsTrigger value="timedNews">
              Notizia temporizzata
            </TabsTrigger>
            <TabsTrigger value="notify">Notifica</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="news">
              {commonFields}
              <div className="space-y-2">
                <Label>Link opzionale</Label>
                <Input
                  value={newsLink}
                  onChange={(e) => setNewsLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              {imageField}
              {notifySwitch}
            </TabsContent>

            <TabsContent value="event">
              {commonFields}
              <div className="space-y-2">
                <Label>URL evento online opzionale</Label>
                <Input
                  value={eventOnlineUrl}
                  onChange={(e) => setEventOnlineUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              {imageField}
              {locationField}
              <div className="space-y-2">
                <Label>Data e ora evento</Label>
                <Input
                  type="datetime-local"
                  value={eventDateTime}
                  onChange={(e) => setEventDateTime(e.target.value)}
                />
              </div>
              {notifySwitch}
            </TabsContent>

            <TabsContent value="timedNews">
              {commonFields}
              {imageField}
              {locationField}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data e ora inizio</Label>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data e ora fine</Label>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                </div>
              </div>
              {notifySwitch}
            </TabsContent>

            <TabsContent value="notify">
              {commonFields}
            </TabsContent>

            <Separator />

            {message && (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                {message}
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvataggio in corso..." : "Salva"}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
