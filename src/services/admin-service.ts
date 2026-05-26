import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  arrayUnion,
  addDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  listAll,
  ref,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { formatDate, formatTime } from "@/lib/format";
import {
  AdminStats,
  EventItem,
  NewsItem,
  PosterItem,
  RegistrationItem,
  StorageImageEntry,
  TimedNewsItem,
} from "@/types/admin";
import { mapUser, UserModel } from "@/types/user";

const mainDocRef = doc(db, "global_data", "main");

function buildTimestampId(date: Date): string {
  const pad2 = (v: number) => String(v).padStart(2, "0");
  return `${pad2(date.getDate())}${pad2(date.getMonth() + 1)}${date.getFullYear()}${pad2(date.getHours())}${pad2(date.getMinutes())}`;
}

export const adminService = {
  async fetchLocations(): Promise<string[]> {
    const snap = await getDoc(mainDocRef);
    const data = snap.data();
    const raw = data?.nameLocations;

    if (!Array.isArray(raw)) return [];

    return raw
      .filter(Boolean)
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "it"));
  },

  async listImagesInFolder(folder: string): Promise<StorageImageEntry[]> {
    const folderRef = ref(storage, folder);
    const result = await listAll(folderRef);

    return Promise.all(
      result.items.map(async (item) => ({
        name: item.name,
        url: await getDownloadURL(item),
      }))
    );
  },

  async saveNews(params: {
    title: string;
    description: string;
    imageUrl: string;
    linkUrl?: string;
  }): Promise<void> {
    const payload: Record<string, unknown> = {
      imageUrl: params.imageUrl,
      title: params.title.trim(),
      description: params.description.trim(),
      createdAt: Timestamp.now(),
    };

    if (params.linkUrl?.trim()) {
      payload.linkUrl = params.linkUrl.trim();
    }

    await setDoc(
      mainDocRef,
      {
        news: arrayUnion(payload),
      },
      { merge: true }
    );
  },

  async saveEvent(params: {
    eventDateTime: Date;
    imageUrl: string;
    title: string;
    description: string;
    location: string;
    onlineEventUrl?: string;
  }): Promise<void> {
    const payload: EventItem = {
      id: `evt-${Date.now()}`,
      imageUrl: params.imageUrl,
      title: params.title.trim(),
      date: formatDate(params.eventDateTime),
      time: formatTime(params.eventDateTime),
      description: params.description.trim(),
      location: params.location.trim(),
      onlineEvent: params.onlineEventUrl?.trim() || null,
    };

    await setDoc(
      mainDocRef,
      {
        events: arrayUnion(payload),
      },
      { merge: true }
    );
  },

  async saveTimedNews(params: {
    startAt: Date;
    endAt: Date;
    imageUrl: string;
    title: string;
    description: string;
    location: string;
  }): Promise<void> {
    const now = new Date();
    const timestampId = buildTimestampId(now);
    const location = params.location.trim();
    const eventId = `${location}_${timestampId}`.replaceAll(" ", "_");

    const payload = {
      id: `tn-${timestampId}`,
      image: params.imageUrl,
      title: params.title.trim(),
      description: params.description.trim(),
      location,
      startAt: Timestamp.fromDate(params.startAt),
      endAt: Timestamp.fromDate(params.endAt),
      eventId,
    };

    await setDoc(
      mainDocRef,
      {
        timedNews: arrayUnion(payload),
      },
      { merge: true }
    );
  },

  async queueNotification(params: {
    title: string;
    body: string;
    topic?: string;
    data?: Record<string, unknown>;
    scheduledAt?: Date;
  }): Promise<void> {
    const payload: Record<string, unknown> = {
      title: params.title.trim(),
      body: params.body.trim(),
      target: {
        type: "topic",
        topic: params.topic ?? "all",
      },
      data: params.data ?? {},
      status: "queued",
      createdAt: serverTimestamp(),
    };

    if (params.scheduledAt) {
      payload.scheduledAt = Timestamp.fromDate(params.scheduledAt);
    }

    await addDoc(collection(db, "admin_push_notifications"), payload);
  },

  async loadDeletableNews(): Promise<NewsItem[]> {
    const snap = await getDoc(mainDocRef);
    const data = snap.data();
    return Array.isArray(data?.news) ? data!.news : [];
  },

  async loadDeletableEvents(): Promise<EventItem[]> {
    const snap = await getDoc(mainDocRef);
    const data = snap.data();
    return Array.isArray(data?.events) ? data!.events : [];
  },

  async loadDeletableTimedNews(): Promise<TimedNewsItem[]> {
  const snap = await getDoc(mainDocRef);
  const data = snap.data();

  if (!Array.isArray(data?.timedNews)) return [];

  return data.timedNews.map((raw): TimedNewsItem => {
    const item = raw as Record<string, unknown>;

    return {
      id: String(item.id ?? ""),
      image: String(item.image ?? ""),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      location: String(item.location ?? ""),
      eventId: String(item.eventId ?? ""),
      startAt:
        item.startAt instanceof Timestamp ? item.startAt.toDate() : new Date(),
      endAt:
        item.endAt instanceof Timestamp ? item.endAt.toDate() : new Date(),
    };
  });
},

  async deleteItemAt(params: {
    deleteSelectedType: "news" | "event" | "timedNews";
    index: number;
  }): Promise<void> {
    const fieldName =
      params.deleteSelectedType === "news"
        ? "news"
        : params.deleteSelectedType === "event"
        ? "events"
        : "timedNews";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(mainDocRef);
      const data = snap.data();

      if (!data || !Array.isArray(data[fieldName])) return;

      const list = [...data[fieldName]];
      if (params.index < 0 || params.index >= list.length) return;

      list.splice(params.index, 1);
      tx.update(mainDocRef, { [fieldName]: list });
    });
  },

  async createQrCode(rawQr: string): Promise<void> {
    await setDoc(
      mainDocRef,
      {
        qrCodes: arrayUnion(rawQr),
      },
      { merge: true }
    );
  },

  async loadTodayQrCodes(
    today: Date,
    isQrForDate: (raw: string, date: Date) => boolean
  ): Promise<string[]> {
    const snap = await getDoc(mainDocRef);
    const data = snap.data();

    if (!Array.isArray(data?.qrCodes)) return [];

    return data.qrCodes
      .filter((v: unknown) => typeof v === "string")
      .filter((raw: string) => isQrForDate(raw, today))
      .sort((a: string, b: string) => b.localeCompare(a));
  },

  async loadRegistrations(): Promise<RegistrationItem[]> {
    const eventSnap = await getDocs(collection(db, "global_data", "main", "eventRegistration"));
    const timedSnap = await getDocs(collection(db, "global_data", "main", "timedNewsRegistration"));

    const items: RegistrationItem[] = [];

    eventSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const users = Array.isArray(data.users) ? data.users : [];

      items.push({
        docId: docSnap.id,
        collection: "eventRegistration",
        title: String(data.title ?? ""),
        location: String(data.location ?? ""),
        eventId: data.eventId ? String(data.eventId) : null,
        timedNewsId: null,
        startAt: null,
        endAt: null,
        users,
        isTimed: false,
        userCount: users.length,
      });
    });

    timedSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const users = Array.isArray(data.users) ? data.users : [];

      items.push({
        docId: docSnap.id,
        collection: "timedNewsRegistration",
        title: String(data.title ?? ""),
        location: String(data.location ?? ""),
        eventId: data.eventId ? String(data.eventId) : null,
        timedNewsId: data.timedNewsId ? String(data.timedNewsId) : null,
        startAt: data.startAt instanceof Timestamp ? data.startAt.toDate() : null,
        endAt: data.endAt instanceof Timestamp ? data.endAt.toDate() : null,
        users,
        isTimed: true,
        userCount: users.length,
      });
    });

    return items.sort((a, b) => a.title.localeCompare(b.title, "it"));
  },

  async exportRegistrationCsv(item: RegistrationItem): Promise<Blob> {
    const separator = ";";
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const line = (values: string[]) => values.map(escape).join(separator);

    const rows: string[] = [];

    rows.push(
      line([
        "type",
        "title",
        "location",
        "startDate",
        "startTime",
        "endDate",
        "endTime",
        "eventId",
        "timedNewsId",
        "userName",
        "userEmail",
        "userPhone",
        "userUid",
      ])
    );

    const fmtDate = (d?: Date | null) =>
      d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : "";

    const fmtTime = (d?: Date | null) =>
      d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";

    for (const user of item.users) {
      rows.push(
        line([
          item.isTimed ? "timedNews" : "event",
          item.title,
          item.location,
          fmtDate(item.startAt),
          fmtTime(item.startAt),
          fmtDate(item.endAt),
          fmtTime(item.endAt),
          item.eventId ?? "",
          item.timedNewsId ?? "",
          String(user.name ?? ""),
          String(user.email ?? ""),
          String(user.phone ?? ""),
          String(user.uid ?? ""),
        ])
      );
    }

    return new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  },

  async fetchUsers(sedeFilter?: string): Promise<UserModel[]> {
    let q = query(collection(db, "users"));
    if (sedeFilter) {
      q = query(q, where("sede", "==", sedeFilter));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapUser({ ...d.data(), uid: d.id } as Record<string, unknown>)
    );
  },

  async updateUser(uid: string, data: Partial<UserModel>): Promise<void> {
    const ref = doc(db, "users", uid);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) payload[key] = value;
    }
    await updateDoc(ref, payload);
  },

  async fetchStats(): Promise<AdminStats> {
    const [usersSnap, mainSnap, eventRegSnap, timedRegSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDoc(mainDocRef),
      getDocs(collection(db, "global_data", "main", "eventRegistration")),
      getDocs(collection(db, "global_data", "main", "timedNewsRegistration")),
    ]);

    const users = usersSnap.docs.map((d) =>
      mapUser(d.data() as Record<string, unknown>)
    );

    const usersBySede: Record<string, number> = {};
    let totalGamePoints = 0;

    for (const u of users) {
      usersBySede[u.sede] = (usersBySede[u.sede] || 0) + 1;
      totalGamePoints += u.gamePoints;
    }

    const mainData = mainSnap.data();

    return {
      totalUsers: users.length,
      usersBySede,
      totalGamePoints,
      avgGamePoints: users.length ? Math.round(totalGamePoints / users.length) : 0,
      totalNews: Array.isArray(mainData?.news) ? mainData.news.length : 0,
      totalEvents: Array.isArray(mainData?.events) ? mainData.events.length : 0,
      totalTimedNews: Array.isArray(mainData?.timedNews) ? mainData.timedNews.length : 0,
      totalRegistrations: eventRegSnap.size + timedRegSnap.size,
    };
  },

  async fetchPosters(): Promise<PosterItem[]> {
    const snap = await getDocs(collection(db, "posters"));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: String(data.title ?? ""),
          subtitle: data.subtitle ? String(data.subtitle) : undefined,
          eventDate: data.eventDate ? String(data.eventDate) : undefined,
          eventTime: data.eventTime ? String(data.eventTime) : undefined,
          theme: data.theme ? String(data.theme) : undefined,
          aspectRatio: String(data.aspectRatio ?? "16:9"),
          location: String(data.location ?? ""),
          imageUrl: String(data.imageUrl ?? ""),
          storagePath: String(data.storagePath ?? ""),
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async savePosterMetadata(
    item: Omit<PosterItem, "id" | "createdAt">
  ): Promise<string> {
    const docRef = await addDoc(collection(db, "posters"), {
      ...item,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },
};