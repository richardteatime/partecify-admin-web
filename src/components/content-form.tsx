"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { getVisibleSedes } from "@/lib/admin-helpers";
import { adminService } from "@/services/admin-service";
import { NotificationTarget, StorageImageEntry } from "@/types/admin";
import NotificationTargetSelector from "@/components/notification-target-selector";
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
import { toast } from "sonner";

type ContentType = "news" | "event" | "timedNews" | "notify";

const baseSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio."),
  description: z.string().min(1, "La descrizione è obbligatoria."),
});

const newsSchema = baseSchema.extend({
  newsLink: z.string().optional(),
  selectedImageUrl: z.string().optional(),
  notifyOnSave: z.boolean(),
});

const eventSchema = baseSchema.extend({
  eventOnlineUrl: z.string().optional(),
  selectedImageUrl: z.string().optional(),
  selectedLocation: z.string().min(1, "Seleziona una sede."),
  eventDateTime: z.string().min(1, "Inserisci data e ora dell'evento."),
  notifyOnSave: z.boolean(),
});

const timedNewsSchema = baseSchema.extend({
  selectedImageUrl: z.string().optional(),
  selectedLocation: z.string().min(1, "Seleziona una sede."),
  startAt: z.string().min(1, "Inserisci data e ora di inizio."),
  endAt: z.string().min(1, "Inserisci data e ora di fine."),
  notifyOnSave: z.boolean(),
});

const notifySchema = baseSchema;

type NewsFormData = z.infer<typeof newsSchema>;
type EventFormData = z.infer<typeof eventSchema>;
type TimedNewsFormData = z.infer<typeof timedNewsSchema>;
type NotifyFormData = z.infer<typeof notifySchema>;

type FormData = NewsFormData | EventFormData | TimedNewsFormData | NotifyFormData;

function getSchema(type: ContentType) {
  switch (type) {
    case "news":
      return newsSchema;
    case "event":
      return eventSchema;
    case "timedNews":
      return timedNewsSchema;
    case "notify":
      return notifySchema;
  }
}

function getDefaultValues(type: ContentType): FormData {
  const base = { title: "", description: "" };
  switch (type) {
    case "news":
      return { ...base, newsLink: "", selectedImageUrl: "", notifyOnSave: false };
    case "event":
      return { ...base, eventOnlineUrl: "", selectedImageUrl: "", selectedLocation: "", eventDateTime: "", notifyOnSave: false };
    case "timedNews":
      return { ...base, selectedImageUrl: "", selectedLocation: "", startAt: "", endAt: "", notifyOnSave: false };
    case "notify":
      return base;
  }
}

