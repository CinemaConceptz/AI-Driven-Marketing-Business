import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import type { User } from "firebase/auth";

import { db, storage } from "@/lib/firebase";

export type PressMediaDoc = {
  id: string;
  sortOrder: number;
  createdAt: any;
  updatedAt?: any;
  width: number;
  height: number;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  sizeBytes: number;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_W = 1000;
const MAX_H = 1000;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 3;

function getExtFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error("Could not read image dimensions"));
        img.src = url;
      }
    );
    return dims;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { valid: false, error: "Invalid file type. Only JPG, PNG, or WEBP allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File too large (${sizeMB}MB). Maximum size is 10MB.` };
  }
  return { valid: true };
}

/**
 * Get all press media for a user, ordered by sortOrder
 */
export async function getAllPressMedia(uid: string): Promise<PressMediaDoc[]> {
  const mediaRef = collection(db, "users", uid, "media");
  const q = query(mediaRef, orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PressMediaDoc));
}

/**
 * Upload a new press image
 */
export async function uploadPressImage(
  file: File,
  user: User,
  existingCount: number
): Promise<PressMediaDoc> {
  if (!user?.uid) throw new Error("Not authenticated");
  
  // Check max images limit
  if (existingCount >= MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} images allowed. Delete one to upload more.`);
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { width, height } = await getImageDimensions(file);
  if (width > MAX_W || height > MAX_H) {
    throw new Error(`Image too large. Max dimensions are ${MAX_W}×${MAX_H}px.`);
  }

  const uid = user.uid;
  const imageId = `press-${Date.now()}`;
  const ext = getExtFromMime(file.type);
  const storagePath = `users/${uid}/media/${imageId}.${ext}`;

  const storageRef = ref(storage, storagePath);
  const uploadRes = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  const downloadURL = await getDownloadURL(storageRef);

  const pressDoc: Omit<PressMediaDoc, "id"> = {
    sortOrder: existingCount, // Add at the end
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    width,
    height,
    storagePath,
    downloadURL,
    contentType: file.type,
    sizeBytes: uploadRes.metadata.size ?? file.size,
  };

  const docRef = doc(db, "users", uid, "media", imageId);
  await setDoc(docRef, pressDoc);

  return { id: imageId, ...pressDoc };
}

/**
 * Delete a specific press image
 */
export async function deletePressImage(uid: string, imageId: string): Promise<void> {
  if (!uid) throw new Error("Missing uid");
  if (!imageId) throw new Error("Missing imageId");

  const docRef = doc(db, "users", uid, "media", imageId);
  const mediaRef = collection(db, "users", uid, "media");
  
  // Get the document to find storage path
  const snap = await getDocs(query(mediaRef));
  const targetDoc = snap.docs.find((d) => d.id === imageId);
  
  if (targetDoc) {
    const data = targetDoc.data() as Partial<PressMediaDoc>;
    const storagePath = data.storagePath;

    // Delete from storage
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (error: any) {
        if (error?.code !== "storage/object-not-found") throw error;
      }
    }

    // Delete document
    await deleteDoc(docRef);
  }
}

/**
 * Update sort order for all images (after drag-and-drop)
 */
export async function updateSortOrder(
  uid: string,
  orderedIds: string[]
): Promise<void> {
  if (!uid) throw new Error("Missing uid");
  
  const batch = writeBatch(db);
  
  orderedIds.forEach((id, index) => {
    const docRef = doc(db, "users", uid, "media", id);
    batch.update(docRef, { 
      sortOrder: index,
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
}

// Legacy function for backward compatibility
export async function getPressMedia(uid: string): Promise<PressMediaDoc | null> {
  const all = await getAllPressMedia(uid);
  return all.length > 0 ? all[0] : null;
}

export { MAX_IMAGES, MAX_SIZE_BYTES, MAX_W, MAX_H };
