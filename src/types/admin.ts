export type NewsItem = {
  imageUrl: string;
  title: string;
  description: string;
  createdAt?: unknown;
  linkUrl?: string;
};

export type EventItem = {
  id: string;
  imageUrl: string;
  title: string;
  date: string;
  time: string;
  description: string;
  location: string;
  onlineEvent?: string | null;
};

export type TimedNewsItem = {
  id: string;
  image: string;
  title: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
  eventId: string;
};

export type RegistrationItem = {
  docId: string;
  collection: "eventRegistration" | "timedNewsRegistration";
  title: string;
  location: string;
  eventId?: string | null;
  timedNewsId?: string | null;
  startAt?: Date | null;
  endAt?: Date | null;
  users: Array<Record<string, unknown>>;
  isTimed: boolean;
  userCount: number;
};

export type StorageImageEntry = {
  name: string;
  url: string;
};

export type AdminStats = {
  totalUsers: number;
  usersBySede: Record<string, number>;
  totalGamePoints: number;
  avgGamePoints: number;
  totalNews: number;
  totalEvents: number;
  totalTimedNews: number;
  totalRegistrations: number;
};

export type PosterItem = {
  id: string;
  title: string;
  subtitle?: string;
  eventDate?: string;
  eventTime?: string;
  theme?: string;
  aspectRatio: string;
  location: string;
  imageUrl: string;
  storagePath: string;
  createdAt: Date;
};