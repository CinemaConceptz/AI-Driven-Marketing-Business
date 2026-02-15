import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function isAdminUid(uid: string): Promise<boolean> {
  const ref = doc(db, "admins", uid);
  const snap = await getDoc(ref);
  return snap.exists();
}
