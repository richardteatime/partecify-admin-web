export type UserModel = {
  uid: string;
  fullName: string;
  phone: string;
  address: string;
  sede: string;
  email: string;
  birthDate: string;
  isAdmin: boolean;
  adminSedes: string[];
  gamePoints: number;
  qrValidated: string[];
};

export function mapUser(data: Record<string, unknown>): UserModel {
  const toInt = (v: unknown): number => {
    if (typeof v === "number") return Math.trunc(v);
    if (typeof v === "string") return Number.parseInt(v, 10) || 0;
    return 0;
  };

  return {
    uid: String(data.uid ?? ""),
    fullName: String(data.fullName ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    sede: String(data.sede ?? ""),
    email: String(data.email ?? ""),
    birthDate: String(data.birthDate ?? ""),
    isAdmin: Boolean(data.isAdmin ?? false),
    adminSedes: Array.isArray(data.adminSedes)
      ? data.adminSedes.map(String)
      : [],
    gamePoints: toInt(data.gamePoints),
    qrValidated: Array.isArray(data.qrValidated)
      ? data.qrValidated.map(String)
      : [],
  };
}