import "server-only";
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

export async function verifyAuth(req: Request): Promise<{ uid: string; email?: string }> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}
