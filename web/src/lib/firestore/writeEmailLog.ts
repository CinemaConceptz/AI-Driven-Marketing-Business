import "server-only";
import admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";

export type EmailLogEntry = {
  uid?: string | null;
  type: string;
  to: string;
  templateId?: number;
  postmarkMessageId?: string | null;
  status: "sent" | "failed";
  error?: string | null;
  meta?: Record<string, unknown>;
};

export async function writeEmailLog(entry: EmailLogEntry): Promise<string> {
  const logRef = adminDb.collection("emailLogs").doc();
  
  await logRef.set({
    ...entry,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return logRef.id;
}