export default function ContentForm() {
  const { profile } = useAuth();
  const visibleSedes = getVisibleSedes(profile);

  const [selectedType, setSelectedType] = useState<ContentType>("news");
  const [locations, setLocations] = useState<string[]>([]);
  const [images, setImages] = useState<StorageImageEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<NotificationTarget>({ type: "broadcast" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(getSchema(selectedType)),
    defaultValues: getDefaultValues(selectedType),
  });

  const selectedImageUrl = watch("selectedImageUrl" as const) as string | undefined;
  const notifyOnSave = watch("notifyOnSave" as const) as boolean | undefined;

  useEffect(() => {
    setLoadingLocations(true);
    adminService
      .fetchLocations()
      .then(setLocations)
      .finally(() => setLoadingLocations(false));
  }, []);

  useEffect(() => {
    reset(getDefaultValues(selectedType));
    setNotificationTarget({ type: "broadcast" });
  }, [selectedType, reset]);

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

  function validateTarget(target: NotificationTarget): boolean {
    if (target.type === "sedes" && target.sedes.length === 0) {
      toast.error("Seleziona almeno una sede per la notifica.");
      return false;
    }
    if (target.type === "users" && target.userUids.length === 0) {
      toast.error("Seleziona almeno un utente per la notifica.");
      return false;
    }
    return true;
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);

    try {
      if (selectedType === "news") {
        const d = data as NewsFormData;
        await adminService.saveNews({
          title: d.title,
          description: d.description,
          imageUrl: d.selectedImageUrl || "",
          linkUrl: d.newsLink,
        });

        if (d.notifyOnSave) {
          if (!validateTarget(notificationTarget)) {
            setSubmitting(false);
            return;
          }
          await adminService.queueNotification({
            title: d.title,
            body: d.description,
            target: notificationTarget,
            data: {
              type: "news",
              title: d.title,
              imageUrl: d.selectedImageUrl,
              linkUrl: d.newsLink,
            },
          });
        }
      }

      if (selectedType === "event") {
        const d = data as EventFormData;
        await adminService.saveEvent({
          title: d.title,
          description: d.description,
          imageUrl: d.selectedImageUrl || "",
          location: d.selectedLocation,
          eventDateTime: new Date(d.eventDateTime),
          onlineEventUrl: d.eventOnlineUrl,
        });

        if (d.notifyOnSave) {
          if (!validateTarget(notificationTarget)) {
            setSubmitting(false);
            return;
          }
          await adminService.queueNotification({
            title: d.title,
            body: `${d.selectedLocation} · ${d.eventDateTime}`,
            target: notificationTarget,
            data: {
              type: "event",
              title: d.title,
              location: d.selectedLocation,
              dateTime: new Date(d.eventDateTime).toISOString(),
              imageUrl: d.selectedImageUrl,
              onlineEventUrl: d.eventOnlineUrl,
            },
          });
        }
      }

      if (selectedType === "timedNews") {
        const d = data as TimedNewsFormData;
        await adminService.saveTimedNews({
          title: d.title,
          description: d.description,
          imageUrl: d.selectedImageUrl || "",
          location: d.selectedLocation,
          startAt: new Date(d.startAt),
          endAt: new Date(d.endAt),
        });

        if (d.notifyOnSave) {
          if (!validateTarget(notificationTarget)) {
            setSubmitting(false);
            return;
          }
          await adminService.queueNotification({
            title: d.title,
            body: `${d.selectedLocation} · ${d.startAt} → ${d.endAt}`,
            target: notificationTarget,
            data: {
              type: "timedNews",
              title: d.title,
              location: d.selectedLocation,
              startAt: new Date(d.startAt).toISOString(),
              endAt: new Date(d.endAt).toISOString(),
              imageUrl: d.selectedImageUrl,
            },
          });
        }
      }

      if (selectedType === "notify") {
        const d = data as NotifyFormData;
        if (!validateTarget(notificationTarget)) {
          setSubmitting(false);
          return;
        }
        await adminService.queueNotification({
          title: d.title,
          body: d.description,
          target: notificationTarget,
          data: {
            type: "custom",
          },
        });
      }

      toast.success("Operazione completata con successo.");
      reset(getDefaultValues(selectedType));
      setNotificationTarget({ type: "broadcast" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore durante il salvataggio."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const commonFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Titolo</Label>
        <Input
          id="title"
          placeholder="Inserisci il titolo"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          placeholder="Inserisci la descrizione"
          className="min-h-28"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
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
          value={selectedImageUrl || ""}
          onValueChange={(v) => setValue("selectedImageUrl" as const, v ?? "")}
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
      <Label htmlFor="selectedLocation">Sede</Label>
      {loadingLocations ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <Select
          value={(watch("selectedLocation" as const) as string | undefined) || ""}
          onValueChange={(v) => setValue("selectedLocation" as const, v ?? "", { shouldValidate: true })}
        >
          <SelectTrigger id="selectedLocation">
            <SelectValue placeholder="Seleziona una sede" />
          </SelectTrigger>
          <SelectContent>
            {(visibleSedes
              ? locations.filter((loc) => visibleSedes.includes(loc))
              : locations
            ).map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {(errors as Record<string, { message?: string }>).selectedLocation && (
        <p className="text-sm text-destructive">{
          (errors as Record<string, { message?: string }>).selectedLocation?.message
        }</p>
      )}
    </div>
  );

  const notifySection = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Switch
          checked={notifyOnSave || false}
          onCheckedChange={(v) => {
            setValue("notifyOnSave" as const, v);
            if (!v) setNotificationTarget({ type: "broadcast" });
          }}
          id="notify-on-save"
        />
        <Label htmlFor="notify-on-save" className="mb-0">
          Invia una notifica dopo il salvataggio
        </Label>
      </div>
      {notifyOnSave && (
        <NotificationTargetSelector
          value={notificationTarget}
          onChange={setNotificationTarget}
        />
      )}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TabsContent value="news">
              {commonFields}
              <div className="space-y-2">
                <Label htmlFor="newsLink">Link opzionale</Label>
                <Input
                  id="newsLink"
                  placeholder="https://..."
                  {...register("newsLink")}
                />
              </div>
              {imageField}
              {notifySection}
            </TabsContent>

            <TabsContent value="event">
              {commonFields}
              <div className="space-y-2">
                <Label htmlFor="eventOnlineUrl">URL evento online opzionale</Label>
                <Input
                  id="eventOnlineUrl"
                  placeholder="https://..."
                  {...register("eventOnlineUrl")}
                />
              </div>
              {imageField}
              {locationField}
              <div className="space-y-2">
                <Label htmlFor="eventDateTime">Data e ora evento</Label>
                <Input
                  id="eventDateTime"
                  type="datetime-local"
                  {...register("eventDateTime")}
                />
                {(errors as Record<string, { message?: string }>).eventDateTime && (
                  <p className="text-sm text-destructive">{
                    (errors as Record<string, { message?: string }>).eventDateTime?.message
                  }</p>
                )}
              </div>
              {notifySection}
            </TabsContent>

            <TabsContent value="timedNews">
              {commonFields}
              {imageField}
              {locationField}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Data e ora inizio</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    {...register("startAt")}
                  />
                  {(errors as Record<string, { message?: string }>).startAt && (
                    <p className="text-sm text-destructive">{
                      (errors as Record<string, { message?: string }>).startAt?.message
                    }</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endAt">Data e ora fine</Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    {...register("endAt")}
                  />
                  {(errors as Record<string, { message?: string }>).endAt && (
                    <p className="text-sm text-destructive">{
                      (errors as Record<string, { message?: string }>).endAt?.message
                    }</p>
                  )}
                </div>
              </div>
              {notifySection}
            </TabsContent>

            <TabsContent value="notify">
              {commonFields}
              <NotificationTargetSelector
                value={notificationTarget}
                onChange={setNotificationTarget}
              />
            </TabsContent>

            <Separator />

            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvataggio in corso..." : "Salva"}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
