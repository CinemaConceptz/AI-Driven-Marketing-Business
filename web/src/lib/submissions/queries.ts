import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import type { Label, SubmissionLog, SubmissionCampaign, ArtistPitch } from "@/lib/submissions";

// ============================================
// LABELS
// ============================================

/**
 * Get all labels (optionally filtered by genre)
 */
export async function getLabels(options?: {
  genre?: string;
  method?: string;
  activeOnly?: boolean;
  limit?: number;
}): Promise<Label[]> {
  let query: admin.firestore.Query = adminDb.collection("labels");

  if (options?.activeOnly !== false) {
    query = query.where("isActive", "==", true);
  }

  if (options?.genre) {
    query = query.where("genres", "array-contains", options.genre);
  }

  if (options?.method) {
    query = query.where("submissionMethod", "==", options.method);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Label));
}

/**
 * Get a single label by ID
 */
export async function getLabel(labelId: string): Promise<Label | null> {
  const doc = await adminDb.collection("labels").doc(labelId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Label;
}

/**
 * Add a new label
 */
export async function addLabel(label: Omit<Label, "id">): Promise<string> {
  const docRef = await adminDb.collection("labels").add({
    ...label,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update a label
 */
export async function updateLabel(
  labelId: string,
  updates: Partial<Label>
): Promise<void> {
  await adminDb.collection("labels").doc(labelId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Get labels added by a specific user
 */
export async function getUserLabels(userId: string): Promise<Label[]> {
  const snapshot = await adminDb
    .collection("labels")
    .where("userId", "==", userId)
    .where("addedBy", "==", "user")
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Label));
}

// ============================================
// SUBMISSIONS
// ============================================

/**
 * Log a submission
 */
export async function createSubmissionLog(
  submission: Omit<SubmissionLog, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await adminDb.collection("submissionLogs").add({
    ...submission,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update a submission log
 */
export async function updateSubmissionLog(
  submissionId: string,
  updates: Partial<SubmissionLog>
): Promise<void> {
  await adminDb.collection("submissionLogs").doc(submissionId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Get submissions for a user
 */
export async function getUserSubmissions(
  userId: string,
  options?: { limit?: number; status?: string }
): Promise<SubmissionLog[]> {
  let query: admin.firestore.Query = adminDb
    .collection("submissionLogs")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc");

  if (options?.status) {
    query = query.where("status", "==", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  } as SubmissionLog));
}

/**
 * Get submission count for current month
 */
export async function getMonthlySubmissionCount(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const snapshot = await adminDb
    .collection("submissionLogs")
    .where("userId", "==", userId)
    .where("createdAt", ">=", startOfMonth)
    .where("status", "in", ["sent", "delivered", "opened", "replied"])
    .get();

  return snapshot.size;
}

// ============================================
// CAMPAIGNS
// ============================================

/**
 * Create a submission campaign
 */
export async function createCampaign(
  campaign: Omit<SubmissionCampaign, "id" | "createdAt">
): Promise<string> {
  const docRef = await adminDb.collection("submissionCampaigns").add({
    ...campaign,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<SubmissionCampaign>
): Promise<void> {
  await adminDb.collection("submissionCampaigns").doc(campaignId).update(updates);
}

/**
 * Get campaigns for a user
 */
export async function getUserCampaigns(
  userId: string,
  options?: { status?: string; limit?: number }
): Promise<SubmissionCampaign[]> {
  let query: admin.firestore.Query = adminDb
    .collection("submissionCampaigns")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc");

  if (options?.status) {
    query = query.where("status", "==", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    startedAt: doc.data().startedAt?.toDate(),
    completedAt: doc.data().completedAt?.toDate(),
  } as SubmissionCampaign));
}

// ============================================
// PITCHES
// ============================================

/**
 * Save/update artist pitch
 */
export async function saveArtistPitch(
  userId: string,
  pitch: Omit<ArtistPitch, "userId" | "generatedAt" | "updatedAt">
): Promise<void> {
  await adminDb.collection("artistPitches").doc(userId).set({
    ...pitch,
    userId,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * Get artist pitch
 */
export async function getArtistPitch(userId: string): Promise<ArtistPitch | null> {
  const doc = await adminDb.collection("artistPitches").doc(userId).get();
  if (!doc.exists) return null;
  
  const data = doc.data()!;
  return {
    ...data,
    generatedAt: data.generatedAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as ArtistPitch;
}
