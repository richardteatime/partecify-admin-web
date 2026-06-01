import { UserModel } from "@/types/user";

export function getVisibleSedes(profile: UserModel | null): string[] | null {
  if (!profile) return [];
  if (profile.isAdmin) return null;
  return profile.adminSedes;
}

export function isVisibleForAdmin(
  profile: UserModel | null,
  location: string
): boolean {
  const visible = getVisibleSedes(profile);
  if (visible === null) return true;
  return visible.includes(location);
}
