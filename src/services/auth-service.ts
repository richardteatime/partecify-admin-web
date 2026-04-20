import { signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { mapUser, UserModel } from "@/types/user";

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserModel | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return mapUser(snap.data() as Record<string, unknown>);
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