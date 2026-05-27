import { signInWithEmailAndPassword, signOut, User, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getAuthInstance, getDbInstance } from "@/lib/firebase";
import { mapUser, UserModel } from "@/types/user";

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(getAuthInstance(), email, password);
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(getAuthInstance());
}

export async function getUserProfile(uid: string): Promise<UserModel | null> {
  const snap = await getDoc(doc(getDbInstance(), "users", uid));
  if (!snap.exists()) return null;
  return mapUser({ ...snap.data(), uid } as Record<string, unknown>);
}

export async function requireAdminUser(uid: string): Promise<UserModel> {
  const profile = await getUserProfile(uid);

  if (!profile) {
    throw new Error("Profilo utente non trovato.");
  }

  if (!profile.isAdmin) {
    throw new Error("Accesso non autorizzato.");
  }

  return profile;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), email);
}